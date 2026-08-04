import { describe, it, expect } from 'vitest'
import { computeFundLedger, compoundReturn, type LedgerDeal, type LedgerFlow } from './ledger'

const day = (iso: string) => new Date(`${iso}T00:00:00Z`)
const round2 = (n: number) => Math.round(n * 100) / 100

const deal = (dateIso: string, profit: number, entry: number, overrides: Partial<LedgerDeal> = {}): LedgerDeal => ({
  time: day(dateIso),
  profit,
  commission: 0,
  swap: 0,
  fee: 0,
  entry,
  ...overrides,
})

const flow = (
  dateIso: string,
  investorId: string,
  type: LedgerFlow['type'],
  amount: number
): LedgerFlow => ({
  investorId,
  type,
  amount,
  processedDate: day(dateIso),
})

describe('computeFundLedger', () => {
  it('single investor, single day of P&L', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000)]
    const deals = [deal('2024-01-02', 500, 1)]

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    expect(navRows).toEqual([
      {
        fundId: 'fund-1',
        date: day('2024-01-01'),
        openingBalance: 0,
        pnl: 0,
        netFlows: 10000,
        closingBalance: 10000,
        // Opening balance is $0 on the very first day (before that day's
        // deposit lands) — a % return has no meaningful base, so it's null,
        // not a misleading 0%.
        dailyReturnPct: null,
        tradeCount: 0,
      },
      {
        fundId: 'fund-1',
        date: day('2024-01-02'),
        openingBalance: 10000,
        pnl: 500,
        netFlows: 0,
        closingBalance: 10500,
        dailyReturnPct: 0.05,
        tradeCount: 1,
      },
    ])

    expect(ledgerRows).toEqual([
      {
        investorId: 'A',
        fundId: 'fund-1',
        date: day('2024-01-01'),
        openingSharePct: 0,
        openingValue: 0,
        pnl: 0,
        closingValue: 10000,
        closingSharePct: 1,
      },
      {
        investorId: 'A',
        fundId: 'fund-1',
        date: day('2024-01-02'),
        openingSharePct: 1,
        openingValue: 10000,
        pnl: 500,
        closingValue: 10500,
        closingSharePct: 1,
      },
    ])
  })

  it('a new investor joining mid-period is not misattributed to the existing investor', () => {
    // Regression test for the exact bug found in an earlier prototype: a
    // brand-new investor's deposit day must show $0 opening value/share (not
    // silently folded into whoever already held the fund), and the following
    // day's split must be based on real dollar values.
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 50000), flow('2024-01-03', 'B', 'DEPOSIT', 25000)]
    const deals = [deal('2024-01-02', -1000, 1), deal('2024-01-03', 2000, 1)]

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    expect(navRows.map(r => ({ date: r.date, openingBalance: r.openingBalance, closingBalance: r.closingBalance }))).toEqual([
      { date: day('2024-01-01'), openingBalance: 0, closingBalance: 50000 },
      { date: day('2024-01-02'), openingBalance: 50000, closingBalance: 49000 },
      { date: day('2024-01-03'), openingBalance: 49000, closingBalance: 76000 },
    ])

    const bDay3 = ledgerRows.find(r => r.investorId === 'B' && r.date.getTime() === day('2024-01-03').getTime())!
    expect(bDay3.openingSharePct).toBe(0)
    expect(bDay3.openingValue).toBe(0)
    expect(bDay3.pnl).toBe(0) // B owned nothing at the start of the day, so gets none of that day's P&L
    expect(bDay3.closingValue).toBe(25000) // just their deposit

    const aDay3 = ledgerRows.find(r => r.investorId === 'A' && r.date.getTime() === day('2024-01-03').getTime())!
    expect(aDay3.closingValue).toBe(51000) // 49000 opening + full 2000 P&L (100% opening share)

    // Shares must split proportionally to real dollar values and sum to 1.
    expect(aDay3.closingSharePct).toBeCloseTo(51000 / 76000, 8)
    expect(bDay3.closingSharePct).toBeCloseTo(25000 / 76000, 8)
    expect(aDay3.closingSharePct + bDay3.closingSharePct).toBeCloseTo(1, 8)
  })

  it('a withdrawal larger than the investor\'s balance is capped at what they hold', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000), flow('2024-01-02', 'A', 'WITHDRAWAL', 15000)]
    const deals: LedgerDeal[] = []

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    const aDay2 = ledgerRows.find(r => r.date.getTime() === day('2024-01-02').getTime())!
    expect(aDay2.openingValue).toBe(10000)
    expect(aDay2.closingValue).toBe(0) // never negative
    expect(aDay2.closingSharePct).toBe(0)

    // Only the money that could actually leave the fund is booked. Applying
    // the full $15,000 would leave the fund's NAV at -$5,000 while its only
    // investor is worth $0, and the next day would then open at $0 rather
    // than where the previous day closed — an unreconcilable set of books.
    const navDay2 = navRows.find(r => r.date.getTime() === day('2024-01-02').getTime())!
    expect(navDay2.netFlows).toBe(-10000)
    expect(navDay2.closingBalance).toBe(0)
  })

  it('P&L earned before the fund holds any capital is carried, not lost', () => {
    // Deals imported ahead of the matching deposit being marked processed:
    // nobody owns a share on 1 Jan, so that day's $800 cannot be split. It is
    // held over and released on the next day the fund actually has capital.
    const deals = [deal('2024-01-01', 800, 1), deal('2024-01-03', 100, 1)]
    const flows = [flow('2024-01-02', 'A', 'DEPOSIT', 10000)]

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    expect(navRows.map(r => ({ date: r.date, pnl: r.pnl, closingBalance: r.closingBalance }))).toEqual([
      { date: day('2024-01-02'), pnl: 0, closingBalance: 10000 },
      { date: day('2024-01-03'), pnl: 900, closingBalance: 10900 }, // 800 carried + 100 earned
    ])
    expect(ledgerRows.reduce((s, r) => s + r.pnl, 0)).toBe(900)
  })

  it('splits a loss deeper than the fund\'s capital without losing the shareholding split', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 6000), flow('2024-01-01', 'B', 'DEPOSIT', 4000)]
    const deals = [deal('2024-01-02', -15000, 1), deal('2024-01-03', 20000, 1)]

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    // A negative opening balance is still a valid base to apportion against:
    // value / total stays 60/40 because both numerator and denominator flip.
    const day3 = ledgerRows.filter(r => r.date.getTime() === day('2024-01-03').getTime())
    expect(day3.find(r => r.investorId === 'A')!.openingSharePct).toBe(0.6)
    expect(day3.find(r => r.investorId === 'B')!.openingSharePct).toBe(0.4)
    expect(day3.reduce((s, r) => s + r.closingValue, 0)).toBe(15000)

    // A % return against a negative base would be sign-flipped nonsense.
    expect(navRows.find(r => r.date.getTime() === day('2024-01-03').getTime())!.dailyReturnPct).toBeNull()
  })

  it('splits P&L pro-rata by opening share for multiple investors', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 60000), flow('2024-01-01', 'B', 'DEPOSIT', 40000)]
    const deals = [deal('2024-01-02', 1000, 1)]

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)

    expect(navRows[1]).toEqual({
      fundId: 'fund-1',
      date: day('2024-01-02'),
      openingBalance: 100000,
      pnl: 1000,
      netFlows: 0,
      closingBalance: 101000,
      dailyReturnPct: 0.01,
      tradeCount: 1,
    })

    const day2Rows = ledgerRows.filter(r => r.date.getTime() === day('2024-01-02').getTime())
    const a = day2Rows.find(r => r.investorId === 'A')!
    const b = day2Rows.find(r => r.investorId === 'B')!

    expect(a.openingSharePct).toBe(0.6)
    expect(a.pnl).toBe(600) // 60% of the day's 1000 P&L
    expect(a.closingValue).toBe(60600)

    expect(b.openingSharePct).toBe(0.4)
    expect(b.pnl).toBe(400) // 40% of the day's 1000 P&L
    expect(b.closingValue).toBe(40400)
  })

  it('excludes non-trading deal rows (type=2 balance) is the caller\'s job, not computeFundLedger\'s — trade_count only counts entry=1', () => {
    // computeFundLedger trusts whatever `deals` it's given; entry=0 (open)
    // rows must not be counted as completed trades.
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 10000)]
    const deals = [deal('2024-01-02', 0, 0), deal('2024-01-02', 500, 1)]

    const { navRows } = computeFundLedger('fund-1', deals, flows)
    expect(navRows[1].tradeCount).toBe(1)
  })

  it('defaults to no management fee when the rate is omitted', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 100000)]
    const deals = [deal('2024-01-02', 0, 0)]

    const { navRows } = computeFundLedger('fund-1', deals, flows)
    expect(navRows[1].pnl).toBe(0)
    expect(navRows[1].closingBalance).toBe(100000)
  })

  it('accrues an annual management fee daily against the opening balance, even on a day with no trading', () => {
    // 3.65% annual = 0.01%/day -> $10/day fee on a $100,000 opening balance.
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 100000)]
    const deals = [deal('2024-01-02', 0, 0)] // no trading P&L that day

    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows, 3.65)

    const day2Nav = navRows.find(r => r.date.getTime() === day('2024-01-02').getTime())!
    expect(day2Nav.pnl).toBe(-10)
    expect(day2Nav.closingBalance).toBe(99990)

    const day2Ledger = ledgerRows.find(r => r.date.getTime() === day('2024-01-02').getTime())!
    expect(day2Ledger.pnl).toBe(-10) // sole investor bears the full fee
    expect(day2Ledger.closingValue).toBe(99990)
  })

  it('nets the management fee against trading P&L, and splits it pro-rata across investors', () => {
    const flows = [flow('2024-01-01', 'A', 'DEPOSIT', 60000), flow('2024-01-01', 'B', 'DEPOSIT', 40000)]
    const deals = [deal('2024-01-02', 1000, 1)] // $1000 trading gain

    // 36.5% annual = 0.1%/day -> $100/day fee on the $100,000 opening balance.
    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows, 36.5)

    const day2Nav = navRows.find(r => r.date.getTime() === day('2024-01-02').getTime())!
    expect(day2Nav.pnl).toBe(900) // 1000 trading gain - 100 fee

    const day2Rows = ledgerRows.filter(r => r.date.getTime() === day('2024-01-02').getTime())
    const a = day2Rows.find(r => r.investorId === 'A')!
    const b = day2Rows.find(r => r.investorId === 'B')!
    expect(a.pnl).toBe(540) // 60% of the net 900
    expect(b.pnl).toBe(360) // 40% of the net 900
  })
})

