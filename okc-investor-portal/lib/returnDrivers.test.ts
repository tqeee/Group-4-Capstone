import { describe, it, expect } from 'vitest'
import { summarizeReturnDrivers, type DriverDeal } from './returnDrivers'

const d = (overrides: Partial<DriverDeal> = {}): DriverDeal => ({
  symbol: 'EURUSD',
  type: 1,
  profit: 0,
  commission: 0,
  swap: 0,
  fee: 0,
  ...overrides,
})

describe('summarizeReturnDrivers', () => {
  it('decomposes gross P&L, costs and management fee down to net P&L', () => {
    const deals = [
      d({ symbol: 'EURUSD', profit: 1000, commission: -10, swap: -5 }),
      d({ symbol: 'XAUUSD', profit: -200, commission: -8, fee: -2 }),
    ]
    const result = summarizeReturnDrivers(deals, 15)

    expect(result.grossTradingPnl).toBe(800)
    expect(result.commission).toBe(-18)
    expect(result.swap).toBe(-5)
    expect(result.fee).toBe(-2)
    expect(result.managementFee).toBe(15)
    // 800 - 18 - 5 - 2 - 15 = 760
    expect(result.netPnl).toBe(760)
  })

  it('reconciles with the per-deal net used by computeFundLedger (profit+commission+swap+fee)', () => {
    const deals = [
      d({ symbol: 'EURUSD', profit: 100, commission: -1, swap: -2, fee: -3 }),
      d({ symbol: 'EURUSD', profit: 50, commission: -1 }),
    ]
    const result = summarizeReturnDrivers(deals, 0)
    const bySymbol = result.bySymbol.find(s => s.symbol === 'EURUSD')

    // (100-1-2-3) + (50-1) = 94 + 49 = 143
    expect(bySymbol?.netPnl).toBe(143)
    expect(bySymbol?.dealCount).toBe(2)
  })

  it('groups by symbol and sorts by largest absolute contribution first', () => {
    const deals = [
      d({ symbol: 'EURUSD', profit: 50 }),
      d({ symbol: 'XAUUSD', profit: -900 }),
      d({ symbol: 'GBPUSD', profit: 200 }),
    ]
    const result = summarizeReturnDrivers(deals, 0)

    expect(result.bySymbol.map(s => s.symbol)).toEqual(['XAUUSD', 'GBPUSD', 'EURUSD'])
  })

  it('splits by buy (type 0) vs sell (type 1)', () => {
    const deals = [
      d({ type: 0, profit: 100 }),
      d({ type: 1, profit: -40 }),
      d({ type: 0, profit: 10 }),
    ]
    const result = summarizeReturnDrivers(deals, 0)

    const buy = result.bySide.find(s => s.side === 'Buy')
    const sell = result.bySide.find(s => s.side === 'Sell')
    expect(buy).toEqual({ side: 'Buy', netPnl: 110, dealCount: 2 })
    expect(sell).toEqual({ side: 'Sell', netPnl: -40, dealCount: 1 })
  })

  it('handles an empty period', () => {
    const result = summarizeReturnDrivers([], 0)
    expect(result.netPnl).toBe(0)
    expect(result.dealCount).toBe(0)
    expect(result.bySymbol).toEqual([])
    expect(result.bySide).toEqual([])
  })
})
