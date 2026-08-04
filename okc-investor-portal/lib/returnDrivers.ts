// §3.5 "Support Performance Analysis": break the portfolio manager's overall
// return down into different drivers of return, across different time
// periods. This is the pure aggregation half — no DB access, so it can be
// unit-tested the same way lib/ledger.ts's computeFundLedger is — driven by
// dataset 5.4 (Deal / investment_transactions) rows already scoped to a fund
// and date window by the caller (lib/queries.ts#getFundReturnDrivers).
//
// Drivers surfaced:
//   - Cost decomposition: gross trading P&L vs. commission/swap/fee costs vs.
//     the management fee accrual, down to net P&L (reconciles with the same
//     period's sum of FundDailyNav.pnl — the tests assert this).
//   - By instrument (symbol): which traded symbols drove the return.
//   - By side (buy/sell): which direction of trading drove the return.
//
// Dataset 5.4 also specifies a `magic` (strategy ID) field, but the deployed
// schema's Deal model does not persist it (see prisma/schema.prisma) — so a
// by-strategy breakdown isn't derivable from what's actually stored, and is
// deliberately not attempted here rather than faked.

export type DriverDeal = {
  symbol: string
  type: number // 0 = buy, 1 = sell (balance rows, type 2, are filtered out by the caller)
  profit: number
  commission: number
  swap: number
  fee: number
}

export type SymbolDriver = { symbol: string; netPnl: number; dealCount: number }
export type SideDriver = { side: 'Buy' | 'Sell'; netPnl: number; dealCount: number }

export type ReturnDriverBreakdown = {
  grossTradingPnl: number
  commission: number
  swap: number
  fee: number
  managementFee: number
  netPnl: number
  dealCount: number
  bySymbol: SymbolDriver[]
  bySide: SideDriver[]
}

// Net per-deal contribution matches lib/ledger.ts's computeFundLedger exactly
// (profit + commission + swap + fee, summed per day) so the breakdown always
// reconciles with the booked ledger P&L for the same period.
const netOf = (d: DriverDeal) => d.profit + d.commission + d.swap + d.fee

export function summarizeReturnDrivers(
  deals: DriverDeal[],
  managementFeeTotal: number
): ReturnDriverBreakdown {
  let grossTradingPnl = 0
  let commission = 0
  let swap = 0
  let fee = 0

  const bySymbolMap = new Map<string, { netPnl: number; dealCount: number }>()
  const bySideMap = new Map<'Buy' | 'Sell', { netPnl: number; dealCount: number }>()

  for (const d of deals) {
    grossTradingPnl += d.profit
    commission += d.commission
    swap += d.swap
    fee += d.fee

    const net = netOf(d)

    const symEntry = bySymbolMap.get(d.symbol) ?? { netPnl: 0, dealCount: 0 }
    symEntry.netPnl += net
    symEntry.dealCount += 1
    bySymbolMap.set(d.symbol, symEntry)

    const side: 'Buy' | 'Sell' = d.type === 1 ? 'Sell' : 'Buy'
    const sideEntry = bySideMap.get(side) ?? { netPnl: 0, dealCount: 0 }
    sideEntry.netPnl += net
    sideEntry.dealCount += 1
    bySideMap.set(side, sideEntry)
  }

  const netPnl = grossTradingPnl + commission + swap + fee - managementFeeTotal

  return {
    grossTradingPnl,
    commission,
    swap,
    fee,
    managementFee: managementFeeTotal,
    netPnl,
    dealCount: deals.length,
    // Largest-magnitude contributors first — a PM scanning the list cares
    // about what moved the needle most, in either direction.
    bySymbol: [...bySymbolMap.entries()]
      .map(([symbol, v]) => ({ symbol, ...v }))
      .sort((a, b) => Math.abs(b.netPnl) - Math.abs(a.netPnl)),
    bySide: [...bySideMap.entries()].map(([side, v]) => ({ side, ...v })),
  }
}
