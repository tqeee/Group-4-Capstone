'use client';

import { useActionState, useMemo, useState } from 'react';
import StatusBadge from '@/components/operations/StatusBadge';
import { fmtDate, fmtMoney } from '@/lib/format';
import { RISK_TOLERANCE_STYLE, riskToleranceLabel } from '@/lib/riskTolerance';
import { reviewFlow, confirmReceipt } from './actions';

const FILTERS = ['All', 'Pending Transaction', 'Pending Receipt', 'Completed', 'Rejected'];

export default function OpsTransactionsClient({ flows, largeThreshold }) {
  const [activeFilter, setActiveFilter] = useState('Pending Transaction');
  const [reviewing, setReviewing] = useState(null); // flow being approved/rejected (PENDING)
  const [decision, setDecision] = useState('approve');
  const [confirming, setConfirming] = useState(null); // flow being confirmed/rejected (PENDING_RECEIPT)
  const [receiptDecision, setReceiptDecision] = useState('complete');
  const [state, formAction, isPending] = useActionState(reviewFlow, undefined);
  const [receiptState, receiptFormAction, isReceiptPending] = useActionState(confirmReceipt, undefined);

  // Close the modals when a review/confirmation lands (render-time adjustment).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.status === 'success' || state?.status === 'warning') setReviewing(null);
  }
  const [handledReceiptState, setHandledReceiptState] = useState(receiptState);
  if (receiptState !== handledReceiptState) {
    setHandledReceiptState(receiptState);
    if (receiptState?.status === 'success') setConfirming(null);
  }

  const counts = useMemo(() => {
    const map = { All: flows.length };
    for (const f of ['Pending Transaction', 'Pending Receipt', 'Completed', 'Rejected']) {
      map[f] = flows.filter(x => x.status === f).length;
    }
    return map;
  }, [flows]);

  const filtered = activeFilter === 'All' ? flows : flows.filter(f => f.status === activeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Review investor deposit and withdrawal requests. Approving a withdrawal pays out and
          completes it immediately. Approving a deposit emails bank transfer details — the
          fund ledger is only updated once you confirm receipt of the investor&apos;s transfer.
        </p>
      </div>

      {state?.status === 'success' && (
        <p className="auth-status-message status-success">{state.message}</p>
      )}
      {state?.status === 'warning' && (
        <p className="auth-status-message status-error">{state.message}</p>
      )}
      {receiptState?.status === 'success' && (
        <p className="auth-status-message status-success">{receiptState.message}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending transaction', value: String(counts['Pending Transaction']), red: counts['Pending Transaction'] > 0 },
          { label: 'Pending receipt', value: String(counts['Pending Receipt']), red: counts['Pending Receipt'] > 0 },
          { label: 'Total requests', value: String(counts.All), red: false },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.red ? 'text-amber-600' : 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
              activeFilter === f
                ? 'bg-blue-700 text-white'
                : 'border border-gray-200 bg-white text-gray-500 hover:text-gray-700'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Investor</th>
                <th className="px-4 py-3 font-semibold">Fund</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Requested</th>
                <th className="px-4 py-3 font-semibold">Processed</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Reviewed by</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(flow => (
                <tr key={flow.id} className="transition hover:bg-gray-50">
                  <td className="px-4 py-4 font-mono text-xs text-gray-500">
                    {flow.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">{flow.investorName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{flow.investorEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{flow.fund}</td>
                  <td className="px-4 py-4 text-gray-600">{flow.type}</td>
                  <td className="px-4 py-4">
                    <span className="font-bold text-gray-900">{fmtMoney(flow.amount)}</span>
                    {flow.amount >= largeThreshold && (
                      <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-500">
                        Large
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-gray-600">{fmtDate(flow.requestDate)}</td>
                  <td className="px-4 py-4 text-gray-600">{fmtDate(flow.processedDate)}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={flow.status} />
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500">{flow.reviewedBy ?? '—'}</td>
                  <td className="px-4 py-4 text-right">
                    {flow.rawStatus === 'PENDING' ? (
                      <button
                        onClick={() => {
                          setReviewing(flow);
                          setDecision('approve');
                        }}
                        className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
                      >
                        Review
                      </button>
                    ) : flow.rawStatus === 'AWAITING_PROOF' ? (
                      <span className="text-xs text-gray-400">Awaiting investor</span>
                    ) : flow.rawStatus === 'PENDING_RECEIPT' ? (
                      <button
                        onClick={() => {
                          setConfirming(flow);
                          setReceiptDecision('complete');
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Confirm receipt
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                    No {activeFilter === 'All' ? '' : activeFilter.toLowerCase() + ' '}requests.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {reviewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Review Request</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {reviewing.type} · {fmtMoney(reviewing.amount)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {reviewing.investorName} · requested {fmtDate(reviewing.requestDate)}
                </p>
              </div>
              <button
                className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
                onClick={() => setReviewing(null)}
                type="button"
              >
                ×
              </button>
            </div>

            {reviewing.amount >= largeThreshold && (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                This amount is at or above the large-transaction threshold of{' '}
                {fmtMoney(largeThreshold)} — double-check before approving.
              </p>
            )}

            {reviewing.type === 'Deposit' && (
              <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700">
                Approving will email bank transfer details to the investor. The fund ledger
                won&apos;t be updated until you confirm receipt of their transfer.
              </p>
            )}

            {/* 3.4: the mandate this money is to be managed under. Shown at the
                point of approval so ops act on it rather than discovering it
                later. `riskTolerance` is what the investor chose on this
                request; `currentRiskTolerance` is their standing instruction —
                they differ only if it was changed after submitting. */}
            {(reviewing.riskTolerance || reviewing.currentRiskTolerance) && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Investor risk tolerance
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      RISK_TOLERANCE_STYLE[reviewing.riskTolerance ?? reviewing.currentRiskTolerance] ??
                      'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {riskToleranceLabel(reviewing.riskTolerance ?? reviewing.currentRiskTolerance)}
                  </span>
                  <span className="text-gray-500">for {reviewing.fund}</span>
                </div>
                {reviewing.riskTolerance &&
                  reviewing.currentRiskTolerance &&
                  reviewing.riskTolerance !== reviewing.currentRiskTolerance && (
                    <p className="mt-2 text-xs text-amber-700">
                      Requested as {riskToleranceLabel(reviewing.riskTolerance)}, but their standing
                      instruction for this fund is now{' '}
                      {riskToleranceLabel(reviewing.currentRiskTolerance)}.
                    </p>
                  )}
              </div>
            )}

            {reviewing.note && (
              <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Investor note: {reviewing.note}
              </p>
            )}

            <form action={formAction} className="mt-5 space-y-5">
              <input type="hidden" name="flowId" value={reviewing.id} />
              <input type="hidden" name="decision" value={decision} />

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">
                  Comment <span className="font-normal">(Optional)</span>
                </span>
                <textarea
                  name="comment"
                  maxLength={300}
                  placeholder="Add a comment about this decision..."
                  className="mt-2 h-24 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {state?.status === 'error' && (
                <p className="auth-status-message status-error">{state.message}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={isPending}
                  onClick={() => setDecision('reject')}
                  className="rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {isPending && decision === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  onClick={() => setDecision('approve')}
                  className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                >
                  {isPending && decision === 'approve' ? 'Approving…' : 'Approve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Confirm Receipt</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {confirming.type} · {fmtMoney(confirming.amount)}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {confirming.investorName} · requested {fmtDate(confirming.requestDate)}
                </p>
              </div>
              <button
                className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
                onClick={() => setConfirming(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              Investor&apos;s proof of transfer: <span className="font-semibold text-gray-900">{confirming.proofOfTransfer || '—'}</span>
            </p>

            <p className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-700">
              Confirming will apply this deposit to the fund ledger immediately.
            </p>

            <form action={receiptFormAction} className="mt-5 space-y-5">
              <input type="hidden" name="flowId" value={confirming.id} />
              <input type="hidden" name="decision" value={receiptDecision} />

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">
                  Comment <span className="font-normal">(Optional)</span>
                </span>
                <textarea
                  name="comment"
                  maxLength={300}
                  placeholder="Add a comment about this decision..."
                  className="mt-2 h-24 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>

              {receiptState?.status === 'error' && (
                <p className="auth-status-message status-error">{receiptState.message}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="submit"
                  disabled={isReceiptPending}
                  onClick={() => setReceiptDecision('reject')}
                  className="rounded-lg border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {isReceiptPending && receiptDecision === 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
                <button
                  type="submit"
                  disabled={isReceiptPending}
                  onClick={() => setReceiptDecision('complete')}
                  className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isReceiptPending && receiptDecision === 'complete' ? 'Confirming…' : 'Mark Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
