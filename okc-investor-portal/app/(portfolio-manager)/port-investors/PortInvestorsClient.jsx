'use client';
import { useState } from 'react';

const statusStyle = {
  Active: 'bg-green-50 text-green-600',
  Invited: 'bg-blue-50 text-blue-600',
  Disabled: 'bg-red-50 text-red-600',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// Read-only investor directory for Portfolio Manager: no role column, no
// account-management actions (add / disable) — PM can view, not manage.
export default function PortInvestorsClient({ investors, loadError }) {
  const [search, setSearch] = useState('');

  const filtered = investors.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Investors</h1>
        <p className="text-gray-400 text-sm mt-1">
          Read-only directory of investor accounts. Account management is handled by Admin.
        </p>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-5 py-4 mb-6">
          Could not load investors: {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'TOTAL INVESTORS', value: investors.length },
          { label: 'ACTIVE', value: investors.filter(u => u.status === 'Active').length },
          { label: 'INVITED', value: investors.filter(u => u.status === 'Invited').length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="text-sm text-gray-700 outline-none flex-1 w-full bg-transparent"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['USER', 'STATUS', 'JOINED', 'LAST SIGN-IN'].map((h, i) => (
                  <th key={i} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(user => (
                <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 uppercase">
                        {user.email.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate whitespace-nowrap">
                          {user.name ?? user.email}
                        </p>
                        <p className="text-xs text-gray-400 truncate whitespace-nowrap">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.lastSignInAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No investors found.</div>
        )}
      </div>
    </div>
  );
}