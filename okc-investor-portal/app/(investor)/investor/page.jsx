'use client';
import { useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import StatCard from '@/components/dashboard/StatCard';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import HoldingsTable from '@/components/dashboard/HoldingsTable';

const filters = ['1W', '1M', '3M', 'YTD', '1Y', 'All'];

const txnFilters = ['All', 'Daily P&L', 'Deposit', 'Withdrawal'];

const activityStatusStyle = {
  Completed: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Rejected: 'bg-red-50 text-red-500',
};

const parseTxnAmount = (str) => parseFloat(str.replace(/[+$–,\s]/g, '').replace('$', '')) || 0;
const parseTxnDate = (str) => new Date(Date.parse(str)) || new Date(0);

const formatCurrency = (value, includeSign = true) => {
  const absValue = Math.abs(value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!includeSign) return `$${absValue}`;
  return value >= 0 ? `+$${absValue}` : `-$${absValue}`;
};

const formatPercent = (value) => {
  const absValue = Math.abs(value).toFixed(2);
  return value >= 0 ? `+${absValue}%` : `-${absValue}%`;
};

export default function InvestorDashboard({
  initialStats = [
    { label: 'TOTAL PORTFOLIO VALUE', value: '$34,061.15', sub: '-$1.20 today', positive: false },
    { label: 'DAY P&L · 8 APR 2026', value: '-$1.20', sub: '-0.00%', positive: false },
    { label: 'APRIL 2026 MTD', value: '-$9,381.31', sub: '-21.89% MTD', positive: false },
    { label: 'SINCE INCEPTION · 17 MAR 2026', value: '-31.88%', sub: '-$15,938.85', positive: false },
  ],
  initialAllocation = [
    { name: 'XAUUSD Fund', amount: 'SGD 34,061.15', pct: '100%', color: 'bg-blue-600' },
  ],
  allChartData = [
    { date: '17 Mar', fullDate: new Date('2026-03-17'), value: 48489.37 },
    { date: '18 Mar', fullDate: new Date('2026-03-18'), value: 47982.17 },
    { date: '19 Mar', fullDate: new Date('2026-03-19'), value: 48826.54 },
    { date: '20 Mar', fullDate: new Date('2026-03-20'), value: 46896.10 },
    { date: '23 Mar', fullDate: new Date('2026-03-23'), value: 46172.83 },
    { date: '24 Mar', fullDate: new Date('2026-03-24'), value: 46398.00 },
    { date: '25 Mar', fullDate: new Date('2026-03-25'), value: 45106.64 },
    { date: '26 Mar', fullDate: new Date('2026-03-26'), value: 46075.11 },
    { date: '27 Mar', fullDate: new Date('2026-03-27'), value: 46920.30 },
    { date: '30 Mar', fullDate: new Date('2026-03-30'), value: 45502.49 },
    { date: '31 Mar', fullDate: new Date('2026-03-31'), value: 43442.46 },
    { date: '1 Apr', fullDate: new Date('2026-04-01'), value: 42007.73 },
    { date: '2 Apr', fullDate: new Date('2026-04-02'), value: 34853.08 },
    { date: '6 Apr', fullDate: new Date('2026-04-06'), value: 34726.22 },
    { date: '7 Apr', fullDate: new Date('2026-04-07'), value: 34062.35 },
    { date: '8 Apr', fullDate: new Date('2026-04-08'), value: 34061.15 },
  ],
  initialHoldings = [
    {
      fund: 'OKC XAUUSD Fund',
      tag: 'Gold (XAU/USD) · Active trading strategy',
      marketValue: '$34,061.15',
      dayPnl: '-$1.20',
      dayPct: '-0.00%',
      mtd: '-$9,381.31',
      ytd: '-31.88%',
      inception: '-$15,938.85',
      share: '100%',
      positive: false,
    },
  ],
  initialActivities = [
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
    { id: 'TXN-030', date: '24 Apr 2026', type: 'Daily P&L', fund: 'OKC XAUUSD Fund', amount: '-$1.20', status: 'Completed', positive: false },
  ],
  initialMonthlyData = [
    { month: 'March 2026', tradingDays: 9, totalPnl: -6557.54, startValue: 50000.00, endValue: 43442.46, return: -13.12, wins: 8, losses: 13, trades: 21 },
    { month: 'April 2026', tradingDays: 7, totalPnl: -9381.31, startValue: 43442.46, endValue: 34061.15, return: -21.59, wins: 4, losses: 11, trades: 15 },
  ],
  initialDailyData = [
    { date: '17 Mar 2026', pnl: -1510.63, value: 48489.37, trades: 4 },
    { date: '18 Mar 2026', pnl: -507.20, value: 47982.17, trades: 2 },
    { date: '19 Mar 2026', pnl: 844.37, value: 48826.54, trades: 3 },
    { date: '20 Mar 2026', pnl: -1930.44, value: 46896.10, trades: 4 },
    { date: '23 Mar 2026', pnl: -723.27, value: 46172.83, trades: 3 },
    { date: '24 Mar 2026', pnl: 225.17, value: 46398.00, trades: 2 },
    { date: '25 Mar 2026', pnl: -1291.36, value: 45106.64, trades: 3 },
    { date: '26 Mar 2026', pnl: 968.47, value: 46075.11, trades: 3 },
    { date: '27 Mar 2026', pnl: 845.19, value: 46920.30, trades: 2 },
    { date: '30 Mar 2026', pnl: -1417.81, value: 45502.49, trades: 3 },
    { date: '31 Mar 2026', pnl: -2060.03, value: 43442.46, trades: 3 },
    { date: '1 Apr 2026', pnl: -1434.73, value: 42007.73, trades: 3 },
    { date: '2 Apr 2026', pnl: -7154.65, value: 34853.08, trades: 4 },
    { date: '6 Apr 2026', pnl: -3110.50, value: 34726.22, trades: 2 },
    { date: '7 Apr 2026', pnl: -1420.20, value: 34062.35, trades: 3 },
    { date: '8 Apr 2026', pnl: -1.20, value: 34061.15, trades: 1 },
  ],
}) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [txnFilter, setTxnFilter] = useState('All');
  const [txnSortBy, setTxnSortBy] = useState('date-desc');
  const [reportTab, setReportTab] = useState('Monthly');

  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

  const filteredAllocation = useMemo(() => {
    if (!searchQuery) return initialAllocation;
    return initialAllocation.filter(fund =>
      fund.name.toLowerCase().includes(searchQuery)
    );
  }, [searchQuery, initialAllocation]);

  const filteredHoldings = useMemo(() => {
    if (!searchQuery) return initialHoldings;
    return initialHoldings.filter(h =>
      h.fund.toLowerCase().includes(searchQuery)
    );
  }, [searchQuery, initialHoldings]);

  const filteredChartData = useMemo(() => {
    const latest = new Date('2026-04-08');
    const cutoffs = {
      '1W': new Date(latest.getTime() - 7 * 24 * 60 * 60 * 1000),
      '1M': new Date(latest.getTime() - 30 * 24 * 60 * 60 * 1000),
      '3M': new Date(latest.getTime() - 90 * 24 * 60 * 60 * 1000),
      'YTD': new Date('2026-01-01'),
      '1Y': new Date(latest.getTime() - 365 * 24 * 60 * 60 * 1000),
      'All': new Date('2000-01-01'),
    };
    const cutoff = cutoffs[activeFilter];
    return allChartData.filter(d => d.fullDate >= cutoff);
  }, [activeFilter, allChartData]);

  const processedActivities = useMemo(() => {
    let result = txnFilter === 'All'
      ? [...initialActivities]
      : initialActivities.filter(a => a.type === txnFilter);

    return result.sort((a, b) => {
      switch (txnSortBy) {
        case 'date-desc': return parseTxnDate(b.date) - parseTxnDate(a.date);
        case 'date-asc': return parseTxnDate(a.date) - parseTxnDate(b.date);
        case 'amount-desc': return parseTxnAmount(b.amount) - parseTxnAmount(a.amount);
        case 'amount-asc': return parseTxnAmount(a.amount) - parseTxnAmount(b.amount);
        case 'fund-az': return a.fund.localeCompare(b.fund);
        case 'fund-za': return b.fund.localeCompare(a.fund);
        default: return 0;
      }
    });
  }, [txnFilter, txnSortBy, initialActivities]);

  const totalMonthlyPnl = useMemo(
    () => initialMonthlyData.reduce((acc, current) => acc + current.totalPnl, 0),
    [initialMonthlyData]
  );

  const totalDisplayValue = initialStats[0]?.value || 'SGD 0.00';
  const inceptionPctStr = initialStats[3]?.value || '0.00%';

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-gray-500 text-sm mb-1">Good morning, <b>Faye</b>!</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Portfolio Summary</h1>
          <span className="self-start sm:self-auto text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            NAV as of 8 Apr 2026 · 19:00 SGT
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {initialStats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Chart + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">PORTFOLIO VALUE</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold text-gray-900">{totalDisplayValue}</span>
              <span className="text-red-500 font-medium text-sm whitespace-nowrap">
                {inceptionPctStr} since inception
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full sm:overflow-visible">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                    activeFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <PortfolioChart data={filteredChartData} />
        </div>

        {/* Allocation Donut Layout */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col h-full">
          <p className="text-xs text-gray-400 font-medium tracking-wide mb-4">ALLOCATION ACROSS FUNDS</p>
          <div className="flex flex-col items-center flex-1 justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                {(() => {
                  const colorMap = {
                    'bg-blue-600': '#2563eb',
                    'bg-blue-400': '#60a5fa',
                    'bg-blue-200': '#bfdbfe',
                  };
                  return filteredAllocation.map((fund, i) => {
                    const rawPct = parseFloat(fund.pct);
                    const strokeDash = rawPct;
                    const accumulatedPercentage = filteredAllocation
                      .slice(0, i)
                      .reduce((sum, item) => sum + parseFloat(item.pct), 0);
                    const strokeOffset = 100 - accumulatedPercentage;
                    return (
                      <circle
                        key={i}
                        cx="21"
                        cy="21"
                        r="15.915"
                        fill="transparent"
                        stroke={colorMap[fund.color] || '#cbd5e1'}
                        strokeWidth="4"
                        strokeDasharray={`${strokeDash} ${100 - strokeDash}`}
                        strokeDashoffset={strokeOffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute text-center">
                <p className="text-xs text-gray-400">TOTAL</p>
                <p className="text-lg font-bold text-gray-900">
                  {filteredAllocation.length > 0 ? '$34K' : '$0'}
                </p>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              {filteredAllocation.map((fund, i) => (
                <div key={i} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${fund.color} shrink-0`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{fund.name}</p>
                      <p className="text-sm text-gray-400">{fund.amount}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{fund.pct}</span>
                </div>
              ))}
              {filteredAllocation.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No matching asset allocations</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">YOUR FUND</p>
            <h2 className="text-lg font-bold text-gray-900">Holdings & returns</h2>
          </div>
          <div className="flex gap-3">
            <button className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap">
              Download statement
            </button>
            <button
              onClick={() => router.push('/request-transaction')}
              className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              Request transaction
            </button>
          </div>
        </div>
        <HoldingsTable data={filteredHoldings} />
      </div>

      {/* Performance Reports */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">PERFORMANCE</p>
            <h2 className="text-lg font-bold text-gray-900">Monthly & daily reports</h2>
          </div>
          <div className="flex gap-2">
            {['Monthly', 'Daily'].map(tab => (
              <button
                key={tab}
                onClick={() => setReportTab(tab)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  reportTab === tab ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {reportTab === 'Monthly' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['MONTH', 'TRADING DAYS', 'START VALUE', 'END VALUE', 'P&L (SGD)', 'RETURN', 'TRADES', 'WIN RATE'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {initialMonthlyData.map((row, i) => {
                  const winRate = row.trades > 0 ? ((row.wins / row.trades) * 100).toFixed(0) : '0';
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.tradingDays}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(row.startValue, false)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(row.endValue, false)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${row.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(row.totalPnl)}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${row.return >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(row.return)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.trades}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{winRate}%</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap" colSpan={4}>Total P&L</td>
                  <td className={`px-4 py-3 text-sm font-bold whitespace-nowrap ${totalMonthlyPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatCurrency(totalMonthlyPnl)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {reportTab === 'Daily' && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['DATE', 'DAILY P&L', 'PORTFOLIO VALUE', 'CHANGE', 'TRADES'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {initialDailyData.map((row, i) => {
                  const prevValue = i === 0 ? 50000 : initialDailyData[i - 1].value;
                  const changePct = prevValue !== 0 ? (row.pnl / prevValue) * 100 : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.date}</td>
                      <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${row.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(row.pnl)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 font-medium whitespace-nowrap">{formatCurrency(row.value, false)}</td>
                      <td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${changePct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(changePct)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.trades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">TRANSACTIONS</p>
              <h2 className="text-lg font-bold text-gray-900">Activity</h2>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <label htmlFor="txnSortBy" className="text-xs font-semibold text-gray-400 tracking-wider uppercase whitespace-nowrap">
                Sort By:
              </label>
              <select
                id="txnSortBy"
                value={txnSortBy}
                onChange={(e) => setTxnSortBy(e.target.value)}
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
          <div className="flex flex-wrap gap-2 mt-4">
            {txnFilters.map(f => (
              <button
                key={f}
                onClick={() => setTxnFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                  txnFilter === f
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['DATE', 'TRANSACTION ID', 'TYPE', 'FUND', 'AMOUNT', 'STATUS'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-3 tracking-wider">
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${activityStatusStyle[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {processedActivities.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            No transactions found matching the selected parameters.
          </div>
        )}
      </div>
    </div>
  );
}