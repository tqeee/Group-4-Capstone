'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/guards'
import { rebuildFundLedger } from '@/lib/ledger'
import { audit } from '@/lib/audit'
import { fmtMoney } from '@/lib/format'

export type ReviewFlowState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

// Operations approve/reject a deposit or withdrawal request (§3.3). Approval
// sets the processed date and replays the ledger so the flow takes effect in
// the §8.1 recordkeeping; rejection just closes the request.
export async function reviewFlow(
  _prevState: ReviewFlowState,
  formData: FormData
): Promise<ReviewFlowState> {
  const guard = await requireRole('operations')
  if (!guard.ok) return { status: 'error', message: guard.message }

  const flowId = formData.get('flowId')
  const decision = formData.get('decision')
  const comment = formData.get('comment')

  if (typeof flowId !== 'string' || (decision !== 'approve' && decision !== 'reject')) {
    return { status: 'error', message: 'Invalid review request.' }
  }

  const flow = await prisma.fundFlow.findUnique({
    where: { id: flowId },
    include: { investor: true },
  })
  if (!flow) return { status: 'error', message: 'Request not found.' }
  if (flow.status !== 'PENDING') {
    return { status: 'error', message: 'This request has already been reviewed.' }
  }

  const label = `${flow.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'} ${fmtMoney(Number(flow.amount))} for ${flow.investor.name}`

  if (decision === 'reject') {
    await prisma.fundFlow.update({
      where: { id: flowId },
      data: {
        status: 'REJECTED',
        reviewedBy: guard.email,
        note: typeof comment === 'string' && comment ? comment : flow.note,
      },
    })
    await audit('FLOW_REJECTED', { actor: guard.email, detail: `${label} (${flowId})` })
  } else {
    if (flow.type === 'WITHDRAWAL') {
      // Guard against over-withdrawal at approval time too — the investor's
      // value may have moved since submission.
      const latest = await prisma.investorDailyLedger.findFirst({
        where: { investorId: flow.investorId, fundId: flow.fundId },
        orderBy: { date: 'desc' },
      })
      if (Number(flow.amount) > Number(latest?.closingValue ?? 0)) {
        return {
          status: 'error',
          message: `Cannot approve: withdrawal exceeds the investor's current value of ${fmtMoney(Number(latest?.closingValue ?? 0))}.`,
        }
      }
    }

    await prisma.fundFlow.update({
      where: { id: flowId },
      data: {
        status: 'APPROVED',
        processedDate: new Date(),
        reviewedBy: guard.email,
        note: typeof comment === 'string' && comment ? comment : flow.note,
      },
    })
    await rebuildFundLedger(flow.fundId)
    await audit('FLOW_APPROVED', { actor: guard.email, detail: `${label} (${flowId})` })
  }

  revalidatePath('/ops-transactions')
  revalidatePath('/operations')
  revalidatePath('/transactions')
  revalidatePath('/request-transaction')
  return {
    status: 'success',
    message: `Request ${decision === 'approve' ? 'approved' : 'rejected'}: ${label}.`,
  }
}
