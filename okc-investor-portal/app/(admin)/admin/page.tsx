import Link from 'next/link'
import { getAuditLogs, getFlowsForReview, getFundTotals, getInvestorsDirectory } from '@/lib/queries'
import { fmtDate, fmtMoney, fmtPct } from '@/lib/format'

function timeLabel(iso: string): string {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function AdminOverview() {
  const [funds, directory, flows, logs] = await Promise.all([
    getFundTotals(),
    getInvestorsDirectory(),
    getFlowsForReview(),
    getAuditLogs(6),
  ])

  const investors = directory.filter(i => i.role === 'INVESTOR')
  const aum = funds.reduce((s, f) => s + f.aum, 0)
  const totalPnl = funds.reduce((s, f) => s + f.totalPnl, 0)
  const pending = flows.filter(f => f.status === 'Pending Transaction' || f.status === 'Pending Receipt')
  const pendingDeposits = pending.filter(f => f.type === 'Deposit').length
  const asOf = funds[0]?.asOf ?? null

  const stats = [
    {
      label: 'TOTAL INVESTORS',
      value: String(investors.length),
      sub: `${investors.filter(i => i.portfolioValue > 0).length} with holdings`,
      red: false,
    },
    { label: 'TOTAL AUM', value: fmtMoney(aum, { currency: 'SGD ' }), sub: 'Across all funds', red: false },
    {
      label: 'TOTAL P&L (ALL)',
      value: fmtMoney(totalPnl, { sign: true }),
      sub: funds[0] ? `${fmtPct(funds[0].returnPct)} since inception` : '—',
      red: totalPnl < 0,
    },
    {
      label: 'PENDING REQUESTS',
      value: String(pending.length),
      sub: `${pendingDeposits} deposit · ${pending.length - pendingDeposits} withdrawal`,
      red: false,
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <p className="text-gray-500 text-sm mb-1">Welcome back</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
          <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            NAV as of {asOf ? fmtDate(asOf) : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0 break-words">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{stat.label}</p>
            <p className={`text-xl md:text-2xl font-bold mb-1 ${stat.red ? 'text-red-500' : 'text-gray-900'}`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 min-w-0">
          <div className="flex items-end justify-between mb-4 gap-2">
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-3">ALL INVESTORS</p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Portfolio overview</h2>
            </div>
            <Link href="/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium pb-0.5 whitespace-nowrap">
              Manage users →
            </Link>
          </div>

          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['INVESTOR', 'ONBOARDED', 'PORTFOLIO VALUE', 'STATUS'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3 pr-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investors.map(inv => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {inv.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{inv.name}</p>
                          <p className="text-xs text-gray-400">{inv.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(inv.onboardingDate)}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {fmtMoney(inv.portfolioValue)}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                          inv.portfolioValue > 0 ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                        }`}
                      >
                        {inv.portfolioValue > 0 ? 'Active' : 'Onboarded'}
                      </span>
                    </td>
                  </tr>
                ))}
                {investors.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-400">
                      No investors yet — invite one from the Users page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-end justify-between mb-4 gap-2">
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-3">SYSTEM</p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Recent activity</h2>
            </div>
            <Link href="/audit-logs" className="text-sm text-blue-600 hover:text-blue-700 font-medium pb-0.5 whitespace-nowrap">
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {logs.map(item => (
              <div key={item.id} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.success ? 'bg-green-500' : 'bg-red-400'}`}></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.actorEmail ?? '(unknown)'}</p>
                  <p className="text-xs text-gray-400 leading-relaxed break-words">
                    {item.action}
                    {item.detail ? ` — ${item.detail}` : ''}
                  </p>
                  <p className="text-xs text-gray-300 mt-0.5">{timeLabel(item.createdAt)}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-sm text-gray-400">No activity recorded yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
