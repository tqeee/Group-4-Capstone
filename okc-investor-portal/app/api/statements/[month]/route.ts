import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getInvestorByAuth } from '@/lib/queries'
import { audit } from '@/lib/audit'

// GET /api/statements/2026-03 — the signed-in investor's account statement for
// that month, generated from the daily ledger (§8.1 workings) as CSV.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ month: string }> }
) {
  const { month } = await params
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return new Response('Invalid month, expected YYYY-MM', { status: 400 })
  }

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return new Response('Unauthorized', { status: 401 })

  const investor = await getInvestorByAuth(claims.sub, claims.email ?? null)
  if (!investor) return new Response('No investor profile', { status: 404 })

  const [year, monthNum] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, monthNum - 1, 1))
  const end = new Date(Date.UTC(year, monthNum, 1))

  const rows = await prisma.investorDailyLedger.findMany({
    where: { investorId: investor.id, date: { gte: start, lt: end } },
    include: { fund: true },
    orderBy: { date: 'asc' },
  })
  if (rows.length === 0) return new Response('No activity in this month', { status: 404 })

  // The per-day `flows` column was dropped from investor_daily_ledger, so
  // reconstruct each (fund, day)'s net deposits/withdrawals from the processed
  // FundFlow records — the same source rebuildFundLedger used to populate it.
  const flowRows = await prisma.fundFlow.findMany({
    where: {
      investorId: investor.id,
      status: { in: ['APPROVED', 'COMPLETED'] },
      processedDate: { gte: start, lt: end },
    },
    select: { fundId: true, type: true, amount: true, processedDate: true },
  })
  const flowByKey = new Map<string, number>()
  for (const f of flowRows) {
    if (!f.processedDate) continue
    const key = `${f.fundId}|${f.processedDate.toISOString().slice(0, 10)}`
    const signed = f.type === 'DEPOSIT' ? Number(f.amount) : -Number(f.amount)
    flowByKey.set(key, (flowByKey.get(key) ?? 0) + signed)
  }
  const flowFor = (fundId: string, date: Date) =>
    flowByKey.get(`${fundId}|${date.toISOString().slice(0, 10)}`) ?? 0

  const esc = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`
  const lines = [
    ['OKC Investor Portal — Account Statement'],
    [`Investor:`, investor.name, investor.email],
    [`Period:`, month],
    [`Generated:`, new Date().toISOString()],
    [],
    ['Date', 'Fund', 'Opening Value', 'Daily P&L', 'Deposits/Withdrawals', 'Closing Value', 'Fund Share %'],
    ...rows.map(r => [
      r.date.toISOString().slice(0, 10),
      r.fund.name,
      Number(r.openingValue).toFixed(2),
      Number(r.pnl).toFixed(2),
      flowFor(r.fundId, r.date).toFixed(2),
      Number(r.closingValue).toFixed(2),
      (Number(r.closingSharePct) * 100).toFixed(4),
    ]),
    [],
    [
      'Totals',
      '',
      Number(rows[0].openingValue).toFixed(2),
      rows.reduce((s, r) => s + Number(r.pnl), 0).toFixed(2),
      rows.reduce((s, r) => s + flowFor(r.fundId, r.date), 0).toFixed(2),
      Number(rows[rows.length - 1].closingValue).toFixed(2),
      '',
    ],
  ]
  const csv = lines.map(l => l.map(esc).join(',')).join('\r\n') + '\r\n'

  await audit('STATEMENT_DOWNLOADED', { actor: investor.email, detail: month })

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="okc-statement-${month}.csv"`,
    },
  })
}
