'use client';

import { useState } from 'react';

const summaryCards = [
  {
    label: 'Pending Transactions',
    value: '1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      </svg>
    ),
    tone: 'text-amber-500 bg-amber-50',
  },
  {
    label: 'Pending Amount',
    value: '$10,000.00',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
    tone: 'text-blue-600 bg-blue-50',
  },
  {
    label: 'Total Requests',
    value: '1',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-2.13a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm6 0a4 4 0 1 0-5.3 3.78" />
      </svg>
    ),
    tone: 'text-gray-500 bg-gray-100',
  },
];

const tabs = [
  'Pending (1)',
  'Approved (0)',
  'Completed (0)',
  'Rejected (0)',
  'All (1)',
];

const requests = [
  {
    request: 'FF-q8eqk6qc',
    investor: 'Faye Cheah',
    investorId: 'INV-002',
    type: 'Deposit',
    amount: '$10,000.00',
    date: 'May 27, 2026',
    status: 'Pending Review',
  },
];

function RequestTypeCard({ isSelected, label, description, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center gap-3 rounded-2xl border p-4 text-left transition ${
        isSelected
          ? 'border-blue-600 bg-blue-50 shadow-sm shadow-blue-100'
          : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/40'
      }`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full ${
          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {children}
      </span>
      <span>
        <span className={`block font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
          {label}
        </span>
        <span className="mt-1 block text-xs text-gray-400">{description}</span>
      </span>
    </button>
  );
}

function NewRequestModal({ requestType, setRequestType, amount, setAmount, onClose }) {
  const submitLabel = requestType === 'deposit' ? 'Submit Deposit' : 'Submit Withdrawal';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-gray-950/45 px-4 py-8 backdrop-blur-sm sm:py-14">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-blue-950/20">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">New request</p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">New Fund Flow Request</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new request modal"
            className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div>
            <p className="mb-3 text-sm font-semibold text-gray-600">Request Type</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <RequestTypeCard
                isSelected={requestType === 'deposit'}
                label="Deposit"
                description="Add funds"
                onClick={() => setRequestType('deposit')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0-5 5m5-5 5 5" />
                </svg>
              </RequestTypeCard>
              <RequestTypeCard
                isSelected={requestType === 'withdrawal'}
                label="Withdrawal"
                description="Withdraw funds"
                onClick={() => setRequestType('withdrawal')}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m0 0-5-5m5 5 5-5" />
                </svg>
              </RequestTypeCard>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-gray-600">Amount (SGD)</span>
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
              <span className="text-lg font-semibold text-gray-400">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-lg font-semibold text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </label>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-gray-600">
            <p>
              <span className="font-bold text-gray-700">Please note:</span> All requests are subject to review and approval by operations staff. Processing typically takes 1-2 business days.
            </p>
            <p className="mt-1">You will be notified when your request is processed.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-white px-4 py-3 font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-2xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={!amount}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestTransactionContent() {
  const [activeTab, setActiveTab] = useState('Pending (1)');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [requestType, setRequestType] = useState('deposit');
  const [amount, setAmount] = useState('');

  const filteredRequests =
    activeTab === 'All (1)'
      ? requests
      : requests.filter((request) =>
          request.status.toLowerCase().includes(
            activeTab.split(' ')[0].toLowerCase()
          )
        );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-gray-500 text-sm mb-1">Good morning, <b>Faye</b>!</p>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Request Transaction</h1>
            <p className="text-gray-500 mt-2">Review your deposit and withdrawal requests.</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              type="button"
              onClick={() => setIsNewRequestOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7H5" />
              </svg>
              New Request
            </button>
            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              Investor request center
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.tone}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-4">Request</th>
                <th className="px-6 py-4">Investor</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map(request => (
                  <tr key={request.request} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-5 font-semibold text-gray-700">{request.request}</td>
                    <td className="px-6 py-5">
                      <p className="font-semibold text-gray-900">{request.investor}</p>
                      <p className="text-xs text-gray-400 mt-1">{request.investorId}</p>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0-5 5m5-5 5 5" />
                          </svg>
                        </span>
                        {request.type}
                      </span>
                    </td>
                    <td className="px-6 py-5 font-bold text-emerald-500">{request.amount}</td>
                    <td className="px-6 py-5 text-gray-500">{request.date}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-600">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No requests found for this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isNewRequestOpen && (
        <NewRequestModal
          requestType={requestType}
          setRequestType={setRequestType}
          amount={amount}
          setAmount={setAmount}
          onClose={() => setIsNewRequestOpen(false)}
        />
      )}
    </div>
  );
}

export default function RequestTransactionPage() {
  return <RequestTransactionContent />;
}