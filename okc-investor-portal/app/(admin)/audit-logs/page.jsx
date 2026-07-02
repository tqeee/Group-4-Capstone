'use client';
import { useState } from 'react';

const logs = [
  { id: 'LOG-001', user: 'Faye Cheah', email: 'faye.cheah@email.com', action: 'Login successful', ip: '182.55.12.34', time: '8 Apr 2026 · 09:14:22', success: true },
  { id: 'LOG-002', user: 'Sarah Lim', email: 'sarah.lim@email.com', action: 'Login failed — incorrect password', ip: '103.24.77.12', time: '8 Apr 2026 · 08:52:05', success: false },
  { id: 'LOG-003', user: 'Sarah Lim', email: 'sarah.lim@email.com', action: 'Login failed — incorrect password', ip: '103.24.77.12', time: '8 Apr 2026 · 08:51:44', success: false },
  { id: 'LOG-004', user: 'Admin', email: 'admin@okccapital.sg', action: 'Invited new user: david.koh@email.com', ip: '192.168.1.1', time: '7 Apr 2026 · 17:30:11', success: true },
  { id: 'LOG-005', user: 'Faye Cheah', email: 'faye.cheah@email.com', action: 'Submitted withdrawal request SGD 20,000', ip: '182.55.12.34', time: '7 Apr 2026 · 14:22:58', success: true },
  { id: 'LOG-006', user: 'James Wong', email: 'james.wong@email.com', action: 'Password reset completed', ip: '118.200.44.56', time: '6 Apr 2026 · 11:05:33', success: true },
  { id: 'LOG-007', user: 'Faye Cheah', email: 'faye.cheah@email.com', action: 'Login successful', ip: '182.55.12.34', time: '6 Apr 2026 · 09:01:17', success: true },
  { id: 'LOG-008', user: 'Admin', email: 'admin@okccapital.sg', action: 'Approved withdrawal request REQ-002', ip: '192.168.1.1', time: '5 Apr 2026 · 16:44:02', success: true },
  { id: 'LOG-009', user: 'Operations Staff', email: 'ops@okccapital.sg', action: 'Login successful', ip: '192.168.1.5', time: '5 Apr 2026 · 09:00:05', success: true },
  { id: 'LOG-010', user: 'Faye Cheah', email: 'faye.cheah@email.com', action: 'MFA verification successful', ip: '182.55.12.34', time: '4 Apr 2026 · 08:58:44', success: true },
  { id: 'LOG-011', user: 'Sarah Lim', email: 'sarah.lim@email.com', action: 'Account locked — 5 failed attempts', ip: '103.24.77.12', time: '3 Apr 2026 · 21:12:09', success: false },
  { id: 'LOG-012', user: 'Admin', email: 'admin@okccapital.sg', action: 'Reset password for Sarah Lim', ip: '192.168.1.1', time: '3 Apr 2026 · 22:05:00', success: true },
];

const filters = ['All', 'Login', 'Failed', 'Admin actions', 'Password'];

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = logs.filter(log => {
    const matchSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.ip.includes(search);

    const matchFilter =
      activeFilter === 'All' ? true :
      activeFilter === 'Login' ? log.action.toLowerCase().includes('login') :
      activeFilter === 'Failed' ? !log.success :
      activeFilter === 'Admin actions' ? log.user === 'Admin' :
      activeFilter === 'Password' ? log.action.toLowerCase().includes('password') :
      true;

    return matchSearch && matchFilter;
  });

  const successCount = logs.filter(l => l.success).length;
  const failCount = logs.filter(l => !l.success).length;

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-400 text-sm mt-1">
          Complete record of all authentication and admin actions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL EVENTS', value: logs.length, red: false },
          { label: 'SUCCESSFUL', value: successCount, red: false },
          { label: 'FAILED / SUSPICIOUS', value: failCount, red: true },
          { label: 'UNIQUE USERS', value: [...new Set(logs.map(l => l.user))].length, red: false },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className={`text-2xl font-bold ${s.red ? 'text-red-500' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + search toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeFilter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 w-full md:w-64 focus-within:ring-2 focus-within:ring-blue-500/20 transition">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search user, action, IP..."
            className="text-sm text-gray-700 outline-none w-full bg-transparent"
          />
        </div>
      </div>

      {/* Table Container with structural protection */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['STATUS', 'LOG ID', 'USER', 'ACTION', 'IP ADDRESS', 'TIMESTAMP'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((log, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-400'}`}></div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">{log.id}</td>
                  <td className="px-6 py-4 min-w-[180px]">
                    <p className="text-sm font-semibold text-gray-900 truncate">{log.user}</p>
                    <p className="text-xs text-gray-400 truncate">{log.email}</p>
                  </td>
                  <td className="px-6 py-4 min-w-[250px]">
                    <p className={`text-sm leading-normal break-words ${log.success ? 'text-gray-700' : 'text-red-500 font-medium'}`}>
                      {log.action}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">{log.ip}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No logs found.</div>
        )}
      </div>
    </div>
  );
}