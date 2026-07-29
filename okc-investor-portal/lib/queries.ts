import { prisma } from '@/lib/db'
import { compoundReturn } from '@/lib/ledger'
import { fmtDate } from '@/lib/format'

// Read models for the portal pages. Everything returned here is plain JSON
// (numbers/strings/booleans) so it can cross the server->client boundary.

const num = (d: unknown) => Number(d)

// ---------------------------------------------------------------------------
// Investor profile
// ---------------------------------------------------------------------------

export async function getInvestorByAuth(authUserId: string, email?: string | null) {
  // Match by Supabase user id first; fall back to email and link the id so
  // profiles created before the auth user (or vice versa) join up on first use.
  const byId = await prisma.investor.findUnique({ where: { authUserId } })
  if (byId) return byId
  if (!email) return null
  const byEmail = await prisma.investor.findUnique({ where: { email: email.toLowerCase() } })
  if (byEmail && !byEmail.authUserId) {
    return prisma.investor.update({ where: { id: byEmail.id }, data: { authUserId } })
  }
  return byEmail
}

// ---------------------------------------------------------------------------
// Investor dashboard / funds / reports
// ---------------------------------------------------------------------------

export type InvestorOverview = {
  hasData: boolean
  asOf: string | null // ISO date of latest ledger day
  asOfComputedAt: string | null // when that day's row was actually last computed
  totalValue: number
  dayPnl: number
  dayPct: number
  mtdPnl: number
  mtdPct: number
  ytdPnl: number
  ytdPct: number
  inceptionPnl: number
  inceptionPct: number
  inceptionDate: string | null
  grossDeposits: number
  series: { date: string; value: number }[]
  allocation: {
    fundId: string
    code: string
    name: string
    currency: string
    riskLevel: string
    strategy: string | null
    value: number
    pctOfPortfolio: number
    fundSharePct: number
    dayPnl: number
    mtdPnl: number
    ytdPnl: number
    inceptionPnl: number
  }[]
}

