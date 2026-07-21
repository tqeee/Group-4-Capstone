'use client';

import { useActionState, useMemo, useState } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';
import { submitFlowRequest } from './actions';

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

const statusStyle = {
  Pending: 'bg-amber-50 text-amber-600',
  Approved: 'bg-blue-50 text-blue-600',
  Completed: 'bg-green-50 text-green-600',
  Rejected: 'bg-red-50 text-red-500',
};

export default function RequestTransactionClient({ requests, funds, minDeposit, minWithdrawal }) {
  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('deposit');
  const [state, formAction, isPending] = useActionState(submitFlowRequest, undefined);

  // Close the modal when a submission succeeds (render-time adjustment).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.status === 'success') setIsModalOpen(false);
  }

  const counts = useMemo(
    () => ({
      All: requests.length,
      Pending: requests.filter(r => r.status === 'Pending').length,
      Approved: requests.filter(r => r.status === 'Approved' || r.status === 'Completed').length,
      Rejected: requests.filter(r => r.status === 'Rejected').length,
    }),
    [requests]
  );

  const filtered = useMemo(() => {
    if (activeTab === 'All') return requests;
    if (activeTab === 'Approved')
      return requests.filter(r => r.status === 'Approved' || r.status === 'Completed');
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const pendingAmount = requests
    .filter(r => r.status === 'Pending')
    .reduce((s, r) => s + r.amount, 0);

  const minAmount = requestType === 'deposit' ? minDeposit : minWithdrawal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Request Transaction</h1>
          <p className="text-gray-500 mt-2">Submit and track your deposit and withdrawal requests.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 self-start"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m7-7H5" />
          </svg>
          New Request
        </button>
      </div>

      {state?.status === 'success' && (
        <p className="auth-status-message status-success">{state.message}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Pending Requests', value: String(counts.Pending), tone: 'text-amber-500 bg-amber-50' },
          { label: 'Pending Amount', value: fmtMoney(pendingAmount), tone: 'text-blue-600 bg-blue-50' },
          { label: 'Total Requests', value: String(counts.All), tone: 'text-gray-500 bg-gray-100' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${card.tone}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-medium">{card.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="inline-flex rounded-xl bg-white border border-gray-200 p-1 shadow-sm overflow-x-auto max-w-full">
        {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-blue-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab} ({counts[tab]})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <th className="px-6 py-4">Request</th>
                <th className="px-6 py-4">Fund</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Requested</th>
                <th className="px-6 py-4">Processed</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map(request => (
                  <tr key={request.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-6 py-5 font-mono text-xs text-gray-500">
                      {request.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700">{request.fund}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            request.type === 'Deposit'
                              ? 'bg-emerald-50 text-emerald-500'
                              : 'bg-orange-50 text-orange-500'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {request.type === 'Deposit' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19V5m0 0-5 5m5-5 5 5" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 5v14m0 0-5-5m5 5 5-5" />
                            )}
                          </svg>
                        </span>
                        {request.type}
                      </span>
                    </td>
                    <td className={`px-6 py-5 text-sm font-bold ${request.type === 'Deposit' ? 'text-emerald-500' : 'text-orange-500'}`}>
                      {fmtMoney(request.amount)}
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">{fmtDate(request.requestDate)}</td>
                    <td className="px-6 py-5 text-sm text-gray-500">{fmtDate(request.processedDate)}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusStyle[request.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                    No requests found for this status.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-blue-950/20">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">New Request</p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">New Fund Flow Request</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close new request modal"
                className="rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form action={formAction}>
              <input type="hidden" name="type" value={requestType} />
              <div className="space-y-6 px-6 py-6">
                <div>
                  <p className="mb-3 text-sm font-semibold text-gray-600">Request Type</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <RequestTypeCard
                      isSelected={requestType === 'deposit'}
                      label="Deposit"
                      description={`Add funds · min ${fmtMoney(minDeposit)}`}
                      onClick={() => setRequestType('deposit')}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0-5 5m5-5 5 5" />
                      </svg>
                    </RequestTypeCard>
                    <RequestTypeCard
                      isSelected={requestType === 'withdrawal'}
                      label="Withdrawal"
                      description={`Withdraw funds · min ${fmtMoney(minWithdrawal)}`}
                      onClick={() => setRequestType('withdrawal')}
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 5v14m0 0-5-5m5 5 5-5" />
                      </svg>
                    </RequestTypeCard>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-600">Fund</span>
                  <select
                    name="fundId"
                    defaultValue={funds[0]?.id}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  >
                    {funds.map(fund => (
                      <option key={fund.id} value={fund.id}>
                        {fund.name} ({fund.currency})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-600">Amount (SGD)</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
                    <span className="text-lg font-semibold text-gray-400">$</span>
                    <input
                      type="number"
                      name="amount"
                      min={minAmount}
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full bg-transparent text-lg font-semibold text-gray-900 outline-none placeholder:text-gray-400"
                    />
                  </div>
                </label>

                {state?.status === 'error' && (
                  <p className="auth-status-message status-error">{state.message}</p>
                )}

                <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-gray-600">
                  <p>
                    <span className="font-bold text-gray-700">Please note:</span> All requests are
                    subject to review and approval by operations staff. Submitting a request does
                    not move funds until it is approved and processed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t border-gray-100 bg-gray-50 px-6 py-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl bg-white px-4 py-3 font-semibold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-2xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isPending
                    ? 'Submitting…'
                    : requestType === 'deposit'
                      ? 'Submit Deposit'
                      : 'Submit Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
