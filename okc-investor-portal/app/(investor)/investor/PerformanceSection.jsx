'use client';
import { useState } from 'react';
import { fmtDate, fmtMonth, fmtMoney, fmtPct } from '@/lib/format';

const tabs = ['Overview', 'Monthly', 'Daily'];

// Was the standalone /reports page (see CLAUDE.md Done #37 for why it moved)
// — same content, folded in as a section of the main dashboard instead of a
// separate route. The parent already gates on overview.hasData, so this only
// needs to handle reports itself being empty.
export default function PerformanceSection({ overview, reports }) {
  const [activeTab, setActiveTab] = useState('Overview');

  if (!reports || reports.daily.length === 0) return null;

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
    <div className="card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <p className="section-label mb-1">PERFORMANCE</p>
          <h2 className="text-lg font-bold text-gray-900">Performance breakdown</h2>
          <p className="text-xs text-gray-400 mt-0.5">{periodLabel}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:overflow-visible">
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
      </div>

      {activeTab === 'Overview' && (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
            {[
              { label: 'TOTAL P&L', value: fmtMoney(overview.inceptionPnl, { sign: true }), sub: `Since ${fmtDate(overview.inceptionDate)}`, red: overview.inceptionPnl < 0 },
              { label: 'MANAGEMENT FEES PAID', value: fmtMoney(overview.inceptionManagementFee), sub: `Since ${fmtDate(overview.inceptionDate)}`, red: false },
              { label: 'FUND RETURN (COMPOUNDED)', value: fmtPct(fundReturnPct), sub: 'Daily returns compounded', red: fundReturnPct < 0 },
              { label: 'YTD RETURN', value: fmtPct(overview.ytdPct), sub: fmtMoney(overview.ytdPnl, { sign: true }), red: overview.ytdPnl < 0 },
              { label: 'WIN RATE', value: `${winRate}%`, sub: `${totalWins}W / ${totalLosses}L`, red: false },
              { label: 'TRADING DAYS', value: `${totalTradingDays} days`, sub: periodLabel, red: false },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-100 p-4">
                <p className="section-label mb-2">{item.label}</p>
                <p className={`text-2xl font-bold mb-1 ${item.red ? 'text-red-500' : 'text-gray-900'}`}>
                  {item.value}
                </p>
                <p className="text-xs text-gray-400">{item.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-100 p-5">
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

            <div className="rounded-xl border border-gray-100 p-5">
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
        <div className="rounded-xl border border-gray-100 overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {['MONTH', 'TRADING DAYS', 'START VALUE', 'END VALUE', 'P&L (SGD)', 'MGMT FEE (SGD)', 'RETURN', 'WIN RATE'].map(h => (
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
                      <td className="table-cell text-gray-600">{fmtMoney(row.managementFee)}</td>
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
        <div className="rounded-xl border border-gray-100 overflow-hidden">
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
