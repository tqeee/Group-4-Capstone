'use client';
import { useState, useMemo } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';

const filters = ['All', 'Daily P&L', 'Deposit', 'Withdrawal'];

const statusStyle = {
  Completed: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Approved: 'bg-blue-50 text-blue-600',
  Rejected: 'bg-red-50 text-red-500',
};

export default function ActivityClient({ items }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  const processed = useMemo(() => {
    const result = activeFilter === 'All' ? [...items] : items.filter(a => a.type === activeFilter);

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return b.date.localeCompare(a.date);
        case 'date-asc':
          return a.date.localeCompare(b.date);
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'fund-az':
          return a.fund.localeCompare(b.fund);
        case 'fund-za':
          return b.fund.localeCompare(a.fund);
        default:
          return 0;
      }
    });
  }, [items, activeFilter, sortBy]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Activity</h1>
        <p className="page-subtitle">All transactions and daily P&L updates across your funds.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`pill whitespace-nowrap ${activeFilter === f ? 'pill-active' : 'pill-inactive'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="sortBy" className="text-xs font-semibold text-gray-400 tracking-wider uppercase whitespace-nowrap">
            Sort By:
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="date-desc">Recent Date</option>
            <option value="date-asc">Oldest Date</option>
            <option value="amount-desc">Amount: High to Low</option>
            <option value="amount-asc">Amount: Low to High</option>
            <option value="fund-az">Fund Name: A to Z</option>
            <option value="fund-za">Fund Name: Z to A</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['DATE', 'REFERENCE', 'TYPE', 'FUND', 'AMOUNT', 'STATUS'].map(h => (
                  <th key={h} className="table-header-cell tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processed.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition">
                  <td className="table-cell text-gray-500">{fmtDate(item.date)}</td>
                  <td className="table-cell font-mono text-gray-400 text-xs">
                    {item.id.startsWith('pnl-') ? '—' : item.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`badge ${
                        item.type === 'Deposit'
                          ? 'bg-blue-50 text-blue-600'
                          : item.type === 'Withdrawal'
                            ? 'bg-orange-50 text-orange-500'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {item.type}
                    </span>
                  </td>
                  <td className="table-cell text-gray-700">{item.fund}</td>
                  <td className={`table-cell font-semibold ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtMoney(item.amount, { sign: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`badge ${statusStyle[item.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {processed.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            No transactions found matching the selected parameters.
          </div>
        )}
      </div>
    </div>
  );
}
