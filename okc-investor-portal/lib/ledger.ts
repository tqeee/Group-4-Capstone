import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'

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

const DAY_MS = 24 * 60 * 60 * 1000
// Admin's "Management fee (%)" setting (lib/settings.ts) is an ANNUAL rate on
// AUM, accrued daily against each day's opening balance — the standard fund
// convention (e.g. a 1% annual fee ~= 1/365th deducted each day).
const DAYS_PER_YEAR = 365

function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

const round2 = (n: number) => Math.round(n * 100) / 100
const round8 = (n: number) => Math.round(n * 1e8) / 1e8

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
  managementFeeAnnualPct = 0
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
    for (let t = allDays[0]; t <= allDays[allDays.length - 1]; t += DAY_MS) {
      const tradingPnl = pnlByDay.get(t) ?? 0
      const dayFlows = flowsByDay.get(t)
      const opening = [...values.values()].reduce((a, b) => a + b, 0)
      // Management fee accrues on the day's opening balance regardless of
      // trading activity, then reduces that day's P&L like any other cost.
      const managementFee = opening * (managementFeeAnnualPct / 100 / DAYS_PER_YEAR)
      const dayPnl = tradingPnl - managementFee

      // Investors active today: had a position at opening or have a flow.
      const active = new Set<string>(values.keys())
      dayFlows?.forEach((_, investorId) => active.add(investorId))

      // Skip completely idle days (no positions, no P&L, no flows).
      if (active.size === 0 && dayPnl === 0) continue

      let closing = opening + dayPnl
      let netFlows = 0

      for (const investorId of active) {
        const openingValue = values.get(investorId) ?? 0
        // P&L is split in the same proportion as opening shareholding (8.1).
        const openingSharePct = opening > 0 ? openingValue / opening : 0
        const pnlShare = dayPnl * openingSharePct
        const flow = dayFlows?.get(investorId) ?? 0
        // Withdrawals cannot take a share below zero (validated upstream too).
        const closingValue = Math.max(0, openingValue + pnlShare + flow)
        netFlows += flow

        if (closingValue > 0) values.set(investorId, closingValue)
        else values.delete(investorId)

        ledgerRows.push({
          investorId,
          fundId,
          date: new Date(t),
          openingSharePct: round8(openingSharePct),
          openingValue: round2(openingValue),
          pnl: round2(pnlShare),
          closingValue: round2(closingValue),
          closingSharePct: 0, // filled in below once closing is known
        })
      }

      closing += netFlows
      // Recalculate each investor's % shareholding against the closing balance.
      for (let i = ledgerRows.length - active.size; i < ledgerRows.length; i++) {
        const row = ledgerRows[i]
        row.closingSharePct = closing > 0 ? round8((values.get(row.investorId) ?? 0) / closing) : 0
      }

      navRows.push({
        fundId,
        date: new Date(t),
        openingBalance: round2(opening),
        pnl: round2(dayPnl),
        netFlows: round2(netFlows),
        closingBalance: round2(closing),
        // Raw fraction (not *100), consistent with openingSharePct/closingSharePct.
        dailyReturnPct: opening > 0 ? round8(dayPnl / opening) : null,
        tradeCount: tradeCountByDay.get(t) ?? 0,
      })
    }
  }

  return { navRows, ledgerRows }
}

export async function rebuildFundLedger(fundId: string): Promise<void> {
  const [dealsRaw, flowsRaw, settings] = await Promise.all([
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
    getSettings(),
  ])
  const managementFeeAnnualPct = Number(settings.managementFee)

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

  const { navRows, ledgerRows } = computeFundLedger(fundId, deals, flows, managementFeeAnnualPct)

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

// Section 8.2 (ii): fund return = daily % returns compounded over the period,
// where daily % return = daily PNL / total assets at beginning of day.
export function compoundReturn(
  days: { openingBalance: number; pnl: number }[]
): number {
  let factor = 1
  for (const day of days) {
    if (day.openingBalance > 0) factor *= 1 + day.pnl / day.openingBalance
  }
  return factor - 1
}
