import { prisma } from '@/lib/db'
import { getManagementFeeRateHistory, type FeeRatePeriod } from '@/lib/managementFee'

// Implements the recordkeeping process from section 8.1 of the challenge
// statement. For each fund, we replay every day from the first activity:
//
//   opening balance (= previous day's closing)
//   + daily P&L        (sum of profit+commission+swap+fee of that day's deals,
//                       less that day's accrued management fee, split among
//                       investors pro-rata by opening share %)
//   + net flows        (completed deposit/withdrawal requests processed that day)
//   = closing balance  (then each investor's share % is recalculated)
//
// The intermediate workings are persisted to FundDailyNav (fund level) and
// InvestorDailyLedger (per investor), which makes 8.2's metrics — total dollar
// PNL per investor and compounded fund return — simple aggregations.
//
// Two invariants hold for every fund, and the tests assert both:
//   1. sum(InvestorDailyLedger.pnl) == FundDailyNav.pnl, to the cent
//   2. FundDailyNav.openingBalance == the previous row's closingBalance

const DAY_MS = 24 * 60 * 60 * 1000
// Admin's "Management fee (%)" setting (lib/settings.ts) is an ANNUAL rate on
// AUM, accrued daily against each day's opening balance — the standard fund
// convention (e.g. a 1% annual fee ~= 1/365th deducted each day).
const DAYS_PER_YEAR = 365

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// The rate in force on a given day: the latest period whose effectiveFrom is
// on or before that day, or 0 if the day predates every period. `feeRates`
// must be sorted ascending by effectiveFrom (getManagementFeeRateHistory
// already returns it that way) — this is what makes a rate change apply
// going forward only: days before its effectiveFrom keep resolving to
// whatever period covered them at the time, unaffected by later changes.
function rateOnDay(feeRates: FeeRatePeriod[], day: number): number {
  let pct = 0
  for (const period of feeRates) {
    if (period.effectiveFrom.getTime() <= day) pct = period.annualPct
    else break
  }
  return pct
}

const round2 = (n: number) => Math.round(n * 100) / 100
const round8 = (n: number) => Math.round(n * 1e8) / 1e8

// Rounds `raw` to `dp` decimal places using largest-remainder allocation, so
// the rounded values add up to `target` exactly.
//
// Rounding each investor's figure independently does not add up: three
// investors splitting $1,000 each round to $333.33, totalling $999.99 and
// leaving a cent unaccounted for — every day, on every fund. A ledger that
// has to reconcile cannot lose money to rounding, so the leftover units are
// handed to the investors with the largest dropped fractions.
function allocate(raw: number[], target: number, dp: number): number[] {
  if (raw.length === 0) return []
  const scale = 10 ** dp
  // The epsilon absorbs binary-float error (0.29 * 100 is 28.999999999999996).
  const units = raw.map(v => Math.floor(v * scale + 1e-6))
  let residual = Math.round(target * scale) - units.reduce((a, b) => a + b, 0)
  if (residual !== 0) {
    const order = raw
      .map((v, i) => ({ i, frac: v * scale - units[i] }))
      .sort((a, b) => b.frac - a.frac)
    const step = residual > 0 ? 1 : -1
    for (let k = 0; residual !== 0; k++) {
      // Surplus units go to the largest fractions first, deficits are taken
      // back from the smallest.
      const pick = step > 0 ? order[k % order.length] : order[order.length - 1 - (k % order.length)]
      units[pick.i] += step
      residual -= step
    }
  }
  return units.map(u => u / scale)
}

export type LedgerDeal = {
  time: Date
  profit: number
  commission: number
  swap: number
  fee: number
  entry: number
}

export type LedgerFlow = {
  investorId: string
  type: 'DEPOSIT' | 'WITHDRAWAL'
  amount: number
  processedDate: Date
}

export type FundDailyNavRow = {
  fundId: string
  date: Date
  openingBalance: number
  pnl: number
  // That day's accrued management fee, already netted into `pnl` above —
  // persisted separately purely so it can be shown as its own line item.
  managementFee: number
  netFlows: number
  closingBalance: number
  dailyReturnPct: number | null
  tradeCount: number
}

export type InvestorDailyLedgerRow = {
  investorId: string
  fundId: string
  date: Date
  openingSharePct: number
  openingValue: number
  pnl: number
  managementFee: number
  closingValue: number
  closingSharePct: number
}

