import StatusPill from '../port-components/StatusPill';
import { getTransactions } from '../port-services/portfolioService';

export default function PortfolioManagerTransactionsPage() {
  const transactions = getTransactions();

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">Portfolio Manager</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Transactions</h1>
          <p className="text-sm text-gray-500 mt-2">Read-only deposits and withdrawals used to understand portfolio cash flows.</p>
        </div>
        <span className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-4 py-2">Read-only view</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <p className="text-xs text-gray-400 font-semibold tracking-wide">CASH FLOW LEDGER</p>
        <h2 className="text-lg font-bold text-gray-900 mt-2 mb-5">Deposits and withdrawals</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Investor</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => (
              <tr key={transaction.reference} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition">
                <td className="px-4 py-4 font-semibold text-gray-900">{transaction.reference}</td>
                <td className="px-4 py-4 text-gray-500">{transaction.date}</td>
                <td className="px-4 py-4 text-gray-700">{transaction.investor}</td>
                <td className="px-4 py-4 text-gray-700">{transaction.type}</td>
                <td className="px-4 py-4 font-semibold text-gray-900">{transaction.amount}</td>
                <td className="px-4 py-4">
                  <StatusPill status={transaction.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}