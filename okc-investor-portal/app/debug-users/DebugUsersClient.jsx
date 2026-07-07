'use client';

import { useActionState } from 'react';
import { createDebugUser, deleteAllUsers } from './actions';

export default function DebugUsersClient() {
  const [createState, createFormAction, isCreating] = useActionState(createDebugUser, undefined);
  const [deleteState, deleteFormAction, isDeleting] = useActionState(deleteAllUsers, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md space-y-6">

        <div className="panel border-amber-300">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">
            Debug tool · not available in production
          </p>

          <h1 className="mb-6 text-2xl font-bold text-slate-900">
            Create test user
          </h1>

          <form action={createFormAction} className="space-y-4">
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
              <select id="role" name="role" defaultValue="investor" className="debug-input bg-white">
                <option value="investor">Investor</option>
                <option value="operations">Operations</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            {createState?.message && (
              <p
                className={`status-message ${
                  createState.status === 'success' ? 'status-success' : 'bg-red-50 text-red-700'
                }`}
              >
                {createState.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="debug-button bg-slate-900 hover:bg-slate-700"
            >
              {isCreating ? 'Creating…' : 'Create user'}
            </button>
          </form>
        </div>

        <div className="panel border-red-300">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
            Destructive · deletes every Supabase auth user
          </p>

          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Remove all users
          </h2>

          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              if (!window.confirm('Delete ALL users from Supabase auth? This cannot be undone.')) {
                event.preventDefault();
              }
            }}
          >
            {deleteState?.message && (
              <p
                className={`status-message mb-4 ${
                  deleteState.status === 'success' ? 'status-success' : 'bg-red-50 text-red-700'
                }`}
              >
                {deleteState.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isDeleting}
              className="debug-button bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting…' : 'Remove all users'}
            </button>
          </form>
        </div>

      </div>
    </main>
  );
}
