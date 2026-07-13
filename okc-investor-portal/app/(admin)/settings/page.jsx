'use client';
import { useState } from 'react';

export default function SettingsPage({
  initialSecurity = {
    sessionTimeout: '10',
    maxLoginAttempts: '5',
    mfaRequired: true,
    inviteExpiry: '24',
  },
  initialTransactions = {
    minDeposit: '100000',
    minWithdrawal: '20000',
    managementFee: '1',
    largeTransactionThreshold: '500000',
  }
}) {
  const [toast, setToast] = useState(null);
  const [security, setSecurity] = useState(initialSecurity);
  const [transactions, setTransactions] = useState(initialTransactions);

  function handleSave(section) {
    setToast(`${section} settings saved successfully.`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure security rules and transaction limits.
        </p>
      </div>

      <div className="space-y-6">
        {/* Security Settings Card Frame */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Security</h2>
          <p className="text-xs text-gray-400 mb-6">Authentication profiles and global security rules.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Session timeout (minutes)</label>
              <input
                type="number"
                value={security.sessionTimeout}
                onChange={e => setSecurity(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Max login attempts before lockout</label>
              <input
                type="number"
                value={security.maxLoginAttempts}
                onChange={e => setSecurity(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Invite link expiry (hours)</label>
              <input
                type="number"
                value={security.inviteExpiry}
                onChange={e => setSecurity(prev => ({ ...prev, inviteExpiry: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-800"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-200 rounded-xl p-4 bg-gray-50/30 self-end w-full min-h-[46px]">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">Require MFA for all users</p>
                <p className="text-xs text-gray-400 leading-normal mt-0.5">Enforce setup configurations on initial authentication.</p>
              </div>
              <button
                type="button"
                onClick={() => setSecurity(prev => ({ ...prev, mfaRequired: !prev.mfaRequired }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition flex-shrink-0 self-start sm:self-auto ${
                  security.mfaRequired ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    security.mfaRequired ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            onClick={() => handleSave('Security')}
            className="mt-6 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto shadow-sm shadow-blue-500/10"
          >
            Save security settings
          </button>
        </div>

        {/* Transaction Settings Card Frame */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Transactions</h2>
          <p className="text-xs text-gray-400 mb-6">Deposit compliance targets, minimum thresholds, and management fee matrix.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Minimum deposit (SGD)', key: 'minDeposit' },
              { label: 'Minimum withdrawal (SGD)', key: 'minWithdrawal' },
              { label: 'Management fee (%)', key: 'managementFee' },
              { label: 'Large transaction threshold (SGD)', key: 'largeTransactionThreshold' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>
                <input
                  type="number"
                  value={transactions[field.key]}
                  onChange={e => setTransactions(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white text-gray-800"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50/60 rounded-xl border border-amber-100/70">
            <p className="text-xs text-amber-700 leading-normal flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0114 0z" />
              </svg>
              <span>
                <span className="font-semibold">Compliance Note:</span> Capital volumes processing above the configured large transaction threshold require secondary Master Admin authorization. Standard requests below this line bypass strict holds for automated execution by operations staff.
              </span>
            </p>
          </div>

          <button
            onClick={() => handleSave('Transaction')}
            className="mt-6 bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto shadow-sm shadow-blue-500/10"
          >
            Save transaction settings
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0 animate-fade-in">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}