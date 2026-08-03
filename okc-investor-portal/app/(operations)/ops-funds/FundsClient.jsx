'use client';

import { useActionState, useEffect, useState } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';
import { createFund } from './actions';
import { FUND_CURRENCIES, FUND_RISK_LEVELS } from './constants';

const riskStyle = {
  Low: 'bg-green-50 text-green-600',
  Moderate: 'bg-amber-50 text-amber-600',
  High: 'bg-red-50 text-red-500',
};

export default function FundsClient({ funds }) {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [state, formAction, isPending] = useActionState(createFund, undefined);

  // Close the modal and surface a toast when creation succeeds.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.status === 'success') {
      setShowModal(false);
      setToast(state.message);
    }
  }

  // Auto-dismiss the toast.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const totalAum = funds.reduce((s, f) => s + f.aum, 0);
  const totalPnl = funds.reduce((s, f) => s + f.totalPnl, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Funds</h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage the fund products investors can deposit into.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white transition hover:bg-blue-700"
          type="button"
        >
          <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="whitespace-nowrap">Add fund</span>
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'FUND PRODUCTS', value: String(funds.length) },
          { label: 'COMBINED AUM', value: fmtMoney(totalAum) },
          { label: 'COMBINED TOTAL P&L', value: fmtMoney(totalPnl), signed: totalPnl },
        ].map(card => (
          <div key={card.label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{card.label}</p>
            <p
              className={`mt-2 text-2xl font-bold ${
                card.signed === undefined
                  ? 'text-gray-900'
                  : card.signed >= 0
                    ? 'text-green-600'
                    : 'text-red-500'
              }`}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Fund list */}
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Fund Directory</p>
        <h2 className="mt-2 text-lg font-bold text-gray-900">Products offered to investors</h2>

        <div className="mt-5 grid gap-3">
          {funds.map(fund => (
            <div
              key={fund.id}
              className="flex flex-col gap-4 rounded-lg border border-gray-100 p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
                  {fund.code.slice(0, 4)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{fund.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${riskStyle[fund.riskLevel] ?? 'bg-gray-100 text-gray-600'}`}>
                      {fund.riskLevel} risk
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {fund.strategy || fund.description || 'No strategy description'}
                    {' · '}since {fmtDate(fund.inceptionDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-gray-400">AUM ({fund.currency})</p>
                  <p className="text-sm font-bold text-gray-900">{fmtMoney(fund.aum)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Total P&L</p>
                  <p className={`text-sm font-bold ${fund.totalPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtMoney(fund.totalPnl)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Return</p>
                  <p className={`text-sm font-bold ${fund.returnPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fund.returnPct.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
          {funds.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              No funds yet — add the first product above.
            </p>
          )}
        </div>
      </section>

      {/* Add-fund modal with blurred background */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn transition-all duration-300">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl transform transition-all sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Add new fund</h2>
                <p className="mt-1 text-xs text-gray-400">
                  The fund becomes available for investor deposits immediately.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
                type="button"
              >
                ✕
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Code</label>
                  <input
                    type="text"
                    name="code"
                    required
                    minLength={2}
                    maxLength={10}
                    pattern="[A-Za-z0-9]{2,10}"
                    placeholder="XAU"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Fund name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    minLength={3}
                    maxLength={80}
                    placeholder="OKC Gold Momentum Fund"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Currency</label>
                  <select
                    name="currency"
                    defaultValue="SGD"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FUND_CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Risk level</label>
                  <select
                    name="riskLevel"
                    defaultValue="High"
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FUND_RISK_LEVELS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Inception date</label>
                  <input
                    type="date"
                    name="inceptionDate"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Strategy <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  name="strategy"
                  maxLength={120}
                  placeholder="Systematic gold futures momentum"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  name="description"
                  maxLength={500}
                  rows={3}
                  placeholder="Shown to investors alongside the fund."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {state?.status === 'error' && (
                <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-500">{state.message}</p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 sm:flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-sm text-white transition hover:bg-blue-700 disabled:opacity-60 sm:flex-1"
                >
                  {isPending ? 'Creating…' : 'Create fund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-6 right-6 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg sm:left-auto sm:right-6 sm:mx-0 sm:max-w-md">
          <svg className="h-4 w-4 flex-shrink-0 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}