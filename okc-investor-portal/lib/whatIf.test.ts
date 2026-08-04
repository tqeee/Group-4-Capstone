import { describe, it, expect } from 'vitest'
import { runAllocationScenario } from './whatIf'
import type { LedgerDeal, LedgerFlow } from './ledger'
import type { FeeRatePeriod } from './managementFee'

const day = (iso: string) => new Date(`${iso}T00:00:00Z`)

const deal = (dateIso: string, profit: number, overrides: Partial<LedgerDeal> = {}): LedgerDeal => ({
  time: day(dateIso),
  profit,
  commission: 0,
  swap: 0,
  fee: 0,
  entry: 1,
  ...overrides,
})

const flow = (dateIso: string, investorId: string, type: LedgerFlow['type'], amount: number): LedgerFlow => ({
  investorId,
  type,
  amount,
  processedDate: day(dateIso),
})

// A single rate in force from the given date onward — matches the shape
// lib/managementFee.ts#getManagementFeeRateHistory returns.
const feeRate = (dateIso: string, annualPct: number): FeeRatePeriod[] => [
  { effectiveFrom: day(dateIso), annualPct },
]

describe('runAllocationScenario', () => {
  it('with no hypothetical flows, scenario equals baseline exactly', () => {
    const deals = [deal('2024-01-02', 1000)]
    const actualFlows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000)]

    const result = runAllocationScenario(
      'fund-1',
      deals,
      actualFlows,
      [],
      [],
      day('2024-01-01'),
      day('2024-01-03')
    )

    expect(result.scenario).toEqual(result.baseline)
    expect(result.deltaEndingBalance).toBe(0)
    expect(result.deltaReturnPct).toBe(0)
  })

  it('an earlier/larger hypothetical deposit dilutes daily % return without changing total dollar P&L', () => {
    const deals = [deal('2024-01-02', 1000)]
    const actualFlows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000)]
    // Scenario: a second investor also deposits 10,000 on the same day,
    // doubling the fund's capital base before the P&L day.
    const hypotheticalFlows = [flow('2024-01-01', 'hypo-1', 'DEPOSIT', 10000)]

    const result = runAllocationScenario(
      'fund-1',
      deals,
      actualFlows,
      hypotheticalFlows,
      [],
      day('2024-01-01'),
      day('2024-01-03')
    )

    // Baseline: opening 10,000 + pnl 1,000 -> 10% return.
    expect(result.baseline.returnPct).toBeCloseTo(10, 8)
    // Scenario: opening 20,000 + pnl 1,000 -> 5% return.
    expect(result.scenario.returnPct).toBeCloseTo(5, 8)
    expect(result.deltaReturnPct).toBeCloseTo(-5, 8)

    // Same $1,000 traded P&L either way — the deposit doesn't manufacture
    // or destroy dollar P&L, only dilutes the % return and share split.
    expect(result.baseline.totalPnl).toBe(1000)
    expect(result.scenario.totalPnl).toBe(1000)

    // Ending balance differs by exactly the extra deposit (1,000 pnl is
    // identical in both, so the whole 10,000 delta is the hypothetical flow).
    expect(result.deltaEndingBalance).toBe(10000)
  })

  it('a larger capital base under a management fee absorbs more fee, lowering net P&L', () => {
    const deals = [deal('2024-01-02', 0)] // no trading P&L — isolates the fee effect
    const actualFlows = [flow('2024-01-01', 'A', 'DEPOSIT', 365000)]
    const hypotheticalFlows = [flow('2024-01-01', 'hypo-1', 'DEPOSIT', 365000)]

    // 1% annual fee / 365 days = exactly 1% of opening per day at this size,
    // chosen so the numbers are easy to check by hand.
    const result = runAllocationScenario(
      'fund-1',
      deals,
      actualFlows,
      hypotheticalFlows,
      feeRate('2024-01-01', 1),
      day('2024-01-01'),
      day('2024-01-03')
    )

    expect(result.baseline.totalPnl).toBeCloseTo(-10, 6) // 365000 * 1%/365
    expect(result.scenario.totalPnl).toBeCloseTo(-20, 6) // 730000 * 1%/365
    expect(result.scenario.totalPnl).toBeLessThan(result.baseline.totalPnl)
  })

  it('only counts days inside the requested reporting window', () => {
    const deals = [deal('2024-01-02', 1000), deal('2024-02-05', 5000)]
    const actualFlows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000)]

    const result = runAllocationScenario(
      'fund-1',
      deals,
      actualFlows,
      [],
      [],
      day('2024-01-01'),
      day('2024-01-03')
    )

    // The Feb 5 trading day is outside the window and must not leak in.
    expect(result.baseline.totalPnl).toBe(1000)
    // computeFundLedger emits a row for every day the fund holds capital, not
    // just trading days (see lib/ledger.ts) — Jan 1 (flow), Jan 2 (pnl), and
    // Jan 3 (idle, but the fund still holds the Jan-1 deposit).
    expect(result.baseline.days).toBe(3)
  })
})