// Pure §8.1 calculation: given a fund's deals and processed flows, replay the
// daily shareholding waterfall and return the rows to persist. No database
// access here — this is what lets the math be unit-tested without a DB.
export function computeFundLedger(
  fundId: string,
  deals: LedgerDeal[],
  flows: LedgerFlow[],
  feeRates: FeeRatePeriod[] = []
): { navRows: FundDailyNavRow[]; ledgerRows: InvestorDailyLedgerRow[] } {
  // Daily P&L from deals, plus a count of closed ("out") trades per day for
  // fund_daily_nav.trade_count (8.2/3.5 analytics column).
  const pnlByDay = new Map<number, number>()
  const tradeCountByDay = new Map<number, number>()
  for (const d of deals) {
    const key = utcDay(d.time).getTime()
    const pnl = d.profit + d.commission + d.swap + d.fee
    pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + pnl)
    if (d.entry === 1) tradeCountByDay.set(key, (tradeCountByDay.get(key) ?? 0) + 1)
  }

  // Net processed flows per investor per day (deposits +, withdrawals -).
  const flowsByDay = new Map<number, Map<string, number>>()
  for (const f of flows) {
    const key = utcDay(f.processedDate).getTime()
    const signed = f.type === 'DEPOSIT' ? f.amount : -f.amount
    const perInvestor = flowsByDay.get(key) ?? new Map<string, number>()
    perInvestor.set(f.investorId, (perInvestor.get(f.investorId) ?? 0) + signed)
    flowsByDay.set(key, perInvestor)
  }

  const allDays = [...new Set([...pnlByDay.keys(), ...flowsByDay.keys()])].sort((a, b) => a - b)

  const navRows: FundDailyNavRow[] = []
  const ledgerRows: InvestorDailyLedgerRow[] = []

  // Running unrounded state: each investor's dollar value of their share.
  const values = new Map<string, number>()

  if (allDays.length > 0) {
    // P&L generated on a day when the fund holds nothing cannot be attributed
    // to anybody — every opening share is 0. Booking it at fund level anyway
    // would break both invariants this table exists to guarantee: that fund
    // P&L equals the sum of investor P&L, and that each day opens where the
    // previous one closed. So it is carried forward instead, and released on
    // the next day the fund actually has capital. In practice this happens
    // when deals are imported before the matching deposit has been marked
    // processed (broker `balance` rows are excluded on import by design).
    let carriedPnl = 0

    for (let t = allDays[0]; t <= allDays[allDays.length - 1]; t += DAY_MS) {
      const tradingPnl = pnlByDay.get(t) ?? 0
      const dayFlows = flowsByDay.get(t)
      const opening = [...values.values()].reduce((a, b) => a + b, 0)
      // Management fee accrues on the day's opening balance regardless of
      // trading activity, at whichever rate was in effect ON THIS DAY (not
      // today's rate — see rateOnDay), then reduces that day's P&L like any
      // other cost. A fund holding nothing accrues nothing, so the fee never
      // contributes to the carry-forward below — only trading P&L can end up
      // unattributed.
      const managementFeeAnnualPct = rateOnDay(feeRates, t)
      const managementFee = opening * (managementFeeAnnualPct / 100 / DAYS_PER_YEAR)

      // Investors active today: had a position at opening or have a flow.
      const active = new Set<string>(values.keys())
      dayFlows?.forEach((_, investorId) => active.add(investorId))

      // Shares are openingValue / opening, which sums to 1 for any non-zero
      // opening balance — including a negative one, if losses ever exceeded
      // the fund's capital. Only an empty fund leaves P&L unattributable.
      const attributable = opening !== 0
      const pending = tradingPnl - managementFee + carriedPnl
      const dayPnl = attributable ? pending : 0
      carriedPnl = attributable ? 0 : pending

      // Skip completely idle days (no positions, no attributable P&L, no flows).
      if (active.size === 0 && dayPnl === 0) continue

      const ids = [...active]
      const openingValues = ids.map(id => values.get(id) ?? 0)
      // P&L is split in the same proportion as opening shareholding (8.1).
      const openingShares = openingValues.map(v => (attributable ? v / opening : 0))
      const pnlShares = openingShares.map(s => dayPnl * s)
      // Fee is split the same pro-rata way as P&L, but rounded and
      // reconciled independently of it — it's a purely informational
      // breakout of an amount already netted into dayPnl above, not a
      // second deduction from the balance.
      const feeShares = openingShares.map(s => managementFee * s)

      let netFlows = 0
      const closingValues = ids.map((id, i) => {
        const afterPnl = openingValues[i] + pnlShares[i]
        const requested = dayFlows?.get(id) ?? 0
        // A withdrawal can only remove what the investor actually holds.
        // Applying the full requested amount regardless would push the fund's
        // closing balance below the sum of its investors' values, leaving a
        // negative NAV that never reconciles and a next-day opening balance
        // that no longer matches it. Ops validates this upstream too; capping
        // here keeps the books consistent if anything slips through.
        const applied = requested < 0 ? -Math.min(-requested, Math.max(0, afterPnl)) : requested
        netFlows += applied
        return afterPnl + applied
      })

      const closing = opening + dayPnl + netFlows

      // The fund row has to add up too. Opening and closing are pinned to the
      // true rounded balances — opening is always the previous day's closing,
      // so rounding them independently can never drift — and the cent that
      // rounding may strand is absorbed into pnl / netFlows instead.
      const openingBalance = round2(opening)
      const closingBalance = round2(closing)
      const [navPnl, navNetFlows] = allocate([dayPnl, netFlows], closingBalance - openingBalance, 2)
      const navManagementFee = round2(managementFee)

      // Round the per-investor columns against those fund-level totals so they
      // add up exactly (see `allocate`).
      const outOpeningValues = allocate(openingValues, openingBalance, 2)
      const outPnl = allocate(pnlShares, navPnl, 2)
      const outManagementFee = allocate(feeShares, navManagementFee, 2)
      const outClosingValues = allocate(closingValues, closingBalance, 2)
      const outOpeningShares = allocate(openingShares, attributable ? 1 : 0, 8)
      const outClosingShares = allocate(
        closingValues.map(v => (closing !== 0 ? v / closing : 0)),
        closing !== 0 ? 1 : 0,
        8
      )

      ids.forEach((investorId, i) => {
        // Carry the unrounded value forward; only the persisted row is rounded.
        if (closingValues[i] !== 0) values.set(investorId, closingValues[i])
        else values.delete(investorId)

        ledgerRows.push({
          investorId,
          fundId,
          date: new Date(t),
          openingSharePct: outOpeningShares[i],
          openingValue: outOpeningValues[i],
          pnl: outPnl[i],
          managementFee: outManagementFee[i],
          closingValue: outClosingValues[i],
          closingSharePct: outClosingShares[i],
        })
      })

      navRows.push({
        fundId,
        date: new Date(t),
        openingBalance,
        pnl: navPnl,
        managementFee: navManagementFee,
        netFlows: navNetFlows,
        closingBalance,
        // Raw fraction (not *100), consistent with openingSharePct/closingSharePct.
        dailyReturnPct: opening > 0 ? round8(dayPnl / opening) : null,
        tradeCount: tradeCountByDay.get(t) ?? 0,
      })
    }
  }

  return { navRows, ledgerRows }
}