export async function getInvestorOverview(investorId: string): Promise<InvestorOverview> {
  const [rows, deposits] = await Promise.all([
    prisma.investorDailyLedger.findMany({
      where: { investorId },
      orderBy: { date: 'asc' },
      include: { fund: true },
    }),
    prisma.fundFlow.aggregate({
      where: { investorId, type: 'DEPOSIT', status: 'COMPLETED' },
      _sum: { amount: true },
    }),
  ])

  const empty: InvestorOverview = {
    hasData: false, asOf: null, asOfComputedAt: null, totalValue: 0, dayPnl: 0, dayPct: 0, mtdPnl: 0,
    mtdPct: 0, ytdPnl: 0, ytdPct: 0, inceptionPnl: 0, inceptionPct: 0, inceptionDate: null,
    grossDeposits: num(deposits._sum.amount ?? 0), series: [], allocation: [],
  }
  if (rows.length === 0) return empty

  // Daily series (portfolio value across funds).
  const byDay = new Map<number, { value: number; pnl: number; opening: number; updatedAt: Date }>()
  for (const r of rows) {
    const t = r.date.getTime()
    const agg = byDay.get(t) ?? { value: 0, pnl: 0, opening: 0, updatedAt: r.updatedAt }
    agg.value += num(r.closingValue)
    agg.pnl += num(r.pnl)
    agg.opening += num(r.openingValue)
    if (r.updatedAt > agg.updatedAt) agg.updatedAt = r.updatedAt
    byDay.set(t, agg)
  }
  const days = [...byDay.entries()].sort((a, b) => a[0] - b[0])
  const series = days.map(([t, d]) => ({ date: new Date(t).toISOString(), value: d.value }))

  const [lastT, last] = days[days.length - 1]
  const lastDate = new Date(lastT)
  const monthStart = Date.UTC(lastDate.getUTCFullYear(), lastDate.getUTCMonth(), 1)

  const mtdDays = days.filter(([t]) => t >= monthStart)
  const mtdPnl = mtdDays.reduce((s, [, d]) => s + d.pnl, 0)
  const mtdBase = mtdDays[0]?.[1].opening ?? 0

  const yearStart = Date.UTC(lastDate.getUTCFullYear(), 0, 1)
  const ytdDays = days.filter(([t]) => t >= yearStart)
  const ytdPnl = ytdDays.reduce((s, [, d]) => s + d.pnl, 0)
  const ytdBase = ytdDays[0]?.[1].opening ?? 0

  const inceptionPnl = days.reduce((s, [, d]) => s + d.pnl, 0)
  const grossDeposits = num(deposits._sum.amount ?? 0)

  // Latest per-fund breakdown.
  const latestRows = rows.filter(r => r.date.getTime() === lastT)
  const perFund = new Map<string, { day: number; mtd: number; ytd: number; inception: number }>()
  for (const r of rows) {
    const agg = perFund.get(r.fundId) ?? { day: 0, mtd: 0, ytd: 0, inception: 0 }
    const pnl = num(r.pnl)
    agg.inception += pnl
    if (r.date.getTime() >= yearStart) agg.ytd += pnl
    if (r.date.getTime() >= monthStart) agg.mtd += pnl
    if (r.date.getTime() === lastT) agg.day += pnl
    perFund.set(r.fundId, agg)
  }
  const allocation = latestRows.map(r => ({
    fundId: r.fundId,
    code: r.fund.code,
    name: r.fund.name,
    currency: r.fund.currency,
    riskLevel: r.fund.riskLevel,
    strategy: r.fund.strategy,
    value: num(r.closingValue),
    pctOfPortfolio: last.value > 0 ? (num(r.closingValue) / last.value) * 100 : 0,
    fundSharePct: num(r.closingSharePct) * 100,
    dayPnl: perFund.get(r.fundId)?.day ?? 0,
    mtdPnl: perFund.get(r.fundId)?.mtd ?? 0,
    ytdPnl: perFund.get(r.fundId)?.ytd ?? 0,
    inceptionPnl: perFund.get(r.fundId)?.inception ?? 0,
  }))

  return {
    hasData: true,
    asOf: lastDate.toISOString(),
    asOfComputedAt: last.updatedAt.toISOString(),
    totalValue: last.value,
    dayPnl: last.pnl,
    dayPct: last.opening > 0 ? (last.pnl / last.opening) * 100 : 0,
    mtdPnl,
    // If the period's first day is also the investor's very first activity
    // day, its opening balance is genuinely $0 (before that day's deposit) —
    // fall back to gross deposits (same as inceptionPct) rather than showing
    // a misleading 0% for exactly the investors this figure matters most for.
    mtdPct: mtdBase > 0 ? (mtdPnl / mtdBase) * 100 : grossDeposits > 0 ? (mtdPnl / grossDeposits) * 100 : 0,
    ytdPnl,
    ytdPct: ytdBase > 0 ? (ytdPnl / ytdBase) * 100 : grossDeposits > 0 ? (ytdPnl / grossDeposits) * 100 : 0,
    inceptionPnl,
    // Investor-level %: total dollar PNL relative to gross deposits (money in).
    inceptionPct: grossDeposits > 0 ? (inceptionPnl / grossDeposits) * 100 : 0,
    inceptionDate: new Date(days[0][0]).toISOString(),
    grossDeposits,
    series,
    allocation,
  }
}

export type ReportData = {
  monthly: {
    month: string // ISO first-of-month
    tradingDays: number
    startValue: number
    endValue: number
    totalPnl: number
    returnPct: number // compounded fund return for the month
    wins: number
    losses: number
  }[]
  daily: { date: string; pnl: number; value: number; changePct: number }[]
  fundReturnPct: number // compounded since inception (8.2 ii)
}

