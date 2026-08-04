'use server'

// §3.5 "Support Performance Analysis" — server actions backing the two new
// Performance-page panels. Both are read-only analysis: no ledger, flow, or
// any other row is ever written here.

import { requireRole } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { getFundReturnDrivers, getFundInvestorShares, type FundInvestorShare } from '@/lib/queries'
import { runAllocationScenario, type AllocationScenarioResult } from '@/lib/whatIf'
import type { LedgerDeal, LedgerFlow } from '@/lib/ledger'
import type { ReturnDriverBreakdown } from '@/lib/returnDrivers'

export async function fetchReturnDrivers(
  fundId: string,
  fromIso: string,
  toIso: string
): Promise<{ breakdown: ReturnDriverBreakdown; error?: never } | { breakdown?: never; error: string }> {
  const auth = await requireRole('portfolio-manager')
  if (!auth.ok) return { error: auth.message }

  if (!fundId || !fromIso || !toIso) return { error: 'Fund and date range are required.' }
  if (fromIso > toIso) return { error: 'From date must be on or before the to date.' }

  try {
    const breakdown = await getFundReturnDrivers(fundId, fromIso, toIso)
    return { breakdown }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load return drivers.' }
  }
}

export async function fetchInvestorShares(
  fundId: string,
  asOfIso: string
): Promise<
  | { asOfDate: string | null; investors: FundInvestorShare[]; error?: never }
  | { asOfDate?: never; investors?: never; error: string }
> {
  const auth = await requireRole('portfolio-manager')
  if (!auth.ok) return { error: auth.message }

  if (!fundId || !asOfIso) return { error: 'Fund and date are required.' }

  try {
    return await getFundInvestorShares(fundId, asOfIso)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to load investor shares.' }
  }
}

export type HypotheticalFlowInput = {
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  dateIso: string
  label: string
}

export async function runWhatIf(
  fundId: string,
  fromIso: string,
  toIso: string,
  hypotheticalFlows: HypotheticalFlowInput[]
): Promise<{ result: AllocationScenarioResult; error?: never } | { result?: never; error: string }> {
  const auth = await requireRole('portfolio-manager')
  if (!auth.ok) return { error: auth.message }

  if (!fundId || !fromIso || !toIso) return { error: 'Fund and date range are required.' }
  if (fromIso > toIso) return { error: 'From date must be on or before the to date.' }
  if (!Array.isArray(hypotheticalFlows) || hypotheticalFlows.length === 0) {
    return { error: 'Add at least one hypothetical deposit or withdrawal to simulate.' }
  }
  if (hypotheticalFlows.length > 10) {
    return { error: 'Simulate up to 10 hypothetical flows at a time.' }
  }
  for (const f of hypotheticalFlows) {
    if (!(f.amount > 0)) return { error: 'Each hypothetical amount must be greater than zero.' }
    if (!f.dateIso) return { error: 'Each hypothetical flow needs a date.' }
    if (f.type !== 'DEPOSIT' && f.type !== 'WITHDRAWAL') return { error: 'Invalid flow type.' }
  }

  const fund = await prisma.fund.findUnique({ where: { id: fundId }, select: { id: true } })
  if (!fund) return { error: 'Fund not found.' }

  const [dealsRaw, actualFlowsRaw, settings] = await Promise.all([
    prisma.deal.findMany({
      where: { fundId, type: { not: 2 } },
      select: { time: true, profit: true, commission: true, swap: true, fee: true, entry: true },
    }),
    prisma.fundFlow.findMany({
      where: { fundId, status: 'COMPLETED', processedDate: { not: null } },
      select: { investorId: true, type: true, amount: true, processedDate: true },
    }),
    getSettings(),
  ])

  const deals: LedgerDeal[] = dealsRaw.map(d => ({
    time: d.time,
    profit: Number(d.profit),
    commission: Number(d.commission),
    swap: Number(d.swap),
    fee: Number(d.fee),
    entry: d.entry,
  }))
  const actualFlows: LedgerFlow[] = actualFlowsRaw.map(f => ({
    investorId: f.investorId,
    type: f.type,
    amount: Number(f.amount),
    processedDate: f.processedDate!,
  }))
  // Synthetic ids, deliberately namespaced away from real investor ids (cuids)
  // — computeFundLedger doesn't care whether an investorId is real, it only
  // needs the hypothetical capital to not collide with an actual investor's
  // running balance.
  const hypothetical: LedgerFlow[] = hypotheticalFlows.map((f, i) => ({
    investorId: `whatif-${i}-${f.label || 'hypothetical'}`,
    type: f.type,
    amount: f.amount,
    processedDate: new Date(`${f.dateIso}T00:00:00.000Z`),
  }))

  const managementFeeAnnualPct = Number(settings.managementFee)
  const from = new Date(`${fromIso}T00:00:00.000Z`)
  const to = new Date(`${toIso}T00:00:00.000Z`)

  try {
    const result = runAllocationScenario(
      fundId,
      deals,
      actualFlows,
      hypothetical,
      managementFeeAnnualPct,
      from,
      to
    )
    return { result }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Simulation failed.' }
  }
}