// The whole point of persisting these workings is that they reconcile. If they
// don't, every 8.2 metric derived from them inherits the error.
describe('computeFundLedger invariants', () => {
  const check = (deals: LedgerDeal[], flows: LedgerFlow[]) => {
    const { navRows, ledgerRows } = computeFundLedger('fund-1', deals, flows)
    const rowsOn = (d: Date) => ledgerRows.filter(r => r.date.getTime() === d.getTime())
    const sum = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) * 1e8) / 1e8

    navRows.forEach((nav, i) => {
      const rows = rowsOn(nav.date)
      // 1. The fund row adds up.
      expect(round2(nav.openingBalance + nav.pnl + nav.netFlows)).toBe(nav.closingBalance)
      // 2. Each day opens exactly where the previous one closed.
      if (i > 0) expect(nav.openingBalance).toBe(navRows[i - 1].closingBalance)
      // 3. Investors' P&L and values add up to the fund's, to the cent.
      expect(round2(sum(rows.map(r => r.pnl)))).toBe(nav.pnl)
      expect(round2(sum(rows.map(r => r.openingValue)))).toBe(nav.openingBalance)
      expect(round2(sum(rows.map(r => r.closingValue)))).toBe(nav.closingBalance)
      // 4. Shareholdings account for the whole fund.
      if (nav.closingBalance !== 0) expect(sum(rows.map(r => r.closingSharePct))).toBe(1)
      if (nav.openingBalance !== 0) expect(sum(rows.map(r => r.openingSharePct))).toBe(1)
    })

    return { navRows, ledgerRows }
  }

  it('holds for three investors splitting an amount that does not divide evenly', () => {
    // $1,000 split three ways is $333.333...; rounded independently that comes
    // to $999.99, and a cent goes missing from the fund every single day.
    const flows = ['A', 'B', 'C'].map(id => flow('2024-01-01', id, 'DEPOSIT', 10000))
    const { navRows, ledgerRows } = check([deal('2024-01-02', 1000, 1)], flows)

    const day2 = ledgerRows.filter(r => r.date.getTime() === day('2024-01-02').getTime())
    expect(day2.map(r => r.pnl).sort()).toEqual([333.33, 333.33, 333.34])
    expect(navRows[1].pnl).toBe(1000)
  })

  it('holds across a long randomised run of deals, deposits and withdrawals', () => {
    // Deterministic LCG — a fixed seed keeps failures reproducible.
    let seed = 42
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648

    const deals: LedgerDeal[] = []
    const flows: LedgerFlow[] = []
    for (let d = 0; d < 400; d++) {
      const iso = new Date(Date.UTC(2024, 0, 1 + d)).toISOString().slice(0, 10)
      if (rnd() < 0.75) deals.push(deal(iso, Math.round((rnd() - 0.48) * 800000) / 100, 1))
      if (rnd() < 0.1) {
        flows.push(
          flow(iso, `I${Math.floor(rnd() * 8)}`, rnd() < 0.6 ? 'DEPOSIT' : 'WITHDRAWAL', Math.round(rnd() * 40000))
        )
      }
    }

    const { navRows, ledgerRows } = check(deals, flows)
    expect(navRows.length).toBeGreaterThan(300)
    // Nothing evaporates over the full period either.
    expect(round2(ledgerRows.reduce((s, r) => s + r.pnl, 0))).toBe(
      round2(navRows.reduce((s, r) => s + r.pnl, 0))
    )
  })

})

describe('compoundReturn', () => {
  it('returns 0 for an empty period', () => {
    expect(compoundReturn([])).toBe(0)
  })

  it('compounds daily % returns multiplicatively, not additively', () => {
    // +10% then -10% is NOT back to even — it's a net loss.
    const result = compoundReturn([
      { openingBalance: 100, pnl: 10 },
      { openingBalance: 110, pnl: -11 },
    ])
    expect(result).toBeCloseTo(-0.01, 10)
  })

  it('skips days with a zero opening balance instead of dividing by zero', () => {
    const result = compoundReturn([
      { openingBalance: 0, pnl: 500 }, // e.g. the very first day, before any capital
      { openingBalance: 1000, pnl: 100 },
    ])
    expect(result).toBeCloseTo(0.1, 10)
  })
})
