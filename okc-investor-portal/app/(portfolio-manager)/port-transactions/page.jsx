import StatusBadge from '@/components/operations/StatusBadge'
import { getFlowsForReview } from '@/lib/queries'
import { fmtDate, fmtMoney } from '@/lib/format'

// Portfolio Manager oversight view of all fund-flow requests — read-only,
// same underlying data as Admin's Transactions page. Reviews/approvals
// happen in Operations (/ops-transactions).
export const dynamic = 'force-dynamic'

export default async function PortfolioManagerTransactionsPage() {
  const flows = await getFlowsForReview()

  const pending = flows.filter(f => f.status === 'Pending').length
  const approvedDeposits = flows
    .filter(f => f.type === 'Deposit' && (f.status === 'Approved' || f.status === 'Completed'))
    .reduce((s, f) => s + f.amount, 0)
  const approvedWithdrawals = flows
    .filter(f => f.type === 'Withdrawal' && (f.status === 'Approved' || f.status === 'Completed'))
    .reduce((s, f) => s + f.amount, 0)

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Read-only view of all deposit and withdrawal requests, for cash flow monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'PENDING APPROVAL', value: String(pending), red: pending > 0 },
          { label: 'TOTAL REQUESTS', value: String(flows.length), red: false },
          { label: 'APPROVED DEPOSITS', value: fmtMoney(approvedDeposits, { currency: 'SGD ' }), red: false },
          { label: 'APPROVED WITHDRAWALS', value: fmtMoney(approvedWithdrawals, { currency: 'SGD ' }), red: false },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className={`text-2xl font-bold whitespace-nowrap ${s.red ? 'text-red-500' : 'text-gray-900'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['REQUEST', 'INVESTOR', 'FUND', 'TYPE', 'AMOUNT', 'REQUESTED', 'PROCESSED', 'STATUS', 'REVIEWED BY'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flows.map(flow => (
                <tr key={flow.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">
                    {flow.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 min-w-[160px]">
                    <p className="text-sm font-semibold text-gray-900 truncate">{flow.investorName}</p>
                    <p className="text-xs text-gray-400 truncate">{flow.investorEmail}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{flow.fund}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        flow.type === 'Deposit' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'
                      }`}
                    >
                      {flow.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {fmtMoney(flow.amount, { currency: 'SGD ' })}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(flow.requestDate)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{fmtDate(flow.processedDate)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={flow.status} />
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">{flow.reviewedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {flows.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No requests yet.</div>
        )}
      </div>
    </div>
  )
}