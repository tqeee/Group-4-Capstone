'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth } from '@/lib/queries'
import { getSettings } from '@/lib/settings'
import { audit } from '@/lib/audit'
import { fmtMoney } from '@/lib/format'
import {
  DEFAULT_RISK_TOLERANCE,
  RISK_TOLERANCE_LABEL,
  isRiskTolerance,
  type RiskToleranceValue,
} from '@/lib/riskTolerance'

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

  // 3.4: risk tolerance applies to depositing INTO a fund — it's an
  // instruction about how the money should be managed, so it's not collected
  // on a withdrawal. If the investor already has a standing tolerance for this
  // fund and the form didn't send one, keep what's on file.
  const toleranceInput = formData.get('riskTolerance')
  let riskTolerance: RiskToleranceValue | null = null
  if (typeInput === 'deposit') {
    if (isRiskTolerance(toleranceInput)) {
      riskTolerance = toleranceInput
    } else if (toleranceInput != null && toleranceInput !== '') {
      return { status: 'error', message: 'Please choose a valid risk tolerance.' }
    } else {
      const existing = await prisma.investorFundPreference.findUnique({
        where: { investorId_fundId: { investorId: investor.id, fundId } },
      })
      riskTolerance = existing?.riskTolerance ?? DEFAULT_RISK_TOLERANCE
    }
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
      riskTolerance,
    },
  })

  // Record the standing instruction for this fund, not just the snapshot on
  // the request — a later top-up with no explicit choice inherits it, and ops
  // and the portfolio manager read it to see the mandate they trade under.
  if (riskTolerance) {
    await prisma.investorFundPreference.upsert({
      where: { investorId_fundId: { investorId: investor.id, fundId } },
      update: { riskTolerance },
      create: { investorId: investor.id, fundId, riskTolerance },
    })
  }

  await audit('FLOW_SUBMITTED', {
    actor: investor.email,
    detail:
      `${typeInput} ${fmtMoney(amount)} into ${fund.name} (${flow.id})` +
      (riskTolerance ? ` · risk tolerance ${RISK_TOLERANCE_LABEL[riskTolerance]}` : ''),
  })

  revalidatePath('/request-transaction')
  revalidatePath('/ops-transactions')
  revalidatePath('/funds')
  revalidatePath('/investors')
  return {
    status: 'success',
    message:
      `Your ${typeInput} request for ${fmtMoney(amount)} has been submitted for review.` +
      (riskTolerance
        ? ` Risk tolerance for ${fund.name} set to ${RISK_TOLERANCE_LABEL[riskTolerance]}.`
        : ''),
  }
}

export type SubmitProofState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

// Investor submits a reference for their bank transfer (deposits only, once
// operations has approved and emailed bank details) — moves the request to
// PENDING_RECEIPT for operations to confirm.
export async function submitProofOfTransfer(
  _prevState: SubmitProofState,
  formData: FormData
): Promise<SubmitProofState> {
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

  const flowId = formData.get('flowId')
  const proof = formData.get('proofOfTransfer')

  if (typeof flowId !== 'string' || !flowId) {
    return { status: 'error', message: 'Invalid request.' }
  }
  if (typeof proof !== 'string' || !proof.trim()) {
    return { status: 'error', message: 'Please enter a reference for your transfer.' }
  }

  const flow = await prisma.fundFlow.findUnique({ where: { id: flowId } })
  if (!flow || flow.investorId !== investor.id) {
    return { status: 'error', message: 'Request not found.' }
  }
  if (flow.status !== 'AWAITING_PROOF') {
    return { status: 'error', message: 'This request is not awaiting proof of transfer.' }
  }

  await prisma.fundFlow.update({
    where: { id: flowId },
    data: { status: 'PENDING_RECEIPT', proofOfTransfer: proof.trim() },
  })
  await audit('FLOW_PROOF_SUBMITTED', { actor: investor.email, detail: `${flowId}: ${proof.trim()}` })

  revalidatePath('/request-transaction')
  revalidatePath('/ops-transactions')
  return {
    status: 'success',
    message: 'Proof of transfer submitted. Operations will confirm receipt shortly.',
  }
}
