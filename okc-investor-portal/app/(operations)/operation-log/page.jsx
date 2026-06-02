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

export default function OperationLogPage() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredLogs = logs.filter(log => {
    const normalizedSearch = search.toLowerCase();
    const matchesSearch =
      log.user.toLowerCase().includes(normalizedSearch) ||
      log.email.toLowerCase().includes(normalizedSearch) ||
      log.action.toLowerCase().includes(normalizedSearch) ||
      log.ip.includes(search);

    const matchesFilter =
      activeFilter === 'All'
        ? true
        : activeFilter === 'Login'
          ? log.action.toLowerCase().includes('login')
          : activeFilter === 'Failed'
            ? !log.success
            : activeFilter === 'Admin actions'
              ? log.user === 'Admin'
              : activeFilter === 'Password'
                ? log.action.toLowerCase().includes('password')
                : true;

    return matchesSearch && matchesFilter;
  });

  const successCount = logs.filter(log => log.success).length;
  const failCount = logs.filter(log => !log.success).length;
  const uniqueUserCount = new Set(logs.map(log => log.user)).size;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Operation Log</h1>
        <p className="mt-2 text-sm text-gray-500">Read-only record of authentication, admin, and operational activity.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Events" value={logs.length} />
        <StatCard label="Successful" value={successCount} />
        <StatCard label="Failed / Suspicious" value={failCount} tone="text-red-500" />
        <StatCard label="Unique Users" value={uniqueUserCount} />
      </section>

      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                activeFilter === filter
                  ? 'bg-blue-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-500 hover:text-gray-700'
              }`}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 transition focus-within:ring-2 focus-within:ring-blue-500/20 md:w-80">
          <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search user, action, IP..."
            className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                {['Status', 'Log ID', 'User', 'Action', 'IP Address', 'Timestamp'].map(heading => (
                  <th key={heading} className="whitespace-nowrap px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-50 transition last:border-b-0 hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`block h-2 w-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-400">{log.id}</td>
                  <td className="min-w-[180px] px-6 py-4">
                    <p className="truncate text-sm font-semibold text-gray-900">{log.user}</p>
                    <p className="truncate text-xs text-gray-400">{log.email}</p>
                  </td>
                  <td className="min-w-[250px] px-6 py-4">
                    <p className={`text-sm leading-normal ${log.success ? 'text-gray-700' : 'font-medium text-red-500'}`}>
                      {log.action}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-gray-400">{log.ip}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-xs text-gray-400">{log.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && <div className="py-16 text-center text-sm text-gray-400">No logs found.</div>}
      </section>
    </div>
  );
}

function StatCard({ label, value, tone = 'text-gray-950' }) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="mb-2 truncate text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}