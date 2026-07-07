'use client';

import { useActionState, useMemo, useState } from 'react';
import StatusBadge from '@/components/operations/StatusBadge';
import { fmtDate, fmtMoney } from '@/lib/format';
import { reviewFlow } from './actions';

const FILTERS = ['All', 'Pending', 'Approved', 'Completed', 'Rejected'];

export default function OpsTransactionsClient({ flows, largeThreshold }) {
  const [activeFilter, setActiveFilter] = useState('Pending');
  const [reviewing, setReviewing] = useState(null); // flow being reviewed
  const [decision, setDecision] = useState('approve');
  const [state, formAction, isPending] = useActionState(reviewFlow, undefined);

  // Close the modal when a review lands (render-time adjustment).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.status === 'success') setReviewing(null);
  }

  const counts = useMemo(() => {
    const map = { All: flows.length };
    for (const f of ['Pending', 'Approved', 'Completed', 'Rejected']) {
      map[f] = flows.filter(x => x.status === f).length;
    }
    return map;
  }, [flows]);

  const filtered = activeFilter === 'All' ? flows : flows.filter(f => f.status === activeFilter);
  const pendingAmount = flows
    .filter(f => f.status === 'Pending')
    .reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Transactions</h1>
        <p className="mt-2 text-sm text-gray-500">
          Review investor deposit and withdrawal requests. Approval sets the processed date
          and applies the flow to the fund ledger.
        </p>
      </div>

      {state?.status === 'success' && (
        <p className="auth-status-message status-success">{state.message}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending review', value: String(counts.Pending), red: counts.Pending > 0 },
          { label: 'Pending amount', value: fmtMoney(pendingAmount), red: false },
          { label: 'Total requests', value: String(counts.All), red: false },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{s.label}</p>
            <p className={`text-2xl font-bold ${s.red ? 'text-amber-600' : 'text-gray-950'}`}>{s.value}</p>
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
                    <p className="font-semibold text-gray-950">{flow.investorName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">{flow.investorEmail}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{flow.fund}</td>
                  <td className="px-4 py-4 text-gray-600">{flow.type}</td>
                  <td className="px-4 py-4">
                    <span className="font-bold text-gray-950">{fmtMoney(flow.amount)}</span>
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
                    {flow.status === 'Pending' ? (
                      <button
                        onClick={() => {
                          setReviewing(flow);
                          setDecision('approve');
                        }}
                        className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-800"
                      >
                        Review
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
                <h2 className="mt-2 text-xl font-bold text-gray-950">
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
    </div>
  );
}
