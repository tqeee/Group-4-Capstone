'use client';
import { useState } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';
 
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
 
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}
 
// Read-only investor directory for Portfolio Manager: every row here is
// already role === 'investor' (filtered server-side in actions.ts), so
// there's no role column and no account-management actions (add / disable /
// reset 2FA) — PM can view a profile and see portfolio value, nothing more.
export default function PortInvestorsClient({ investors, loadError }) {
  const [search, setSearch] = useState('');
  const [selectedInvestor, setSelectedInvestor] = useState(null);
 
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
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['USER', 'STATUS', 'PORTFOLIO VALUE', 'JOINED', 'LAST SIGN-IN', ''].map((h, i) => (
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
                  <td className="px-6 py-4 text-xs text-gray-700 font-semibold whitespace-nowrap">
                    {user.portfolioValue != null ? fmtMoney(user.portfolioValue) : <span className="text-gray-300 font-normal">—</span>}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.lastSignInAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedInvestor(user)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
 
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No investors found.</div>
        )}
      </div>
 
      {/* Account Information modal — same layout as Admin's Users page and
          Operations' Investors directory, so "View Profile" looks and works
          the same everywhere it appears. Read-only: no actions in here. */}
      {selectedInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Investor Profile</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">Account Information</h2>
              </div>
              <button
                className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
                onClick={() => setSelectedInvestor(null)}
                type="button"
              >
                ×
              </button>
            </div>
 
            <div className="mt-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {getInitials(selectedInvestor.name)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedInvestor.name ?? selectedInvestor.email}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedInvestor.email}</p>
              </div>
            </div>
 
            <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
              <ProfileRow label="Registered Name" value={selectedInvestor.name ?? '—'} />
              <ProfileRow label="Registered Email" value={selectedInvestor.email} />
              <ProfileRow label="Investor ID" value={selectedInvestor.investorId ?? '—'} />
              <ProfileRow label="Onboarded" value={fmtDate(selectedInvestor.onboardingDate)} />
              <ProfileRow label="Portfolio Value" value={fmtMoney(selectedInvestor.portfolioValue ?? 0)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
 
function ProfileRow({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] border-b border-gray-100 last:border-b-0">
      <div className="bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="px-4 py-3 text-sm font-medium text-gray-700 break-all">{value}</div>
    </div>
  );
}