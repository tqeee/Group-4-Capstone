'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/guards'
import { rebuildFundLedger } from '@/lib/ledger'
import { sendBankDetailsEmail } from '@/lib/email'
import { audit } from '@/lib/audit'
import { fmtMoney } from '@/lib/format'

export type ReviewFlowState =
  | { status: 'success'; message: string }
  | { status: 'warning'; message: string }
  | { status: 'error'; message: string }
  | undefined

function revalidateFlowPaths() {
  revalidatePath('/ops-transactions')
  revalidatePath('/operations')
  revalidatePath('/transactions')
  revalidatePath('/request-transaction')
}

// Operations approve/reject a PENDING deposit or withdrawal request (§3.3).
// Approving a withdrawal pays out immediately (OKC sends the money, so
// there's nothing to wait on) and completes it in the same step. Approving a
// deposit only emails bank transfer details and moves it to AWAITING_PROOF —
// the ledger isn't touched until the investor submits proof of transfer and
// operations confirms receipt via confirmReceipt below.
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
  const reviewNote = typeof comment === 'string' && comment ? comment : flow.note

  if (decision === 'reject') {
    await prisma.fundFlow.update({
      where: { id: flowId },
      data: { status: 'REJECTED', reviewedBy: guard.email, note: reviewNote },
    })
    await audit('FLOW_REJECTED', { actor: guard.email, detail: `${label} (${flowId})` })
    revalidateFlowPaths()
    return { status: 'success', message: `Request rejected: ${label}.` }
  }

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

    await prisma.fundFlow.update({
      where: { id: flowId },
      data: {
        status: 'COMPLETED',
        processedDate: new Date(),
        reviewedBy: guard.email,
        note: reviewNote,
      },
    })
    await rebuildFundLedger(flow.fundId)
    await audit('FLOW_COMPLETED', { actor: guard.email, detail: `${label} (${flowId})` })
    revalidateFlowPaths()
    return { status: 'success', message: `Withdrawal approved and completed: ${label}.` }
  }

  // Deposit: send bank details, wait for the investor's proof of transfer.
  await prisma.fundFlow.update({
    where: { id: flowId },
    data: { status: 'AWAITING_PROOF', reviewedBy: guard.email, note: reviewNote },
  })
  await audit('FLOW_APPROVED', { actor: guard.email, detail: `${label} (${flowId})` })
  revalidateFlowPaths()

  const emailResult = await sendBankDetailsEmail({
    to: flow.investor.email,
    investorName: flow.investor.name,
    amountLabel: fmtMoney(Number(flow.amount)),
    reference: flowId,
  })
  if (!emailResult.sent) {
    return {
      status: 'warning',
      message: `Request approved, but the bank details email could not be sent: ${emailResult.reason} Please share the bank details with ${flow.investor.email} directly.`,
    }
  }

  return { status: 'success', message: `Request approved: ${label}. Bank details emailed to the investor.` }
}

export type ConfirmReceiptState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

// Operations confirm (or reject) a deposit once the investor has submitted
// proof of transfer. Confirming is the only point the deposit is applied to
// the fund ledger.
export async function confirmReceipt(
  _prevState: ConfirmReceiptState,
  formData: FormData
): Promise<ConfirmReceiptState> {
  const guard = await requireRole('operations')
  if (!guard.ok) return { status: 'error', message: guard.message }

  const flowId = formData.get('flowId')
  const decision = formData.get('decision')
  const comment = formData.get('comment')

  if (typeof flowId !== 'string' || (decision !== 'complete' && decision !== 'reject')) {
    return { status: 'error', message: 'Invalid request.' }
  }

  const flow = await prisma.fundFlow.findUnique({
    where: { id: flowId },
    include: { investor: true },
  })
  if (!flow) return { status: 'error', message: 'Request not found.' }
  if (flow.status !== 'PENDING_RECEIPT') {
    return { status: 'error', message: 'This request is not awaiting receipt confirmation.' }
  }

  const label = `deposit ${fmtMoney(Number(flow.amount))} for ${flow.investor.name}`
  const reviewNote = typeof comment === 'string' && comment ? comment : flow.note

  if (decision === 'reject') {
    await prisma.fundFlow.update({
      where: { id: flowId },
      data: { status: 'REJECTED', reviewedBy: guard.email, note: reviewNote },
    })
    await audit('FLOW_REJECTED', { actor: guard.email, detail: `${label} (${flowId})` })
    revalidateFlowPaths()
    return { status: 'success', message: `Request rejected: ${label}.` }
  }

  await prisma.fundFlow.update({
    where: { id: flowId },
    data: {
      status: 'COMPLETED',
      processedDate: new Date(),
      reviewedBy: guard.email,
      note: reviewNote,
    },
  })
  await rebuildFundLedger(flow.fundId)
  await audit('FLOW_COMPLETED', { actor: guard.email, detail: `${label} (${flowId})` })
  revalidateFlowPaths()
  return { status: 'success', message: `Receipt confirmed: ${label}.` }
}
