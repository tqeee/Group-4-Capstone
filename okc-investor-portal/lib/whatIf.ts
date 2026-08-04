// §3.5 "Support Performance Analysis": what-if analysis to test how the fund
// would have performed if investor capital had been allocated differently.
//
// Reuses lib/ledger.ts's already-tested, pure computeFundLedger() — the same
// §8.1 daily waterfall that produces the real ledger — run twice against the
// SAME deal history: once against the actual completed flows (baseline) and
// once against the actual flows plus a set of hypothetical ones (scenario).
// Since trading P&L is unaffected by capital timing but each investor's
// (and the fund's) share of it is, replaying the waterfall is the only
// correct way to answer "what if" — it is not a shortcut formula.
//
// Deliberately pure (no DB access) so it can be unit-tested the same way
// computeFundLedger is; the caller (a server action) supplies the fund's
// full deal history and actual flows already fetched from the DB.

import { computeFundLedger, type LedgerDeal, type LedgerFlow, type FundDailyNavRow } from '@/lib/ledger'
import { compoundReturn } from '@/lib/finance'
import type { FeeRatePeriod } from '@/lib/managementFee'

export type ScenarioSummary = {
  endingBalance: number
  totalPnl: number
  returnPct: number
  days: number
}

export type AllocationScenarioResult = {
  baseline: ScenarioSummary
  scenario: ScenarioSummary
  deltaEndingBalance: number
  deltaReturnPct: number
}

function summarizePeriod(navRows: FundDailyNavRow[], fromMs: number, toMs: number): ScenarioSummary {
  const inRange = navRows.filter(r => {
    const t = r.date.getTime()
    return t >= fromMs && t <= toMs
  })
  const endingBalance = inRange.length > 0 ? inRange[inRange.length - 1].closingBalance : 0
  const totalPnl = inRange.reduce((s, r) => s + r.pnl, 0)
  const returnPct =
    compoundReturn(inRange.map(r => ({ openingBalance: r.openingBalance, pnl: r.pnl }))) * 100
  return { endingBalance, totalPnl, returnPct, days: inRange.length }
}

// `from`/`to` bound the reporting window (matches the Performance page's
// selected date range) — the ledger itself is always replayed from the
// fund's full deal history, since day N's opening balance depends on every
// day before it. `feeRates` is the fund's full management-fee rate history
// (lib/managementFee.ts#getManagementFeeRateHistory) — computeFundLedger
// resolves whichever rate was actually in force on each replayed day, so a
// mid-history rate change is reflected the same way it is in the real ledger.
export function runAllocationScenario(
  fundId: string,
  deals: LedgerDeal[],
  actualFlows: LedgerFlow[],
  hypotheticalFlows: LedgerFlow[],
  feeRates: FeeRatePeriod[],
  from: Date,
  to: Date
): AllocationScenarioResult {
  const baselineLedger = computeFundLedger(fundId, deals, actualFlows, feeRates)
  const scenarioLedger = computeFundLedger(
    fundId,
    deals,
    [...actualFlows, ...hypotheticalFlows],
    feeRates
  )

  const fromMs = from.getTime()
  const toMs = to.getTime()
  const baseline = summarizePeriod(baselineLedger.navRows, fromMs, toMs)
  const scenario = summarizePeriod(scenarioLedger.navRows, fromMs, toMs)

  return {
    baseline,
    scenario,
    deltaEndingBalance: scenario.endingBalance - baseline.endingBalance,
    deltaReturnPct: scenario.returnPct - baseline.returnPct,
  }
}