export async function getInvestorReports(investorId: string): Promise<ReportData> {
  const rows = await prisma.investorDailyLedger.findMany({
    where: { investorId },
    orderBy: { date: 'asc' },
  })
  if (rows.length === 0) return { monthly: [], daily: [], fundReturnPct: 0 }

  // Aggregate across funds per day.
  const byDay = new Map<number, { pnl: number; value: number; opening: number }>()
  for (const r of rows) {
    const t = r.date.getTime()
    const agg = byDay.get(t) ?? { pnl: 0, value: 0, opening: 0 }
    agg.pnl += num(r.pnl)
    agg.value += num(r.closingValue)
    agg.opening += num(r.openingValue)
    byDay.set(t, agg)
  }
  const days = [...byDay.entries()].sort((a, b) => a[0] - b[0])

  const daily = days.map(([t, d]) => ({
    date: new Date(t).toISOString(),
    pnl: d.pnl,
    value: d.value,
    changePct: d.opening > 0 ? (d.pnl / d.opening) * 100 : 0,
  }))

  const monthlyMap = new Map<number, typeof days>()
  for (const day of days) {
    const date = new Date(day[0])
    const key = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)
    const list = monthlyMap.get(key) ?? []
    list.push(day)
    monthlyMap.set(key, list)
  }
  const monthly = [...monthlyMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([monthT, monthDays]) => {
      const traded = monthDays.filter(([, d]) => d.pnl !== 0)
      return {
        month: new Date(monthT).toISOString(),
        tradingDays: traded.length,
        startValue: monthDays[0][1].opening,
        endValue: monthDays[monthDays.length - 1][1].value,
        totalPnl: monthDays.reduce((s, [, d]) => s + d.pnl, 0),
        returnPct:
          compoundReturn(monthDays.map(([, d]) => ({ openingBalance: d.opening, pnl: d.pnl }))) * 100,
        wins: traded.filter(([, d]) => d.pnl > 0).length,
        losses: traded.filter(([, d]) => d.pnl < 0).length,
      }
    })

  const fundReturnPct =
    compoundReturn(days.map(([, d]) => ({ openingBalance: d.opening, pnl: d.pnl }))) * 100

  return { monthly, daily, fundReturnPct }
}

export type ActivityItem = {
  id: string
  date: string
  type: 'Deposit' | 'Withdrawal' | 'Daily P&L'
  fund: string
  amount: number
  status: 'Completed' | 'Pending' | 'Approved' | 'Rejected'
}

export async function getInvestorActivity(investorId: string): Promise<ActivityItem[]> {
  const [flows, ledger] = await Promise.all([
    prisma.fundFlow.findMany({ where: { investorId }, include: { fund: true } }),
    prisma.investorDailyLedger.findMany({
      where: { investorId, pnl: { not: 0 } },
      include: { fund: true },
    }),
  ])

  const items: ActivityItem[] = [
    ...flows.map(f => ({
      id: f.id,
      date: f.requestDate.toISOString(),
      type: (f.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal') as ActivityItem['type'],
      fund: f.fund.name,
      amount: f.type === 'DEPOSIT' ? num(f.amount) : -num(f.amount),
      status: (f.status.charAt(0) + f.status.slice(1).toLowerCase()) as ActivityItem['status'],
    })),
    ...ledger.map(r => ({
      id: `pnl-${r.id}`,
      date: r.date.toISOString(),
      type: 'Daily P&L' as const,
      fund: r.fund.name,
      amount: num(r.pnl),
      status: 'Completed' as const,
    })),
  ]
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getInvestorFlows(investorId: string) {
  const flows = await prisma.fundFlow.findMany({
    where: { investorId },
    include: { fund: true },
    orderBy: { requestDate: 'desc' },
  })
  return flows.map(f => ({
    id: f.id,
    type: f.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal',
    amount: num(f.amount),
    currency: f.currency,
    fund: f.fund.name,
    requestDate: f.requestDate.toISOString(),
    processedDate: f.processedDate?.toISOString() ?? null,
    status: f.status.charAt(0) + f.status.slice(1).toLowerCase(),
    note: f.note,
  }))
}

// Months with ledger activity — drives the statements list on Documents.
export async function getStatementMonths(investorId: string) {
  const rows = await prisma.investorDailyLedger.findMany({
    where: { investorId },
    select: { date: true },
    orderBy: { date: 'asc' },
  })
  const months = new Set<number>()
  for (const r of rows) {
    months.add(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), 1))
  }
  return [...months].sort((a, b) => b - a).map(t => new Date(t).toISOString())
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function getFlowsForReview() {
  const flows = await prisma.fundFlow.findMany({
    include: { investor: true, fund: true },
    orderBy: { requestDate: 'desc' },
  })
  return flows.map(f => ({
    id: f.id,
    investorName: f.investor.name,
    investorEmail: f.investor.email,
    fund: f.fund.name,
    type: f.type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal',
    amount: num(f.amount),
    currency: f.currency,
    requestDate: f.requestDate.toISOString(),
    processedDate: f.processedDate?.toISOString() ?? null,
    status: f.status.charAt(0) + f.status.slice(1).toLowerCase(),
    reviewedBy: f.reviewedBy,
    note: f.note,
  }))
}

export async function getInvestorsDirectory() {
  const investors = await prisma.investor.findMany({ orderBy: { onboardingDate: 'asc' } })
  // Latest portfolio value per investor.
  const latest = await prisma.investorDailyLedger.groupBy({
    by: ['investorId'],
    _max: { date: true },
  })
  const values = new Map<string, number>()
  for (const l of latest) {
    if (!l._max.date) continue
    const rows = await prisma.investorDailyLedger.findMany({
      where: { investorId: l.investorId, date: l._max.date },
      select: { closingValue: true },
    })
    values.set(l.investorId, rows.reduce((s, r) => s + num(r.closingValue), 0))
  }
  return investors.map(i => ({
    id: i.id,
    name: i.name,
    email: i.email,
    role: i.role,
    onboardingDate: i.onboardingDate.toISOString(),
    portfolioValue: values.get(i.id) ?? 0,
  }))
}

export async function getImportBatches() {
  const batches = await prisma.importBatch.findMany({ orderBy: { uploadedAt: 'desc' } })
  return batches.map(b => ({
    id: b.id,
    fileName: b.fileName,
    kind: b.kind,
    uploadedBy: b.uploadedBy,
    uploadedAt: b.uploadedAt.toISOString(),
    rowCount: b.rowCount,
    skipped: b.skipped,
    status: b.status,
  }))
}

// ---------------------------------------------------------------------------
// Admin / shared
// ---------------------------------------------------------------------------

export async function getAuditLogs(limit = 100) {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
  return logs.map(l => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    actorEmail: l.actorEmail,
    action: l.action,
    detail: l.detail,
    ip: l.ip,
    success: l.success,
  }))
}

