'use client';
import { useActionState, useEffect, useState } from 'react';
import { inviteUser, setUserStatus, resetUserMfa } from './actions';
import { ROLE_BADGE_STYLE } from '@/lib/auth/roles';

const statusStyle = {
  Active: 'bg-green-50 text-green-600',
  Invited: 'bg-blue-50 text-blue-600',
  Disabled: 'bg-red-50 text-red-600',
};

const roleStyle = ROLE_BADGE_STYLE;

const roleLabel = {
  investor: 'Investor',
  operations: 'Operations',
  admin: 'Admin',
  'portfolio-manager': 'Portfolio Manager',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Deterministic formatter so server and client render the same markup.
function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function UsersClient({ users, loadError }) {
  const [search, setSearch] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [inviteState, inviteAction, invitePending] = useActionState(inviteUser, undefined);
  const [statusState, statusAction, statusPending] = useActionState(setUserStatus, undefined);
  const [mfaState, mfaAction, mfaPending] = useActionState(resetUserMfa, undefined);

  // Close the modal and surface a toast when an invite succeeds. Done during
  // render (not in an effect) per https://react.dev/learn/you-might-not-need-an-effect.
  const [handledInviteState, setHandledInviteState] = useState(inviteState);
  if (inviteState !== handledInviteState) {
    setHandledInviteState(inviteState);
    if (inviteState?.status === 'success') {
      setShowInviteModal(false);
      setToast(inviteState.message);
    }
  }

  // Same render-time pattern for disable/enable results.
  const [handledStatusState, setHandledStatusState] = useState(statusState);
  if (statusState !== handledStatusState) {
    setHandledStatusState(statusState);
    if (statusState) {
      setToast(statusState.message);
    }
  }

  // ...and for 2FA resets.
  const [handledMfaState, setHandledMfaState] = useState(mfaState);
  if (mfaState !== handledMfaState) {
    setHandledMfaState(mfaState);
    if (mfaState) {
      setToast(mfaState.message);
    }
  }

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    u.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
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
          <span className="whitespace-nowrap">Add user</span>
        </button>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-5 py-4 mb-6">
          Could not load users: {loadError}
        </div>
      )}

      {/* Stats row with dynamic switching layouts based on screen size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'TOTAL USERS', value: users.length },
          { label: 'ACTIVE', value: users.filter(u => u.status === 'Active').length },
          { label: 'INVITED', value: users.filter(u => u.status === 'Invited').length },
          { label: 'ADMINS', value: users.filter(u => u.role === 'admin').length },
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
            placeholder="Search by email or ID..."
            className="text-sm text-gray-700 outline-none flex-1 w-full bg-transparent"
          />
        </div>

        {/* Horizontal scroll support for small layouts */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['USER', 'ROLE', 'STATUS', 'JOINED', 'LAST SIGN-IN', ''].map((h, i) => (
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
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleStyle[user.role]}`}>
                      {roleLabel[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[user.status]}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{formatDate(user.lastSignInAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Recovery path for a user who has lost their authenticator:
                          without it they can neither sign in nor reset their password. */}
                      {user.hasMfa && (
                        <form
                          action={mfaAction}
                          onSubmit={e => {
                            if (!window.confirm(
                              `Clear two-factor authentication for ${user.email}?\n\n` +
                              'They will be able to sign in with their password alone until they enrol a new authenticator. ' +
                              'Only do this once you have confirmed their identity.'
                            )) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="userId" value={user.id} />
                          <button
                            type="submit"
                            disabled={mfaPending}
                            title="Remove this user's authenticator so they can recover their account"
                            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-600 hover:bg-amber-50 transition disabled:opacity-50"
                          >
                            Reset 2FA
                          </button>
                        </form>
                      )}

                      <form
                        action={statusAction}
                        onSubmit={e => {
                          const verb = user.status === 'Disabled' ? 're-enable' : 'disable';
                          if (!window.confirm(`Are you sure you want to ${verb} ${user.email}?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="disable" value={user.status === 'Disabled' ? 'false' : 'true'} />
                        <button
                          type="submit"
                          disabled={statusPending}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${
                            user.status === 'Disabled'
                              ? 'border-green-200 text-green-600 hover:bg-green-50'
                              : 'border-red-200 text-red-500 hover:bg-red-50'
                          }`}
                        >
                          {user.status === 'Disabled' ? 'Enable' : 'Disable'}
                        </button>
                      </form>
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

      {/* Add-user modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn transition-all duration-300">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 w-full max-w-md shadow-xl transform transition-all">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add new user</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition"
              >
                ✕
              </button>
            </div>
            <form action={inviteAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  name="name"
                  required
                  minLength={2}
                  placeholder="Jane Tan"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="investor@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  name="role"
                  defaultValue="investor"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="investor">Investor</option>
                  <option value="operations">Operations</option>
                  <option value="admin">Admin</option>
                  <option value="portfolio-manager">Portfolio Manager</option>
                </select>
              </div>
              <p className="text-xs text-gray-400 leading-normal">
                A temporary password will be generated and emailed to this address.
                The user must change it the first time they sign in.
              </p>

              {inviteState?.status === 'error' && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-3">
                  {inviteState.message}
                </p>
              )}

              {inviteState?.status === 'warning' && (
                <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-4 py-3 space-y-2">
                  <p>{inviteState.message}</p>
                  <p className="font-mono text-xs bg-white rounded px-3 py-2 border border-amber-200">
                    {inviteState.credentials.email}<br />
                    {inviteState.credentials.password}
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="w-full sm:flex-1 border border-gray-200 text-gray-600 text-sm py-2.5 rounded-lg hover:bg-gray-50 transition"
                >
                  {inviteState?.status === 'warning' ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={invitePending}
                  className="w-full sm:flex-1 bg-blue-600 text-white text-sm py-2.5 rounded-lg hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {invitePending ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast alert handling */}
      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-white/70 backdrop-blur-sm border border-gray-200 text-gray-900 text-sm px-5 py-3.5 rounded-2xl shadow-lg flex items-center gap-3 z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0 animate-slideUp">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}