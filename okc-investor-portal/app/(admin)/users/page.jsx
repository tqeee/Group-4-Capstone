'use client';
import { useState } from 'react';

const initialUsers = [
  {
    id: 'INV-204812',
    name: 'Faye Cheah',
    email: 'faye.cheah@email.com',
    role: 'Investor',
    status: 'Active',
    joined: '17 Mar 2026',
    portfolioValue: '$34,061.15',
    mfa: true,
  },
  {
    id: 'INV-204813',
    name: 'Sarah Lim',
    email: 'sarah.lim@email.com',
    role: 'Investor',
    status: 'Pending',
    joined: '5 Apr 2026',
    portfolioValue: '$0.00',
    mfa: false,
  },
  {
    id: 'INV-204814',
    name: 'James Wong',
    email: 'james.wong@email.com',
    role: 'Investor',
    status: 'Invited',
    joined: '7 Apr 2026',
    portfolioValue: '$0.00',
    mfa: false,
  },
  {
    id: 'OPS-001',
    name: 'Operations Staff',
    email: 'ops@okccapital.sg',
    role: 'Operations',
    status: 'Active',
    joined: '1 Jan 2026',
    portfolioValue: '—',
    mfa: true,
  },
];

const statusStyle = {
  Active: 'bg-green-50 text-green-600',
  Pending: 'bg-yellow-50 text-yellow-600',
  Invited: 'bg-blue-50 text-blue-600',
  Suspended: 'bg-red-50 text-red-500',
};

const roleStyle = {
  Investor: 'bg-gray-100 text-gray-600',
  Operations: 'bg-green-50 text-green-600',
  Admin: 'bg-blue-50 text-blue-600', 
};

export default function UsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Investor');
  const [toast, setToast] = useState(null);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  function handleInvite(e) {
    e.preventDefault();
    setToast(`Invite sent to ${inviteEmail}`);
    setShowInviteModal(false);
    setInviteEmail('');
    setTimeout(() => setToast(null), 3000);
  }

  function handleSuspend(userId) {
    setUsers(prev => prev.map(u =>
      u.id === userId
        ? { ...u, status: u.status === 'Suspended' ? 'Active' : 'Suspended' }
        : u
    ));
  }

  function handleResetPassword(user) {
    setToast(`Password reset link sent to ${user.email}`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header — Wraps gracefully on mobile views */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage investor accounts, roles, and access.
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-blue-600 text-white text-sm px-4 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 self-start sm:self-auto w-full sm:w-auto"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="whitespace-nowrap">Invite user</span>
        </button>
      </div>

      {/* Stats row — Dynamic switching layouts based on screen size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL USERS', value: users.length },
          { label: 'ACTIVE', value: users.filter(u => u.status === 'Active').length },
          { label: 'PENDING / INVITED', value: users.filter(u => u.status === 'Pending' || u.status === 'Invited').length },
          { label: 'MFA ENABLED', value: users.filter(u => u.mfa).length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + table */}
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

        {/* Horizontal scroll support for small layouts */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['USER', 'ACCOUNT ID', 'ROLE', 'STATUS', 'MFA', 'PORTFOLIO VALUE', 'JOINED', 'ACTIONS'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate whitespace-nowrap">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate whitespace-nowrap">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleStyle[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.mfa
                      ? <span className="text-xs text-green-600 font-medium">✓ Enabled</span>
                      : <span className="text-xs text-gray-400">Not set</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium whitespace-nowrap">{user.portfolioValue}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{user.joined}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Reset pwd
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleSuspend(user.id)}
                        className={`text-xs font-medium ${user.status === 'Suspended' ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                      >
                        {user.status === 'Suspended' ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No users found.</div>
        )}
      </div>

      {/* Invite Modal — Fully responsive responsive overlay wrapper */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-xl transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Invite new user</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="investor@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>Investor</option>
                  <option>Operations</option>
                  <option>Admin</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                A one-time invite link will be sent to this email. The link expires in 24 hours.
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-full sm:flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 transition"
                >
                  Send invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast alert handling code */}
      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}