export async function getFundTotals() {
  const funds = await prisma.fund.findMany()
  const totals = []
  for (const fund of funds) {
    const nav = await prisma.fundDailyNav.findMany({
      where: { fundId: fund.id },
      orderBy: { date: 'asc' },
    })
    const latest = nav[nav.length - 1]
    totals.push({
      id: fund.id,
      code: fund.code,
      name: fund.name,
      description: fund.description,
      riskLevel: fund.riskLevel,
      strategy: fund.strategy,
      currency: fund.currency,
      inceptionDate: fund.inceptionDate.toISOString(),
      asOf: latest?.date.toISOString() ?? null,
      asOfComputedAt: latest?.updatedAt.toISOString() ?? null,
      aum: latest ? num(latest.closingBalance) : 0,
      totalPnl: nav.reduce((s, d) => s + num(d.pnl), 0),
      returnPct:
        compoundReturn(nav.map(d => ({ openingBalance: num(d.openingBalance), pnl: num(d.pnl) }))) * 100,
    })
  }
  return totals
}

// Fund-level daily time series (Portfolio Manager performance charts). Signed
// netFlows is split into deposits/withdrawals buckets purely to match the
// shape the UI expects — only the net (deposits - withdrawals) is ever used
// in calculations, and that always equals the original netFlows exactly.
export type FundDailySeriesPoint = {
  date: string // 'D Mon YYYY'
  beginningValue: number
  dailyPnL: number
  deposits: number
  withdrawals: number
}

export async function getFundDailySeries(fundId: string): Promise<FundDailySeriesPoint[]> {
  const nav = await prisma.fundDailyNav.findMany({
    where: { fundId },
    orderBy: { date: 'asc' },
  })
  return nav.map(d => {
    const netFlows = num(d.netFlows)
    return {
      date: fmtDate(d.date),
      beginningValue: num(d.openingBalance),
      dailyPnL: num(d.pnl),
      deposits: netFlows > 0 ? netFlows : 0,
      withdrawals: netFlows < 0 ? -netFlows : 0,
    }
  })
}
