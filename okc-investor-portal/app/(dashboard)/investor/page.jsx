'use client';
import { useState } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import HoldingsTable from '@/components/dashboard/HoldingsTable';

const stats = [
  { label: 'TOTAL PORTFOLIO VALUE', value: '$1,284,492.22', sub: '+$3,487.56 today', positive: true },
  { label: 'DAY P&L', value: '+$3,487.56', sub: '+0.27%', positive: true },
  { label: 'YEAR TO DATE', value: '+8.27%', sub: '+$98,233', positive: true },
  { label: 'SINCE INCEPTION · 14 AUG 2022', value: '+23.83%', sub: '+$246,809', positive: true },
];

const filters = ['1W', '1M', '3M', 'YTD', '1Y', 'All'];

const allocation = [
  { name: 'Global Equity', amount: '$819,016', pct: '63.8%', color: 'bg-blue-600' },
  { name: 'Fixed Income', amount: '$320,279', pct: '24.9%', color: 'bg-blue-400' },
  { name: 'Asia Balanced', amount: '$145,197', pct: '11.3%', color: 'bg-blue-200' },
];

export default function InvestorDashboard() {
  const [activeFilter, setActiveFilter] = useState('1Y');

  return (
    <div>
      {/* Greeting */}
      <p className="text-gray-500 text-sm mb-1">Good morning, <b>Faye</b>!</p>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Portfolio Summary</h1>
        <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
          Live · NAV as of 12 May 2026, 19:00 SGT
        </span>
      </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
            <StatCard key={i} {...stat} />
        ))}
        </div>

      {/* Chart + Allocation */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">PORTFOLIO VALUE</p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-2xl font-bold text-gray-900">$1,284,492.22 </span>
              <span className="text-green-600 font-medium text-sm">+8.27% YTD</span>
            </div>
            <div className="flex gap-1">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition ${
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
          <PortfolioChart />
        </div>

{/* Outer Card Wrapper */}
<div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col h-full">
  <p className="text-xs text-gray-400 font-medium tracking-wide mb-4">ALLOCATION ACROSS FUNDS</p>
  
  {/* Inner Content Alignment Wrapper */}
  <div className="flex flex-col items-center flex-1 justify-center">
    
    {/* Dynamic SVG Donut Chart Container */}
    <div className="relative w-36 h-36 flex items-center justify-center mb-6">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
        {(() => {
          const colorMap = {
            'bg-blue-600': '#2563eb',
            'bg-blue-400': '#60a5fa',
            'bg-blue-200': '#bfdbfe'
          };

          let accumulatedPercentage = 0;

          return allocation.map((fund, i) => {
            const rawPct = parseFloat(fund.pct);
            const strokeDash = rawPct;
            const strokeOffset = 100 - accumulatedPercentage;
            
            accumulatedPercentage += rawPct;

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

      {/* Center Text Wrapper */}
      <div className="absolute text-center">
        <p className="text-xs text-gray-400">TOTAL</p>
        <p className="text-lg font-bold text-gray-900">$1.28M</p>
      </div>
    </div>

    {/* Legend List */}
    <div className="w-full flex flex-col gap-3">
      {allocation.map((fund, i) => (
        <div key={i} className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${fund.color}`}></div>
            <div>
              <p className="text-xm font-medium text-gray-700">{fund.name}</p>
              <p className="text-sm text-gray-400">{fund.amount}</p>
            </div>
          </div>
          <span className="text-xm font-semibold text-gray-900">{fund.pct}</span>
        </div>
      ))}
    </div>
  </div>
</div>

      </div>

      {/* Holdings Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-1">YOUR FUNDS</p>
            <h2 className="text-lg font-bold text-gray-900">Holdings & returns</h2>
          </div>
          <div className="flex gap-3">
            <button className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50">
              Download statement
            </button>
            <button className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
              Request transaction
            </button>
          </div>
        </div>
        <HoldingsTable />
      </div>
    </div>
  );
}