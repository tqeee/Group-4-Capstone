'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import StatCard from '@/components/dashboard/StatCard';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import HoldingsTable from '@/components/dashboard/HoldingsTable';

// Real data from dataset 5.4
const stats = [
  { label: 'TOTAL PORTFOLIO VALUE', value: '$34,061.15', sub: '-$1.20 today', positive: false },
  { label: 'DAY P&L · 8 APR 2026', value: '-$1.20', sub: '-0.00%', positive: false },
  { label: 'APRIL 2026 MTD', value: '-$9,381.31', sub: '-21.89% MTD', positive: false },
  { label: 'SINCE INCEPTION · 17 MAR 2026', value: '-31.88%', sub: '-$15,938.85', positive: false },
];

const filters = ['1W', '1M', '3M', 'YTD', '1Y', 'All'];

const allocation = [
  { name: 'XAUUSD Fund', amount: 'SGD 34,061.15', pct: '100%', color: 'bg-blue-600' },
];

// Full dataset — used for filtering
const allChartData = [
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
];

export default function InvestorDashboard() {
  const [activeFilter, setActiveFilter] = useState('All');
  
  // Read query filters reactively from search layout bar
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

  // Filter allocation metrics depending on global search input match
  const filteredAllocation = useMemo(() => {
    if (!searchQuery) return allocation;
    return allocation.filter(fund => 
      fund.name.toLowerCase().includes(searchQuery)
    );
  }, [searchQuery]);

  // Filter chart data based on selected period
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
  }, [activeFilter]);

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
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Chart + Allocation - Fixed responsive grid breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Portfolio Chart Component Box */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">PORTFOLIO VALUE</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            {/* Fixed wrapper: Text will scale or drop cleanly as a unified block */}
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold text-gray-900">SGD 34,061.15</span>
              <span className="text-red-500 font-medium text-sm whitespace-nowrap">
                -31.88% since inception
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

            {/* Donut Chart */}
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

            {/* Legend layout listings */}
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
            <button className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800 whitespace-nowrap">
              Request transaction
            </button>
          </div>
        </div>
        <HoldingsTable searchFilter={searchQuery} />
      </div>

    </div>
  );
}