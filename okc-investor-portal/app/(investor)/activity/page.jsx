'use client';
import { useState, useMemo } from 'react';

const activities = [
  { id: 'TXN-001', date: '17 Mar 2026', type: 'Deposit', fund: 'OKC XAUUSD Fund', amount: '+$50,000.00', status: 'Completed', positive: true },
  { id: 'TXN-002', date: '18 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$1,120.50', status: 'Completed', positive: true },
  { id: 'TXN-003', date: '19 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$845.20', status: 'Completed', positive: true },
  { id: 'TXN-004', date: '20 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$430.10', status: 'Completed', positive: false },
  { id: 'TXN-005', date: '23 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$1,450.00', status: 'Completed', positive: true },
  { id: 'TXN-006', date: '24 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$910.60', status: 'Completed', positive: false },
  { id: 'TXN-007', date: '25 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$320.40', status: 'Completed', positive: true },
  { id: 'TXN-008', date: '26 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1,150.00', status: 'Completed', positive: false },
  { id: 'TXN-009', date: '27 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$610.80', status: 'Completed', positive: true },
  { id: 'TXN-010', date: '30 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1,840.50', status: 'Completed', positive: false },
  { id: 'TXN-011', date: '31 Mar 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$2,110.00', status: 'Completed', positive: true },
  { id: 'TXN-012', date: '01 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$2,450.00', status: 'Completed', positive: false },
  { id: 'TXN-013', date: '02 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1,920.40', status: 'Completed', positive: false },
  { id: 'TXN-014', date: '03 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$840.10', status: 'Completed', positive: true },
  { id: 'TXN-015', date: '06 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$3,110.50', status: 'Completed', positive: false },
  { id: 'TXN-016', date: '07 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1,420.20', status: 'Completed', positive: false },
  { id: 'TXN-017', date: '08 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$950.60', status: 'Completed', positive: true },
  { id: 'TXN-018', date: '09 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$2,140.80', status: 'Completed', positive: false },
  { id: 'TXN-019', date: '10 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$1,180.30', status: 'Completed', positive: true },
  { id: 'TXN-020', date: '13 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$4,210.60', status: 'Completed', positive: false },
  { id: 'TXN-021', date: '14 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$2,890.20', status: 'Completed', positive: true },
  { id: 'TXN-022', date: '15 Apr 2026', type: 'Withdrawal', fund: 'OKC XAUUSD Fund', amount: '-$10,000.00', status: 'Completed', positive: false },
  { id: 'TXN-023', date: '15 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$350.00', status: 'Completed', positive: false },
  { id: 'TXN-024', date: '16 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$1,680.40', status: 'Completed', positive: true },
  { id: 'TXN-025', date: '17 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1,120.70', status: 'Completed', positive: false },
  { id: 'TXN-026', date: '20 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$540.30', status: 'Completed', positive: true },
  { id: 'TXN-027', date: '21 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$2,380.00', status: 'Completed', positive: false },
  { id: 'TXN-028', date: '22 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '+$1,420.50', status: 'Completed', positive: true },
  { id: 'TXN-029', date: '23 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$890.20', status: 'Completed', positive: false },
  { id: 'TXN-030', date: '24 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1.20', status: 'Completed', positive: false }
];

const filters = ['All', 'Daily P&L', 'Deposit', 'Withdrawal'];

const statusStyle = {
  Completed: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Rejected: 'bg-red-50 text-red-500',
};

// Helper sorting conversion hooks
const parseAmount = (str) => parseFloat(str.replace(/[+$–,\s]/g, '').replace('$', '')) || 0;
const parseDate = (str) => new Date(Date.parse(str)) || new Date(0);

export default function ActivityPage() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  // Unified computation block tracking filters and sort rules cleanly
  const processedActivities = useMemo(() => {
    let result = activeFilter === 'All'
      ? [...activities]
      : activities.filter(a => a.type === activeFilter);

    return result.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return parseDate(b.date) - parseDate(a.date);
        case 'date-asc':
          return parseDate(a.date) - parseDate(b.date);
        case 'amount-desc':
          return parseAmount(b.amount) - parseAmount(a.amount);
        case 'amount-asc':
          return parseAmount(a.amount) - parseAmount(b.amount);
        case 'fund-az':
          return a.fund.localeCompare(b.fund);
        case 'fund-za':
          return b.fund.localeCompare(a.fund);
        default:
          return 0;
      }
    });
  }, [activeFilter, sortBy]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-400 text-sm mt-1">All transactions and daily P&L updates across your funds.</p>
      </div>

      {/* Toolbar Options Menu Grid */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeFilter === f
                  ? 'bg-blue-700 text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Sort Layout Dropdown Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="sortBy" className="text-xs font-semibold text-gray-400 tracking-wider uppercase whitespace-nowrap">
            Sort By:
          </label>
          <select
            id="sortBy"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
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

      {/* Activity Table Container with horizontal overflow handler */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="w-full overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['DATE', 'TRANSACTION ID', 'TYPE', 'FUND', 'AMOUNT', 'STATUS'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {processedActivities.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/80 transition">
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{item.date}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-400 whitespace-nowrap">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      item.type === 'Deposit' ? 'bg-blue-50 text-blue-600'
                      : item.type === 'Withdrawal' ? 'bg-orange-50 text-orange-500'
                      : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{item.fund}</td>
                  <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${item.positive ? 'text-green-600' : 'text-red-500'}`}>
                    {item.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty state view block handler */}
        {processedActivities.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            No transactions found matching the selected parameters.
          </div>
        )}
      </div>
    </div>
  );
}