export async function rebuildFundLedger(fundId: string): Promise<void> {
  const [dealsRaw, flowsRaw, feeRates] = await Promise.all([
    prisma.deal.findMany({
      // type 2 = balance (deposits/withdrawals on the broker account) — money
      // movement, not trading P&L. The portal tracks those as FundFlows.
      where: { fundId, type: { not: 2 } },
      select: { time: true, profit: true, commission: true, swap: true, fee: true, entry: true },
    }),
    prisma.fundFlow.findMany({
      where: {
        fundId,
        status: 'COMPLETED',
        processedDate: { not: null },
      },
      select: { investorId: true, type: true, amount: true, processedDate: true },
    }),
    getManagementFeeRateHistory(),
  ])

  const deals: LedgerDeal[] = dealsRaw.map(d => ({
    time: d.time,
    profit: Number(d.profit),
    commission: Number(d.commission),
    swap: Number(d.swap),
    fee: Number(d.fee),
    entry: d.entry,
  }))
  const flows: LedgerFlow[] = flowsRaw.map(f => ({
    investorId: f.investorId,
    type: f.type,
    amount: Number(f.amount),
    processedDate: f.processedDate!,
  }))

  const { navRows, ledgerRows } = computeFundLedger(fundId, deals, flows, feeRates)

  await prisma.$transaction([
    prisma.investorDailyLedger.deleteMany({ where: { fundId } }),
    prisma.fundDailyNav.deleteMany({ where: { fundId } }),
    prisma.fundDailyNav.createMany({ data: navRows }),
    prisma.investorDailyLedger.createMany({ data: ledgerRows }),
  ])
}

export async function rebuildAllLedgers(): Promise<void> {
  const funds = await prisma.fund.findMany({ select: { id: true } })
  for (const fund of funds) {
    await rebuildFundLedger(fund.id)
  }
}

// Section 8.2 (ii)'s compounded fund return now lives in lib/finance.ts, which
// imports nothing server-only so client components can use the same formula.
// Re-exported here because this module was its original home and the read
// models (lib/queries.ts) and tests still import it from this path.
export { compoundReturn } from '@/lib/finance'
