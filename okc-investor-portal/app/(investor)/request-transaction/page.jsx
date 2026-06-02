'use client';

import { useState, useMemo } from 'react';

// Unified data array containing both historical actions from activity log and active pipeline requests
const initialRequests = [
  {
    request: 'FF-q8eqk6qc',
    investor: 'Faye Cheah',
    investorId: 'INV-204812',
    type: 'Deposit',
    amount: '$10,000.00',
    date: 'May 27, 2026',
    status: 'Pending Review',
  },
  {
    request: 'TXN-001',
    investor: 'Faye Cheah',
    investorId: 'INV-204812', 
    type: 'Deposit', // Restored missing type
    amount: '$50,000.00',
    date: '17 Mar 2026',
    status: 'Completed',
  },
  {
    request: 'TXN-022',
    investor: 'Faye Cheah',
    investorId: 'INV-204812',
    type: 'Withdrawal',
    amount: '$10,000.00',
    date: '15 Apr 2026',
    status: 'Completed',
  }
];

// Helper tools to parse strings smoothly for runtime calculations
const parseAmount = (str) => parseFloat(str.replace(/[+$,\s]/g, '')) || 0;

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

function NewRequestModal({ requestType, setRequestType, amount, setAmount, onClose, onSubmit }) {
  const submitLabel = requestType === 'deposit' ? 'Submit Deposit' : 'Submit Withdrawal';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-blue-950/20">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">New Request</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">New Fund Flow Request</h2>
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
            onClick={onSubmit}
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
  const [requestsList, setRequestsList] = useState(initialRequests);
  const [activeTab, setActiveTab] = useState('Pending');
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [requestType, setRequestType] = useState('deposit');
  const [amount, setAmount] = useState('');

  const counts = useMemo(() => {
    return {
      pending: requestsList.filter(r => r.status.toLowerCase().includes('pending')).length,
      approved: requestsList.filter(r => r.status === 'Approved' || r.status === 'Completed').length,
      completed: requestsList.filter(r => r.status === 'Completed').length,
      rejected: requestsList.filter(r => r.status === 'Rejected').length,
      all: requestsList.length,
    };
  }, [requestsList]);

  const tabs = [
    { id: 'Pending', label: `Pending (${counts.pending})` },
    { id: 'Approved', label: `Approved (${counts.approved})` },
    { id: 'Rejected', label: `Rejected (${counts.rejected})` },
    { id: 'Completed', label: `Completed (${counts.completed})` },
    { id: 'All', label: `All (${counts.all})` },
  ];

  const metrics = useMemo(() => {
    const pendingItems = requestsList.filter(r => r.status.toLowerCase().includes('pending'));
    const totalPendingAmt = pendingItems.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
    
    return {
      pendingCount: pendingItems.length,
      pendingAmountStr: `$${totalPendingAmt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      totalRequests: requestsList.length,
    };
  }, [requestsList]);

  const filteredRequests = useMemo(() => {
    if (activeTab === 'All') return requestsList;
    if (activeTab === 'Approved') {
      return requestsList.filter(r => r.status === 'Approved' || r.status === 'Completed');
    }
    return requestsList.filter((request) =>
      request.status.toLowerCase().includes(activeTab.toLowerCase())
    );
  }, [activeTab, requestsList]);

  const handleCreateRequest = () => {
    const formattedAmount = parseFloat(amount);
    if (isNaN(formattedAmount) || formattedAmount <= 0) return;

    const newRow = {
      request: `FF-${Math.random().toString(36).substring(2, 11)}`,
      investor: 'Faye Cheah',
      investorId: 'INV-204812',
      type: requestType.charAt(0).toUpperCase() + requestType.slice(1),
      amount: `$${formattedAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Pending Review',
    };

    setRequestsList([newRow, ...requestsList]);
    setAmount('');
    setIsNewRequestOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Request Transaction</h1>
            <p className="text-gray-500 mt-2">Review your deposit and withdrawal requests.</p>
          </div>
          <div>
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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-amber-500 bg-amber-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Pending Transactions</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.pendingCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-blue-600 bg-blue-50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Pending Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.pendingAmountStr}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-500 bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m6-2.13a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm6 0a4 4 0 1 0-5.3 3.78" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-400 font-medium">Total Requests</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalRequests}</p>
          </div>
        </div>
      </div>

      <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm overflow-x-auto max-w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-4">Request</th>
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
                      <span className="inline-flex items-center gap-2 font-medium text-gray-700">
                        {request.type === 'Deposit' ? (
                          <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0-5 5m5-5 5 5" />
                            </svg>
                          </span>
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v14m0 0-5-5m5 5 5-5" />
                            </svg>
                          </span>
                        )}
                        {request.type}
                      </span>
                    </td>
                    <td className={`px-6 py-5 font-bold ${request.type === 'Deposit' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {request.amount}
                    </td>
                    <td className="px-6 py-5 text-gray-500">{request.date}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                        request.status === 'Completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
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
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
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
          onSubmit={handleCreateRequest}
        />
      )}
    </div>
  );
}

export default function RequestTransactionPage() {
  return <RequestTransactionContent />;
}