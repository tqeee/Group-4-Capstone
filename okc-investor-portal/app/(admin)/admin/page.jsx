'use client';
import { useState } from 'react';

const stats = [
  { label: 'TOTAL INVESTORS', value: '3', sub: '2 active · 1 pending', red: false },
  { label: 'TOTAL AUM', value: 'SGD 34,061.15', sub: 'Across all accounts', red: false },
  { label: 'TOTAL P&L (ALL)', value: '-SGD 15,938.85', sub: '-31.88% since inception', red: true },
  { label: 'PENDING REQUESTS', value: '2', sub: '1 deposit · 1 withdrawal', red: false },
];

const recentActivity = [
  { user: 'Faye Cheah', action: 'Login successful', time: '8 Apr 2026 · 09:14', role: 'Investor', success: true },
  { user: 'Sarah Lim', action: 'Login failed — wrong password', time: '8 Apr 2026 · 08:52', role: 'Investor', success: false },
  { user: 'Admin', action: 'Invited new investor: david.koh@email.com', time: '7 Apr 2026 · 17:30', role: 'Admin', success: true },
  { user: 'Faye Cheah', action: 'Submitted withdrawal request SGD 20,000', time: '7 Apr 2026 · 14:22', role: 'Investor', success: true },
  { user: 'James Wong', action: 'Password reset completed', time: '6 Apr 2026 · 11:05', role: 'Investor', success: true },
];

const investors = [
  { name: 'Faye Cheah', id: 'INV-204812', value: '$34,061.15', pnl: '-31.88%', status: 'Active', positive: false },
  { name: 'Sarah Lim', id: 'INV-204813', value: '$0.00', pnl: '—', status: 'Pending', positive: false },
  { name: 'James Wong', id: 'INV-204814', value: '$0.00', pnl: '—', status: 'Invited', positive: false },
];

const statusStyle = {
  Active: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Invited: 'bg-blue-50 text-blue-600',
  Suspended: 'bg-red-50 text-red-500',
};

export default function AdminOverview() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-gray-500 text-sm mb-1">Welcome back</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-3xl font-bold text-gray-900">Admin Overview</h1>
          <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            NAV as of 8 Apr 2026 · XAUUSD Fund
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0 break-words">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{stat.label}</p>
            <p className={`text-xl md:text-2xl font-bold mb-1 ${stat.red ? 'text-red-500' : 'text-gray-900'}`}>
              {stat.value}
            </p>
            <p className="text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Grid splits down to vertical stack on tablets or below */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Investor summary */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 min-w-0">
          <div className="flex items-end justify-between mb-4 gap-2">
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-3">ALL INVESTORS</p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Portfolio overview</h2>
            </div>
            <a href="/users" className="text-sm text-blue-600 hover:text-blue-700 font-medium pb-0.5 whitespace-nowrap">
              Manage users →
            </a>
          </div>
          
          {/* Responsive table overflow protection */}
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {['INVESTOR', 'ACCOUNT ID', 'PORTFOLIO VALUE', 'RETURN', 'STATUS'].map(h => (
                    <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investors.map((inv, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                          {inv.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{inv.name}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono text-gray-400 whitespace-nowrap">{inv.id}</td>
                    <td className="py-3 pr-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{inv.value}</td>
                    <td className={`py-3 pr-4 text-sm font-medium whitespace-nowrap ${inv.pnl === '—' ? 'text-gray-400' : inv.positive ? 'text-green-600' : 'text-red-500'}`}>
                      {inv.pnl}
                    </td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${statusStyle[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-end justify-between mb-4 gap-2">
            <div>
              <p className="text-xs text-gray-400 font-medium tracking-wide mb-3">SYSTEM</p>
              <h2 className="text-lg font-bold text-gray-900 leading-none">Recent activity</h2>
            </div>
            <a href="/audit-logs" className="text-sm text-blue-600 hover:text-blue-700 font-medium pb-0.5 whitespace-nowrap">
              View all →
            </a>
          </div>
          <div className="space-y-4">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${item.success ? 'bg-green-500' : 'bg-red-400'}`}></div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.user}</p>
                  <p className="text-xs text-gray-400 leading-relaxed break-words">{item.action}</p>
                  <p className="text-xs text-gray-300 mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}