'use client';
import { useState } from 'react';

const monthlyData = [
  {
    month: 'March 2026',
    tradingDays: 9,
    totalPnl: -6557.54,
    startValue: 50000.00,
    endValue: 43442.46,
    return: -13.12,
    wins: 8,
    losses: 13,
    trades: 21,
  },
  {
    month: 'April 2026',
    tradingDays: 7,
    totalPnl: -9381.31,
    startValue: 43442.46,
    endValue: 34061.15,
    return: -21.59,
    wins: 4,
    losses: 11,
    trades: 15,
  },
];

const dailyData = [
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
];

const tabs = ['Overview', 'Monthly', 'Daily'];

const formatCurrency = (value, includeSign = true) => {
  const absValue = Math.abs(value).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!includeSign) return `$${absValue}`;
  return value >= 0 ? `+$${absValue}` : `-$${absValue}`;
};

const formatPercent = (value) => {
  const absValue = Math.abs(value).toFixed(2);
  return value >= 0 ? `+${absValue}%` : `-${absValue}%`;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Overview');

  const totalPnl = -15938.85;
  const totalTrades = 36;
  const totalWins = 12;
  const totalLosses = 24;
  const winRate = ((totalWins / totalTrades) * 100).toFixed(1);
  const bestDay = dailyData.reduce((a, b) => a.pnl > b.pnl ? a : b);
  const worstDay = dailyData.reduce((a, b) => a.pnl < b.pnl ? a : b);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-400 text-sm mt-1">
          Performance breakdown for the OKC XAUUSD Fund · 17 Mar – 8 Apr 2026
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 sm:overflow-visible">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition shrink-0 ${
              activeTab === tab
                ? 'bg-blue-700 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div>
          {/* Summary cards - Made responsive so it doesn't break on small panels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'TOTAL P&L', value: formatCurrency(totalPnl), sub: 'Since 17 Mar 2026', red: totalPnl < 0 },
              { label: 'OVERALL RETURN', value: formatPercent(-31.88), sub: 'vs $50,000 deposit', red: true },
              { label: 'WIN RATE', value: `${winRate}%`, sub: `${totalWins}W / ${totalLosses}L`, red: false },
              { label: 'TRADING DAYS', value: '16 days', sub: '17 Mar – 8 Apr 2026', red: false },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-400 font-medium tracking-wide mb-2">{item.label}</p>
                <p className={`text-2xl font-bold mb-1 ${item.red ? 'text-red-500' : 'text-gray-900'}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Best / Worst day + fund info - Made responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-4">BEST & WORST TRADING DAYS</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Best day</p>
                    <p className="text-xs text-gray-400">{bestDay.date}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(bestDay.pnl)}
                  </p>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Worst day</p>
                    <p className="text-xs text-gray-400">{worstDay.date}</p>
                  </div>
                  <p className="text-lg font-bold text-red-500">
                    {formatCurrency(worstDay.pnl)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-4">FUND DETAILS</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Instrument', value: 'XAUUSD (Gold)' },
                  { label: 'Strategy', value: 'Expert Advisor' },
                  { label: 'Initial Deposit', value: '$50,000.00' },
                  { label: 'Current Value', value: '$34,061.15' },
                  { label: 'Total Trades', value: '282 closed' },
                  { label: 'Inception Date', value: '17 Mar 2026' },
                ].map((item, i) => (
                  <div key={i}>
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY TAB */}
      {activeTab === 'Monthly' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Enabled safe responsive horizontal scrolling layout container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['MONTH', 'TRADING DAYS', 'START VALUE', 'END VALUE', 'P&L (SGD)', 'RETURN', 'TRADES', 'WIN RATE'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthlyData.map((row, i) => {
                  const winRate = ((row.wins / row.trades) * 100).toFixed(0);
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{row.month}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{row.tradingDays}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(row.startValue, false)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{formatCurrency(row.endValue, false)}</td>
                      <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${row.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(row.totalPnl)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${row.return >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(row.return)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{row.trades}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${winRate}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">{winRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">Total</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">16</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatCurrency(50000, false)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{formatCurrency(34061.15, false)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-500 whitespace-nowrap">{formatCurrency(-15938.85)}</td>
                  <td className="px-6 py-4 text-sm font-bold text-red-500 whitespace-nowrap">{formatPercent(-31.88)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">36</td>
                  <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">33.3%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* DAILY TAB */}
      {activeTab === 'Daily' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Enabled safe responsive horizontal scrolling layout container */}
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['DATE', 'DAILY P&L', 'PORTFOLIO VALUE', 'CHANGE', 'TRADES'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dailyData.map((row, i) => {
                  const prevValue = i === 0 ? 50000 : dailyData[i - 1].value;
                  const changePct = (row.pnl / prevValue) * 100;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{row.date}</td>
                      <td className={`px-6 py-4 text-sm font-semibold whitespace-nowrap ${row.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(row.pnl)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">
                        {formatCurrency(row.value, false)}
                      </td>
                      <td className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${changePct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatPercent(changePct)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{row.trades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}