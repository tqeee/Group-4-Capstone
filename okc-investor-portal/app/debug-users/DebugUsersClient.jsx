'use client';

import { useActionState, useState } from 'react';
import { createDebugUser, deleteAccounts, clearAuditLogs } from './actions';

function Status({ state }) {
  if (!state?.message) return null;
  return (
    <p
      className={`status-message ${
        state.status === 'success' ? 'status-success' : 'bg-red-50 text-red-700'
      }`}
    >
      {state.message}
    </p>
  );
}

const ROLE_STYLES = {
  investor: 'bg-blue-50 text-blue-700',
  operations: 'bg-amber-50 text-amber-700',
  admin: 'bg-purple-50 text-purple-700',
  'portfolio-manager': 'bg-emerald-50 text-emerald-700',
};

export default function DebugUsersClient({ snapshot, error }) {
  const [createState, createFormAction, isCreating] = useActionState(createDebugUser, undefined);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteAccounts, undefined);
  const [logState, logFormAction, isClearing] = useActionState(clearAuditLogs, undefined);
  const [selected, setSelected] = useState([]);

  const accounts = snapshot?.accounts ?? [];
  const logs = snapshot?.logs ?? { total: 0, login: 0, user: 0, flow: 0, olderThan24h: 0 };

  const selectable = accounts.filter((a) => !a.isCurrentUser);
  const allSelected = selectable.length > 0 && selected.length === selectable.length;

  const toggle = (key) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const toggleAll = () => setSelected(allSelected ? [] : selectable.map((a) => a.key));

  const chosen = accounts.filter((a) => selected.includes(a.key));
  const blastRadius = chosen.reduce(
    (acc, a) => ({
      flows: acc.flows + a.counts.flows,
      ledger: acc.ledger + a.counts.ledger,
      preferences: acc.preferences + a.counts.preferences,
    }),
    { flows: 0, ledger: 0, preferences: 0 }
  );

  // The purge is the only irreversible action here, so its confirm dialog
  // names the exact row counts rather than asking "are you sure?".
  const confirmDelete = (event) => {
    const mode = event.nativeEvent.submitter?.value;
    if (selected.length === 0) return;

    const names = chosen.map((a) => a.email).join('\n  ');
    const question =
      mode === 'purge'
        ? `PURGE ${chosen.length} account(s) and ALL their data?\n\n  ${names}\n\n` +
          `This deletes ${blastRadius.flows} fund flow(s), ${blastRadius.ledger} ledger row(s) ` +
          `and ${blastRadius.preferences} preference(s). It cannot be undone.`
        : `Delete the login for ${chosen.length} account(s)?\n\n  ${names}\n\n` +
          `Profiles and financial history are kept. Recreating the same email re-adopts them.`;

    if (!window.confirm(question)) event.preventDefault();
    else setSelected([]);
  };

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            Debug tool · not available in production · nothing here is audited
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Debug users &amp; logs</h1>
        </div>

        {snapshot && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="font-semibold">Connected to {snapshot.projectRef}</span>
            {' — the shared team Supabase project. '}
            Deletions here affect your teammates&apos; accounts for real.
            {snapshot.currentEmail ? (
              <> You are signed in as <span className="font-mono">{snapshot.currentEmail}</span>.</>
            ) : (
              <> You are not signed in.</>
            )}
          </div>
        )}

        {error && <p className="status-message bg-red-50 text-red-700">{error}</p>}

        {/* ---------------------------------------------------- accounts */}
        <div className="panel border-slate-300">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-slate-900">Accounts</h2>
            <span className="text-xs text-slate-500">
              {accounts.length} total · {selected.length} selected
            </span>
          </div>

          <form action={deleteFormAction} onSubmit={confirmDelete}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all deletable accounts"
                      />
                    </th>
                    <th className="px-2 py-2 font-semibold">Email</th>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Role</th>
                    <th className="px-2 py-2 font-semibold">Login</th>
                    <th className="px-2 py-2 font-semibold">Profile</th>
                    <th className="px-2 py-2 text-right font-semibold">Flows</th>
                    <th className="px-2 py-2 text-right font-semibold">Ledger</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {accounts.map((a) => (
                    <tr key={a.key} className={a.isCurrentUser ? 'bg-slate-50' : undefined}>
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          name="selected"
                          value={a.key}
                          checked={selected.includes(a.key)}
                          onChange={() => toggle(a.key)}
                          disabled={a.isCurrentUser}
                          aria-label={`Select ${a.email}`}
                        />
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-slate-800">
                        {a.email}
                        {a.isCurrentUser && (
                          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-600">
                            you
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{a.name ?? '—'}</td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                            ROLE_STYLES[a.role] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {a.role}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {a.authUserId ? (
                          <span className="text-emerald-700">yes</span>
                        ) : (
                          <span className="text-slate-400">none</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs">
                        {a.investorId ? (
                          <span className="text-emerald-700">yes</span>
                        ) : (
                          <span className="text-slate-400">none</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {a.counts.flows || '—'}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums text-slate-600">
                        {a.counts.ledger || '—'}
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-2 py-6 text-center text-slate-400">
                        No accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3">
              <Status state={deleteState} />

              {selected.length > 0 && (
                <p className="text-xs text-slate-500">
                  Purging the {selected.length} selected account(s) would also delete{' '}
                  <span className="font-semibold text-slate-700">{blastRadius.flows}</span> flow(s),{' '}
                  <span className="font-semibold text-slate-700">{blastRadius.ledger}</span> ledger
                  row(s) and{' '}
                  <span className="font-semibold text-slate-700">{blastRadius.preferences}</span>{' '}
                  preference(s).
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  name="mode"
                  value="login"
                  disabled={isDeleting || selected.length === 0}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Working…' : 'Delete login only'}
                </button>
                <button
                  type="submit"
                  name="mode"
                  value="purge"
                  disabled={isDeleting || selected.length === 0}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? 'Working…' : 'Purge account + all data'}
                </button>
              </div>

              <p className="text-xs text-slate-500">
                <span className="font-semibold">Delete login</span> removes the Supabase auth user
                only — the profile is unlinked but keeps its financial history, and recreating the
                same email re-adopts it.{' '}
                <span className="font-semibold">Purge</span> also deletes the profile and every
                flow, ledger row and preference it owns. That one is irreversible.
              </p>
            </div>
          </form>
        </div>

        {/* -------------------------------------------------------- logs */}
        <div className="panel border-slate-300">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold text-slate-900">Audit logs</h2>
            <span className="text-xs text-slate-500">{logs.total} rows</span>
          </div>

          <form action={logFormAction} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { scope: 'all', label: 'Clear all', count: logs.total, danger: true },
                { scope: 'LOGIN', label: 'Clear LOGIN*', count: logs.login },
                { scope: 'USER', label: 'Clear USER*', count: logs.user },
                { scope: 'FLOW', label: 'Clear FLOW*', count: logs.flow },
                { scope: 'older24h', label: 'Clear older than 24h', count: logs.olderThan24h },
              ].map((b) => (
                <button
                  key={b.scope}
                  type="submit"
                  name="scope"
                  value={b.scope}
                  disabled={isClearing || b.count === 0}
                  onClick={(event) => {
                    if (
                      !window.confirm(
                        `Delete ${b.count} audit log row(s)? (${b.label}) This cannot be undone.`
                      )
                    ) {
                      event.preventDefault();
                    }
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    b.danger
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {b.label}{' '}
                  <span className={b.danger ? 'text-red-100' : 'text-slate-400'}>({b.count})</span>
                </button>
              ))}
            </div>

            <Status state={logState} />

            <p className="text-xs text-slate-500">
              Counts are live, so each button shows exactly how many rows it will remove. The audit
              trail is the §3.1 compliance record — clearing it is for wiping test noise, not
              something to do on data you care about.
            </p>
          </form>
        </div>

        {/* ------------------------------------------------ create user */}
        <div className="panel border-slate-300">
          <h2 className="mb-4 text-xl font-bold text-slate-900">Create test user</h2>

          <form action={createFormAction} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="email" className="debug-label">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="test@example.com"
                  className="debug-input"
                />
              </div>
              <div>
                <label htmlFor="password" className="debug-label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="text"
                  required
                  minLength={6}
                  autoComplete="off"
                  placeholder="At least 6 characters"
                  className="debug-input"
                />
              </div>
              <div>
                <label htmlFor="role" className="debug-label">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  defaultValue="investor"
                  className="debug-input bg-white"
                >
                  <option value="investor">Investor</option>
                  <option value="operations">Operations</option>
                  <option value="admin">Administrator</option>
                  <option value="portfolio-manager">Portfolio manager</option>
                </select>
              </div>
            </div>

            <Status state={createState} />

            <button
              type="submit"
              disabled={isCreating}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
