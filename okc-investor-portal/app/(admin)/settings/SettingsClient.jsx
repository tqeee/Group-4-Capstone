'use client';
import { useActionState, useEffect, useState } from 'react';
import { updateSettings } from './actions';

const inputClass =
  'w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export default function SettingsClient({ settings }) {
  const [state, formAction, isPending] = useActionState(updateSettings, undefined);
  const [toast, setToast] = useState(null);

  // Surface a toast when a save lands.
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.status === 'success') setToast(state.message);
  }
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure portal behaviour and transaction limits. Values are stored in the database
          and enforced when investors submit requests.
        </p>
      </div>

      <form action={formAction} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">General</h2>
          <p className="text-xs text-gray-400 mb-6">Basic portal configuration.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Portal name', key: 'portalName', type: 'text' },
              { label: 'Contact email', key: 'contactEmail', type: 'email' },
              { label: 'NAV update time (SGT)', key: 'navUpdateTime', type: 'time' },
              { label: 'Timezone', key: 'timezone', type: 'text' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.key}>
                  {field.label}
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  type={field.type}
                  defaultValue={settings[field.key]}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Transactions</h2>
          <p className="text-xs text-gray-400 mb-6">
            Deposit, withdrawal, and fee configuration — enforced on new fund-flow requests.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Minimum deposit (SGD)', key: 'minDeposit' },
              { label: 'Minimum withdrawal (SGD)', key: 'minWithdrawal' },
              { label: 'Management fee (%)', key: 'managementFee' },
              { label: 'Large transaction threshold (SGD)', key: 'largeTransactionThreshold' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={field.key}>
                  {field.label}
                </label>
                <input
                  id={field.key}
                  name={field.key}
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={settings[field.key]}
                  className={inputClass}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-700 leading-normal">
              <span className="font-semibold">Note:</span> Requests at or above the large
              transaction threshold are flagged to Operations during review. Session security
              (timeouts, lockouts, MFA) is managed by Supabase Auth. The management fee is an
              annual rate accrued daily against each fund&apos;s NAV and deducted from investor
              P&amp;L. Since ledgers are fully recomputed on every rebuild (deposit/withdrawal
              approval or data import), changing this rate reapplies it across each fund&apos;s
              entire history the next time its ledger is rebuilt.
            </p>
          </div>
        </div>

        {state?.status === 'error' && (
          <p className="auth-status-message status-error">{state.message}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white text-sm px-6 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto disabled:opacity-60"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 max-w-sm mx-auto sm:mx-0">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}
