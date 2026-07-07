import Link from 'next/link'
import StatusBadge from '@/components/operations/StatusBadge'
import { getFlowsForReview, getFundTotals, getImportBatches, getInvestorsDirectory } from '@/lib/queries'
import { fmtDate, fmtMoney, fmtPct } from '@/lib/format'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OperationsDashboardPage() {
  const [flows, funds, batches, directory] = await Promise.all([
    getFlowsForReview(),
    getFundTotals(),
    getImportBatches(),
    getInvestorsDirectory(),
  ])

  const pending = flows.filter(f => f.status === 'Pending')
  const investors = directory.filter(i => i.role === 'INVESTOR')
  const aum = funds.reduce((s, f) => s + f.aum, 0)
  const asOf = funds[0]?.asOf ?? null
  const recentFlows = flows.slice(0, 6)

  const metrics = [
    {
      label: 'Pending Transaction Reviews',
      value: String(pending.length),
      helper: `${fmtMoney(pending.reduce((s, f) => s + f.amount, 0))} awaiting review`,
      tone: 'bg-amber-100 text-amber-700',
    },
    {
      label: 'Assets Under Management',
      value: fmtMoney(aum),
      helper: funds[0] ? `${fmtPct(funds[0].returnPct)} since inception` : '—',
      tone: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Active Investors',
      value: String(investors.length),
      helper: `${investors.filter(i => i.portfolioValue > 0).length} with holdings`,
      tone: 'bg-violet-100 text-violet-700',
    },
    {
      label: 'Data Imports',
      value: String(batches.length),
      helper: batches[0] ? `Last: ${fmtDate(batches[0].uploadedAt)}` : 'No imports yet',
      tone: 'bg-emerald-100 text-emerald-700',
    },
  ]

  const queueItems = [
    {
      label: 'Transaction Reviews',
      description: 'Deposits and withdrawals awaiting review',
      value: String(pending.length),
      tone: 'bg-blue-100 text-blue-700',
      href: '/ops-transactions',
    },
    {
      label: 'Data Import',
      description: 'Upload the latest broker deal export',
      value: String(batches.length),
      tone: 'bg-emerald-100 text-emerald-700',
      href: '/data-import',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">Welcome back, Operations team!</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Operations Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Monitor operational activities and manage requests efficiently.
          </p>
        </div>
        <div className="self-start rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          NAV as of {asOf ? fmtDate(asOf) : '—'} · 19:00 SGT
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map(metric => (
          <div key={metric.label} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-full ${metric.tone}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 002-2V7.5A2.5 2.5 0 0016.5 5h-9A2.5 2.5 0 005 7.5V19a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-950">{metric.value}</p>
            <p className="mt-2 text-sm font-medium text-gray-400">{metric.helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Fund Overview</h2>
          <div className="mt-5 space-y-4">
            {funds.map(fund => (
              <div key={fund.id} className="rounded-lg border border-gray-100 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-gray-950">{fund.name}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Inception {fmtDate(fund.inceptionDate)} · {fund.currency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-950">{fmtMoney(fund.aum)}</p>
                    <p className={`text-sm font-semibold ${fund.returnPct >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmtPct(fund.returnPct)} since inception
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Total P&L</p>
                    <p className={`font-semibold ${fund.totalPnl >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {fmtMoney(fund.totalPnl, { sign: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">NAV as of</p>
                    <p className="font-semibold text-gray-700">{fund.asOf ? fmtDate(fund.asOf) : '—'}</p>
                  </div>
                </div>
              </div>
            ))}
            {funds.length === 0 && <p className="py-6 text-center text-sm text-gray-400">No funds configured.</p>}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Operational Queue</h2>
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {queueItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-4 p-5 transition hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.tone}`}>
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 002-2V7.5A2.5 2.5 0 0016.5 5h-9A2.5 2.5 0 005 7.5V19a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-bold text-gray-950">{item.label}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <span className={`rounded-lg px-3 py-2 text-lg font-bold ${item.tone}`}>{item.value}</span>
                  <span className="text-2xl text-gray-400">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-950">Recent Fund Flow Requests</h2>
          <Link
            href="/ops-transactions"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View All
          </Link>
        </div>

        <div className="mt-5 overflow-x-auto rounded-lg border border-gray-100">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Investor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Handled By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentFlows.map(flow => (
                <tr key={flow.id} className="transition hover:bg-gray-50">
                  <td className="px-4 py-4 font-mono text-xs text-gray-500">{flow.id.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-950">{flow.investorName}</p>
                    <p className="mt-0.5 text-xs font-medium text-gray-400">{flow.investorEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{flow.type}</td>
                  <td className={`px-4 py-4 font-bold ${flow.type === 'Deposit' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtMoney(flow.amount)}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{fmtDate(flow.requestDate)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={flow.status} />
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-600">{flow.reviewedBy ?? '—'}</td>
                </tr>
              ))}
              {recentFlows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">
                    No fund flow requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
