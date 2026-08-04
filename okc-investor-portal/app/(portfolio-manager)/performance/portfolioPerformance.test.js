import { describe, it, expect } from 'vitest'
import { compoundReturn } from '@/lib/ledger'
import {
  calculateDailyReturn,
  compoundDailyReturns,
  calculatePortfolioPerformance,
} from './portfolioPerformance'

const nav = (date, beginningValue, dailyPnL, deposits = 0, withdrawals = 0) => ({
  date,
  beginningValue,
  dailyPnL,
  deposits,
  withdrawals,
})

describe('calculateDailyReturn', () => {
  it('is daily P&L over the balance at the beginning of the day (8.2 ii)', () => {
    expect(calculateDailyReturn(10000, 500)).toBe(5)
  })

  it('returns 0 rather than dividing by a zero or negative opening balance', () => {
    expect(calculateDailyReturn(0, 500)).toBe(0)
    // A fund underwater after a loss deeper than its capital would otherwise
    // report a profitable day as a negative return.
    expect(calculateDailyReturn(-5000, 500)).toBe(0)
  })
})

describe('compoundDailyReturns', () => {
  it('compounds multiplicatively, not additively', () => {
    // +10% then -10% is a net loss, not a wash.
    expect(compoundDailyReturns([10, -10])).toBeCloseTo(-1, 10)
  })
})

describe('calculatePortfolioPerformance', () => {
  it('does not count deposits as return', () => {
    // The fund earned nothing all period and took a $500k deposit onto a
    // $100k base. Measuring return as ending/starting value reports +500%.
    const series = [
      nav('1 Jan 2026', 100000, 0),
      nav('2 Jan 2026', 100000, 0, 500000),
      nav('3 Jan 2026', 600000, 0),
    ]

    const result = calculatePortfolioPerformance(series)

    expect(result.fundReturn).toBe(0)
    expect(result.totalPnL).toBe(0)
    expect(result.portfolioValue).toBe(600000)
  })

  it('compounds daily returns across a mid-period deposit', () => {
    const series = [
      nav('1 Jan 2026', 100000, 2000),
      nav('2 Jan 2026', 102000, 0, 50000),
      nav('3 Jan 2026', 152000, 3000),
    ]

    const result = calculatePortfolioPerformance(series)

    // 1.02 * 1.0 * (1 + 3000/152000) - 1
    expect(result.fundReturn).toBeCloseTo(4.0132, 4)
    // Deliberately not P&L / initial capital, which would read 5.00%.
    expect(result.fundReturn).not.toBeCloseTo(5, 4)
    expect(result.totalPnL).toBe(5000)
  })

  it('agrees with the investor-facing compoundReturn on the same series', () => {
    const series = [
      nav('1 Jan 2026', 250000, -1200),
      nav('2 Jan 2026', 248800, 4300, 75000),
      nav('3 Jan 2026', 328100, 900, 0, 20000),
      nav('4 Jan 2026', 309000, -450),
    ]

    const result = calculatePortfolioPerformance(series)
    const ledgerFigure =
      compoundReturn(series.map(r => ({ openingBalance: r.beginningValue, pnl: r.dailyPnL }))) * 100

    // The portfolio manager and the investor must not be shown two different
    // numbers for the same fund over the same period.
    expect(result.fundReturn).toBeCloseTo(ledgerFigure, 10)
  })

  it('reports cumulative return period-to-date on every row', () => {
    const series = [nav('1 Jan 2026', 100000, 10000), nav('2 Jan 2026', 110000, -11000)]

    const rows = calculatePortfolioPerformance(series).performanceRows

    expect(rows[0].cumulativeReturn).toBeCloseTo(10, 10)
    expect(rows[1].cumulativeReturn).toBeCloseTo(-1, 10)
  })

  it('handles an empty period', () => {
    expect(calculatePortfolioPerformance([]).fundReturn).toBe(0)
    expect(calculatePortfolioPerformance(null).performanceRows).toEqual([])
  })
})
