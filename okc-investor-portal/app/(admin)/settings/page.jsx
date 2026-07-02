'use client';
import { useState } from 'react';

export default function SettingsPage() {
  const [toast, setToast] = useState(null);

  const [general, setGeneral] = useState({
    portalName: 'OKC Capital Investor Portal',
    contactEmail: 'im@okccapital.sg',
    navUpdateTime: '19:00',
    timezone: 'Asia/Singapore',
  });

  const [security, setSecurity] = useState({
    sessionTimeout: '10',
    maxLoginAttempts: '5',
    mfaRequired: true,
    inviteExpiry: '24',
  });

  const [transactions, setTransactions] = useState({
    minDeposit: '100000',
    minWithdrawal: '20000',
    managementFee: '1',
    largeTransactionThreshold: '500000',
  });

  function handleSave(section) {
    setToast(`${section} settings saved successfully.`);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">
          Configure portal behaviour, security rules, and transaction limits.
        </p>
      </div>

      <div className="space-y-6">

        {/* General Settings */}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={general[field.key]}
                  onChange={e => setGeneral(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => handleSave('General')}
            className="mt-6 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Save general settings
          </button>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Security</h2>
          <p className="text-xs text-gray-400 mb-6">Authentication and access control rules.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session timeout (minutes)
              </label>
              <input
                type="number"
                value={security.sessionTimeout}
                onChange={e => setSecurity(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max login attempts before lockout
              </label>
              <input
                type="number"
                value={security.maxLoginAttempts}
                onChange={e => setSecurity(prev => ({ ...prev, maxLoginAttempts: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invite link expiry (hours)
              </label>
              <input
                type="number"
                value={security.inviteExpiry}
                onChange={e => setSecurity(prev => ({ ...prev, inviteExpiry: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            
            {/* Optimized MFA Panel Block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-gray-200 rounded-lg p-4 bg-gray-50/30">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700">Require MFA for all users</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-normal">Users must complete MFA setup on first login</p>
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
            className="mt-6 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Save security settings
          </button>
        </div>

        {/* Transaction Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Transactions</h2>
          <p className="text-xs text-gray-400 mb-6">
            Deposit, withdrawal, and fee configuration.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: 'Minimum deposit (SGD)', key: 'minDeposit' },
              { label: 'Minimum withdrawal (SGD)', key: 'minWithdrawal' },
              { label: 'Management fee (%)', key: 'managementFee' },
              { label: 'Large transaction threshold (SGD)', key: 'largeTransactionThreshold' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                <input
                  type="number"
                  value={transactions[field.key]}
                  onChange={e => setTransactions(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-xs text-yellow-700 leading-normal">
              <span className="font-semibold">Note:</span> Transactions above the large transaction threshold require Admin approval. All others can be approved by Operations staff.
            </p>
          </div>
          <button
            onClick={() => handleSave('Transaction')}
            className="mt-6 bg-blue-600 text-white text-sm px-5 py-2.5 rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            Save transaction settings
          </button>
        </div>

      </div>

      {/* Toast */}
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