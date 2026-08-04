'use client';
import { useState } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';
 
const statusStyle = {
  Active: 'bg-green-50 text-green-600',
  Invited: 'bg-blue-50 text-blue-600',
  Disabled: 'bg-red-50 text-red-600',
};
 
const roleStyle = {
  investor: 'bg-gray-100 text-gray-600',
  operations: 'bg-green-50 text-green-600',
  admin: 'bg-blue-50 text-blue-600',
  'portfolio-manager': 'bg-purple-50 text-purple-600',
};
 
const roleLabel = {
  investor: 'Investor',
  operations: 'Operations',
  admin: 'Admin',
  'portfolio-manager': 'Portfolio Manager',
};
 
// Same filter pills as Admin's Users page (components styling matches
// components/AuditLogTable.jsx's filter row) — Operations can see every
// account type, just without any management actions.
const ROLE_FILTERS = [
  { label: 'All', role: null },
  { label: 'Investors', role: 'investor' },
  { label: 'Admin', role: 'admin' },
  { label: 'Operations', role: 'operations' },
  { label: 'Portfolio Manager', role: 'portfolio-manager' },
];
 
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
 
// Same look as Admin's Users page (table + role filter pills + View Profile
// modal), but read-only: no invite, no disable/enable, no 2FA reset. Those
// stay Admin's job — this is view access, self-contained under (operations).
export default function InvestorsClient({ accounts, loadError }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState(null);
 
  const activeRole = ROLE_FILTERS.find(f => f.label === roleFilter)?.role ?? null;
 
  const filtered = accounts.filter(a => {
    const matchesSearch =
      a.email.toLowerCase().includes(search.toLowerCase()) ||
      (a.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase());
    const matchesRole = activeRole === null || a.role === activeRole;
    return matchesSearch && matchesRole;
  });
 
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Investors</h1>
        <p className="text-gray-400 text-sm mt-1">
          Directory of all portal accounts and their current holdings. Account management is handled by Admin.
        </p>
      </div>
 
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-5 py-4 mb-6">
          Could not load accounts: {loadError}
        </div>
      )}
 
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL ACCOUNTS', value: accounts.length },
          { label: 'ACTIVE', value: accounts.filter(a => a.status === 'Active').length },
          { label: 'INVITED', value: accounts.filter(a => a.status === 'Invited').length },
          { label: 'INVESTORS', value: accounts.filter(a => a.role === 'investor').length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>
 
      {/* Role filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ROLE_FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => setRoleFilter(f.label)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
              roleFilter === f.label
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {f.label}
          </button>
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
            placeholder="Search by name, email, or ID..."
            className="text-sm text-gray-700 outline-none flex-1 w-full bg-transparent"
          />
        </div>
 
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['USER', 'ROLE', 'STATUS', 'PORTFOLIO VALUE', 'JOINED', 'LAST SIGN-IN', ''].map((h, i) => (
                  <th key={i} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(account => {
                const isInvestor = account.role === 'investor' && account.investorId;
                return (
                  <tr key={account.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 uppercase">
                          {account.email.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate whitespace-nowrap">
                            {account.name ?? account.email}
                          </p>
                          <p className="text-xs text-gray-400 truncate whitespace-nowrap">{account.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleStyle[account.role]}`}>
                        {roleLabel[account.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[account.status]}`}>
                        {account.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700 font-semibold whitespace-nowrap">
                      {isInvestor ? fmtMoney(account.portfolioValue ?? 0) : <span className="text-gray-300 font-normal">—</span>}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(account.createdAt)}</td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(account.lastSignInAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedAccount(account)}
                        className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
 
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No accounts found.</div>
        )}
      </div>
 
      {/* Account Information modal — same layout as Admin's Users page and
          PM's Investors page. Investor-only fields (ID, onboarding date,
          portfolio value) only render when the account actually has them. */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                  {roleLabel[selectedAccount.role]} Profile
                </p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">Account Information</h2>
              </div>
              <button
                className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
                onClick={() => setSelectedAccount(null)}
                type="button"
              >
                ×
              </button>
            </div>
 
            <div className="mt-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {getInitials(selectedAccount.name)}
              </div>
              <div>
                <p className="font-bold text-gray-900">{selectedAccount.name ?? selectedAccount.email}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedAccount.email}</p>
              </div>
            </div>
 
            <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
              <ProfileRow label="Registered Name" value={selectedAccount.name ?? '—'} />
              <ProfileRow label="Registered Email" value={selectedAccount.email} />
              <ProfileRow label="Role" value={roleLabel[selectedAccount.role]} />
              <ProfileRow label="Status" value={selectedAccount.status} />
              <ProfileRow label="Joined" value={formatDate(selectedAccount.createdAt)} />
              <ProfileRow label="Last Sign-in" value={formatDate(selectedAccount.lastSignInAt)} />
              {selectedAccount.role === 'investor' && selectedAccount.investorId && (
                <>
                  <ProfileRow label="Investor ID" value={selectedAccount.investorId} />
                  <ProfileRow label="Onboarded" value={fmtDate(selectedAccount.onboardingDate)} />
                  <ProfileRow label="Portfolio Value" value={fmtMoney(selectedAccount.portfolioValue ?? 0)} />
                </>
              )}
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
