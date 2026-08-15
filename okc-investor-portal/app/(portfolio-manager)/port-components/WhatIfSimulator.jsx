'use client';
import { useState } from 'react';
import { runWhatIf } from '../performance/actions';
import { fmtMoney, fmtPct } from '@/lib/format';

const formatCurrency = value => fmtMoney(value, { currency: 'SGD ' });
const formatPercent = value => fmtPct(value);
const valueTone = value => (value < 0 ? 'text-red-600' : value > 0 ? 'text-green-600' : 'text-gray-900');

let nextRowId = 1;
const emptyRow = dateIso => ({
  id: nextRowId++,
  label: '',
  type: 'DEPOSIT',
  amount: '',
  dateIso,
});

// §3.5 "Support Performance Analysis" — what-if analysis: lets the PM test
// how the fund would have performed had investor capital been allocated
// differently (an earlier/larger deposit, a withdrawal that didn't happen,
// etc.), by replaying the SAME deal history through the real §8.1 ledger
// waterfall with the hypothetical flows added in. This is not a shortcut
// formula — it reruns computeFundLedger, the same function that produces the
// real ledger, so the answer reflects the actual daily P&L-splitting rules.
export default function WhatIfSimulator({ fundId, fundName, fromDate, toDate }) {
  const [rows, setRows] = useState(() => [emptyRow(fromDate)]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addRow = () => setRows(prev => [...prev, emptyRow(fromDate)]);
  const removeRow = id => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id, patch) => setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));

  const runSimulation = async () => {
    setError(null);
    const hypotheticalFlows = rows
      .filter(r => r.amount !== '' && Number(r.amount) > 0 && r.dateIso)
      .map(r => ({
        type: r.type,
        amount: Number(r.amount),
        dateIso: r.dateIso,
        label: r.label || `Hypothetical ${r.type === 'DEPOSIT' ? 'deposit' : 'withdrawal'}`,
      }));

    if (hypotheticalFlows.length === 0) {
      setError('Enter at least one hypothetical amount and date.');
      return;
    }

    setLoading(true);
    setResult(null);
    const res = await runWhatIf(fundId, fromDate, toDate, hypotheticalFlows);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res.result);
    }
  };

  const comparisonRows = result ? [
    { label: 'Ending Balance', baseline: formatCurrency(result.baseline.endingBalance), scenario: formatCurrency(result.scenario.endingBalance), delta: result.deltaEndingBalance },
    { label: 'Total P&L', baseline: formatCurrency(result.baseline.totalPnl), scenario: formatCurrency(result.scenario.totalPnl), delta: result.scenario.totalPnl - result.baseline.totalPnl },
    { label: 'Fund Return', baseline: formatPercent(result.baseline.returnPct), scenario: formatPercent(result.scenario.returnPct), delta: result.deltaReturnPct, isPct: true },
  ] : [];

  return (
    <section className="card p-6">
      <div className="mb-5">
        <p className="section-label mb-1">PERFORMANCE ANALYSIS</p>
        <h2 className="text-lg font-bold text-gray-900">What-If Allocation Simulator</h2>
        <p className="mt-1 text-xs text-gray-400">
          Test how {fundName} would have performed for {fromDate} – {toDate} if capital had been allocated differently. Add hypothetical deposits or withdrawals below — they never touch real data.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map(row => (
          <div key={row.id} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr_auto] sm:items-center">
            <input
              type="text"
              placeholder="Label (optional)"
              value={row.label}
              onChange={e => updateRow(row.id, { label: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <select
              value={row.type}
              onChange={e => updateRow(row.id, { type: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 outline-none focus:border-blue-400"
            >
              <option value="DEPOSIT">Deposit</option>
              <option value="WITHDRAWAL">Withdrawal</option>
            </select>
            <input
              type="number"
              min="0"
              placeholder="Amount"
              value={row.amount}
              onChange={e => updateRow(row.id, { amount: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <input
              type="date"
              value={row.dateIso}
              onChange={e => updateRow(row.id, { dateIso: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={rows.length === 1}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addRow}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
        >
          + Add hypothetical flow
        </button>
        <button
          type="button"
          onClick={runSimulation}
          disabled={loading}
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Simulating…' : 'Run Simulation'}
        </button>
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>

      {result && (
        <div className="mt-6 overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Metric</th>
                <th className="px-4 py-3 text-right">Actual (Baseline)</th>
                <th className="px-4 py-3 text-right">Scenario</th>
                <th className="px-4 py-3 text-right">Δ</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(row => (
                <tr key={row.label} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-semibold text-gray-900">{row.label}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{row.baseline}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">{row.scenario}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${valueTone(row.delta)}`}>
                    {row.delta >= 0 ? '+' : ''}{row.isPct ? formatPercent(row.delta) : formatCurrency(row.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
