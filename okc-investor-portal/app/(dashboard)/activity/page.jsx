'use client';
import { useState } from 'react';

const activities = [
  { id: 'TXN-001', date: '12 May 2026', type: 'P&L Update', fund: 'OKC Global Equity', amount: '+$3,446.00', status: 'Completed', positive: true },
  { id: 'TXN-002', date: '12 May 2026', type: 'P&L Update', fund: 'OKC Asia Balanced', amount: '+$305.00', status: 'Completed', positive: true },
  { id: 'TXN-003', date: '12 May 2026', type: 'P&L Update', fund: 'OKC Fixed Income', amount: '-$256.00', status: 'Completed', positive: false },
  { id: 'TXN-004', date: '01 May 2026', type: 'Deposit', fund: 'OKC Global Equity', amount: '+$50,000.00', status: 'Completed', positive: true },
  { id: 'TXN-005', date: '15 Apr 2026', type: 'Withdrawal', fund: 'OKC Fixed Income', amount: '-$20,000.00', status: 'Completed', positive: false },
  { id: 'TXN-006', date: '10 Apr 2026', type: 'Deposit', fund: 'OKC Asia Balanced', amount: '+$30,000.00', status: 'Pending', positive: true },
  { id: 'TXN-007', date: '01 Apr 2026', type: 'P&L Update', fund: 'OKC Global Equity', amount: '+$2,890.00', status: 'Completed', positive: true },
  { id: 'TXN-008', date: '28 Mar 2026', type: 'Withdrawal', fund: 'OKC Global Equity', amount: '-$25,000.00', status: 'Rejected', positive: false },
];

const filters = ['All', 'P&L Update', 'Deposit', 'Withdrawal'];

const statusStyle = {
  Completed: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Rejected: 'bg-red-50 text-red-500',
};

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? activities
    : activities.filter(a => a.type === activeFilter);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-400 text-sm mt-1">All transactions and daily P&L updates across your funds.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              activeFilter === f
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['DATE', 'TRANSACTION ID', 'TYPE', 'FUND', 'AMOUNT', 'STATUS'].map(h => (
                <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                <td className="px-6 py-4 text-sm text-gray-500">{item.date}</td>
                <td className="px-6 py-4 text-sm font-mono text-gray-400">{item.id}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    item.type === 'Deposit' ? 'bg-blue-50 text-blue-600'
                    : item.type === 'Withdrawal' ? 'bg-orange-50 text-orange-500'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-700">{item.fund}</td>
                <td className={`px-6 py-4 text-sm font-semibold ${item.positive ? 'text-green-600' : 'text-red-500'}`}>
                  {item.amount}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[item.status]}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            No transactions found.
          </div>
        )}
      </div>
    </div>
  );
}