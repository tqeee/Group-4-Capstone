'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth } from '@/lib/queries'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { fmtMoney } from '@/lib/format'

export type SubmitFlowState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

export async function submitFlowRequest(
  _prevState: SubmitFlowState,
  formData: FormData
): Promise<SubmitFlowState> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' }
  }

  const investor = await getInvestorByAuth(claims.sub, claims.email ?? null)
  if (!investor) {
    return { status: 'error', message: 'No investor profile found for this account.' }
  }

  const typeInput = formData.get('type')
  const amount = Number(formData.get('amount'))
  const fundId = formData.get('fundId')

  if (typeInput !== 'deposit' && typeInput !== 'withdrawal') {
    return { status: 'error', message: 'Please choose a request type.' }
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'error', message: 'Please enter a valid amount.' }
  }
  if (typeof fundId !== 'string' || !fundId) {
    return { status: 'error', message: 'Please choose a fund.' }
  }

  const fund = await prisma.fund.findUnique({ where: { id: fundId } })
  if (!fund) {
    return { status: 'error', message: 'That fund no longer exists.' }
  }

  const settings = await getSettings()
  const min = Number(typeInput === 'deposit' ? settings.minDeposit : settings.minWithdrawal)
  if (amount < min) {
    return {
      status: 'error',
      message: `The minimum ${typeInput} is ${fmtMoney(min)}.`,
    }
  }

  if (typeInput === 'withdrawal') {
    // A withdrawal cannot exceed the current value of the investor's share,
    // net of withdrawals already awaiting review.
    const latest = await prisma.investorDailyLedger.findFirst({
      where: { investorId: investor.id, fundId },
      orderBy: { date: 'desc' },
    })
    const pendingWithdrawals = await prisma.fundFlow.aggregate({
      where: { investorId: investor.id, fundId, type: 'WITHDRAWAL', status: 'PENDING' },
      _sum: { amount: true },
    })
    const available =
      Number(latest?.closingValue ?? 0) - Number(pendingWithdrawals._sum.amount ?? 0)
    if (amount > available) {
      return {
        status: 'error',
        message: `Amount exceeds your available balance of ${fmtMoney(Math.max(0, available))} (pending withdrawals are reserved).`,
      }
    }
  }

  const flow = await prisma.fundFlow.create({
    data: {
      investorId: investor.id,
      fundId,
      type: typeInput === 'deposit' ? 'DEPOSIT' : 'WITHDRAWAL',
      amount,
      currency: fund.currency,
    },
  })

  await audit('FLOW_SUBMITTED', {
    actor: investor.email,
    detail: `${typeInput} ${fmtMoney(amount)} (${flow.id})`,
  })

  revalidatePath('/request-transaction')
  revalidatePath('/ops-transactions')
  return {
    status: 'success',
    message: `Your ${typeInput} request for ${fmtMoney(amount)} has been submitted for review.`,
  }
}
