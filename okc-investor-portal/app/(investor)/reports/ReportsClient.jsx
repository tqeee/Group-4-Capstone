'use client';
import { useState } from 'react';
import { fmtDate, fmtMonth, fmtMoney, fmtPct } from '@/lib/format';

const tabs = ['Overview', 'Monthly', 'Daily'];

export default function ReportsClient({ overview, reports }) {
  const [activeTab, setActiveTab] = useState('Overview');

  if (!overview?.hasData || !reports || reports.daily.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Performance breakdown across your funds.</p>
        </div>
        <div className="card p-12 text-center text-sm text-gray-400">
          No performance history yet — reports appear after the fund&apos;s first trading day.
        </div>
      </div>
    );
  }

  const { monthly, daily, fundReturnPct } = reports;
  const totalWins = monthly.reduce((s, m) => s + m.wins, 0);
  const totalLosses = monthly.reduce((s, m) => s + m.losses, 0);
  const totalTraded = totalWins + totalLosses;
  const winRate = totalTraded > 0 ? ((totalWins / totalTraded) * 100).toFixed(1) : '0.0';
  const totalTradingDays = monthly.reduce((s, m) => s + m.tradingDays, 0);
  const bestDay = daily.reduce((a, b) => (a.pnl > b.pnl ? a : b));
  const worstDay = daily.reduce((a, b) => (a.pnl < b.pnl ? a : b));
  const periodLabel = `${fmtDate(daily[0].date)} - ${fmtDate(daily[daily.length - 1].date)}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Performance breakdown · {periodLabel}</p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1 sm:overflow-visible">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pill shrink-0 ${activeTab === tab ? 'pill-active' : 'pill-inactive'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'TOTAL P&L', value: fmtMoney(overview.inceptionPnl, { sign: true }), sub: `Since ${fmtDate(overview.inceptionDate)}`, red: overview.inceptionPnl < 0 },
              { label: 'FUND RETURN (COMPOUNDED)', value: fmtPct(fundReturnPct), sub: 'Daily returns compounded', red: fundReturnPct < 0 },
              { label: 'YTD RETURN', value: fmtPct(overview.ytdPct), sub: fmtMoney(overview.ytdPnl, { sign: true }), red: overview.ytdPnl < 0 },
              { label: 'WIN RATE', value: `${winRate}%`, sub: `${totalWins}W / ${totalLosses}L`, red: false },
              { label: 'TRADING DAYS', value: `${totalTradingDays} days`, sub: periodLabel, red: false },
            ].map((item, i) => (
              <div key={i} className="card p-5">
                <p className="section-label mb-2">{item.label}</p>
                <p className={`text-2xl font-bold mb-1 ${item.red ? 'text-red-500' : 'text-gray-900'}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="card p-6">
              <p className="section-label mb-4">BEST & WORST TRADING DAYS</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Best day</p>
                    <p className="text-xs text-gray-400">{fmtDate(bestDay.date)}</p>
                  </div>
                  <p className="text-lg font-bold text-green-600">{fmtMoney(bestDay.pnl, { sign: true })}</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Worst day</p>
                    <p className="text-xs text-gray-400">{fmtDate(worstDay.date)}</p>
                  </div>
                  <p className="text-lg font-bold text-red-500">{fmtMoney(worstDay.pnl, { sign: true })}</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <p className="section-label mb-4">PORTFOLIO DETAILS</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total Deposits', value: fmtMoney(overview.grossDeposits) },
                  { label: 'Current Value', value: fmtMoney(overview.totalValue) },
                  { label: 'Your Return', value: fmtPct(overview.inceptionPct) },
                  { label: 'In the fund since', value: fmtDate(overview.inceptionDate) },
                  { label: 'Funds held', value: String(overview.allocation.length) },
                  { label: 'NAV as of', value: fmtDate(overview.asOf) },
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

      {activeTab === 'Monthly' && (
        <div className="card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['MONTH', 'TRADING DAYS', 'START VALUE', 'END VALUE', 'P&L (SGD)', 'RETURN', 'WIN RATE'].map(h => (
                    <th key={h} className="table-header-cell whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monthly.map((row, i) => {
                  const traded = row.wins + row.losses;
                  const rate = traded > 0 ? Math.round((row.wins / traded) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-gray-50/50 transition">
                      <td className="table-cell font-semibold text-gray-900">{fmtMonth(row.month)}</td>
                      <td className="table-cell text-gray-600">{row.tradingDays}</td>
                      <td className="table-cell text-gray-600">{fmtMoney(row.startValue)}</td>
                      <td className="table-cell text-gray-600">{fmtMoney(row.endValue)}</td>
                      <td className={`table-cell font-semibold ${row.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtMoney(row.totalPnl, { sign: true })}
                      </td>
                      <td className={`table-cell font-semibold ${row.returnPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmtPct(row.returnPct)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${rate}%` }}></div>
                          </div>
                          <span className="text-xs text-gray-500">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'Daily' && (
        <div className="card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['DATE', 'DAILY P&L', 'PORTFOLIO VALUE', 'CHANGE'].map(h => (
                    <th key={h} className="table-header-cell whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {daily.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition">
                    <td className="table-cell text-gray-600">{fmtDate(row.date)}</td>
                    <td className={`table-cell font-semibold ${row.pnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtMoney(row.pnl, { sign: true })}
                    </td>
                    <td className="table-cell text-gray-700 font-medium">{fmtMoney(row.value)}</td>
                    <td className={`table-cell font-medium ${row.changePct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtPct(row.changePct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
