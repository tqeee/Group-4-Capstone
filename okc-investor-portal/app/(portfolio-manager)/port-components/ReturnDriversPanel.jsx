'use client';
import { useEffect, useState } from 'react';
import { fetchReturnDrivers, fetchInvestorShares } from '../performance/actions';
import { fmtMoney, fmtDate } from '@/lib/format';

const formatCurrency = value => fmtMoney(value, { currency: 'SGD ' });
const valueTone = value => (value < 0 ? 'text-red-600' : value > 0 ? 'text-green-600' : 'text-gray-900');
// Cycles if there are ever more investors than colors, same approach as the
// dashboard's fund-allocation donut — repeats the palette rather than erroring.
const SHARE_BAR_CLASSES = ['bg-blue-600', 'bg-blue-400', 'bg-blue-300', 'bg-blue-800', 'bg-blue-500', 'bg-blue-200'];

// §3.5 "Support Performance Analysis" — breaks the selected fund's return
// down into different drivers (gross trading P&L vs. costs vs. management
// fee, by instrument, by trade side) for whatever date range the Performance
// page currently has selected, so the PM can see WHY the fund performed the
// way it did rather than just the top-line number.
export default function ReturnDriversPanel({ fundId, fundName, fromDate, toDate }) {
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dataset 5.3 — each investor's % shareholding in this fund, as of the
  // period's end date (toDate). Fetched separately from the cost/instrument
  // breakdown since it comes from a different table (InvestorDailyLedger,
  // not Deal) and isn't scoped to the date range, just a single "as of" day.
  const [shares, setShares] = useState(null);
  const [sharesLoading, setSharesLoading] = useState(false);
  const [sharesError, setSharesError] = useState(null);

  useEffect(() => {
    if (!fundId || !fromDate || !toDate) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchReturnDrivers(fundId, fromDate, toDate).then(res => {
      if (cancelled) return;
      if (res.error) {
        setError(res.error);
        setBreakdown(null);
      } else {
        setBreakdown(res.breakdown);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [fundId, fromDate, toDate]);

  useEffect(() => {
    if (!fundId || !toDate) return;
    let cancelled = false;
    setSharesLoading(true);
    setSharesError(null);
    fetchInvestorShares(fundId, toDate).then(res => {
      if (cancelled) return;
      if (res.error) {
        setSharesError(res.error);
        setShares(null);
      } else {
        setShares(res);
      }
      setSharesLoading(false);
    });
    return () => { cancelled = true; };
  }, [fundId, toDate]);

  const costRows = breakdown ? [
    { label: 'Gross Trading P&L', value: breakdown.grossTradingPnl },
    { label: 'Commission', value: breakdown.commission },
    { label: 'Swap', value: breakdown.swap },
    { label: 'Fees', value: breakdown.fee },
    { label: 'Management Fee', value: -breakdown.managementFee },
  ] : [];

  const maxAbsSymbol = breakdown && breakdown.bySymbol.length > 0
    ? Math.max(...breakdown.bySymbol.map(s => Math.abs(s.netPnl)))
    : 0;

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label mb-1">PERFORMANCE ANALYSIS</p>
          <h2 className="text-lg font-bold text-gray-900">Return Drivers</h2>
          <p className="mt-1 text-xs text-gray-400">
            {fundName} — what drove the return for the selected period, broken down by cost type and traded instrument.
          </p>
        </div>
      </div>

      {loading && <p className="py-8 text-center text-sm text-gray-400">Loading return drivers…</p>}
      {!loading && error && <p className="py-8 text-center text-sm text-red-500">{error}</p>}
      {!loading && !error && breakdown && breakdown.dealCount === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No trading activity in this date range.</p>
      )}

      {!loading && !error && breakdown && breakdown.dealCount > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">P&L Decomposition</p>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {costRows.map(row => (
                <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <span className="text-gray-500">{row.label}</span>
                  <span className={`font-semibold tabular-nums ${valueTone(row.value)}`}>{formatCurrency(row.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between gap-4 bg-gray-50 px-4 py-3 text-sm">
                <span className="font-semibold text-gray-900">Net P&L</span>
                <span className={`font-bold tabular-nums ${valueTone(breakdown.netPnl)}`}>{formatCurrency(breakdown.netPnl)}</span>
              </div>
            </div>

            <p className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">By Trade Side</p>
            <div className="grid grid-cols-2 gap-3">
              {breakdown.bySide.map(side => (
                <div key={side.side} className="rounded-lg border border-gray-100 p-3">
                  <p className="text-xs text-gray-400">{side.side} ({side.dealCount} deals)</p>
                  <p className={`text-lg font-bold tabular-nums ${valueTone(side.netPnl)}`}>{formatCurrency(side.netPnl)}</p>
                </div>
              ))}
              {breakdown.bySide.length === 0 && (
                <p className="col-span-2 text-sm text-gray-400">No deals in this range.</p>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">By Instrument</p>
            <div className="space-y-3">
              {breakdown.bySymbol.map(symbol => {
                const widthPct = maxAbsSymbol > 0 ? Math.max(4, (Math.abs(symbol.netPnl) / maxAbsSymbol) * 100) : 0;
                return (
                  <div key={symbol.symbol}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-semibold text-gray-700">{symbol.symbol}</span>
                      <span className={`font-semibold tabular-nums ${valueTone(symbol.netPnl)}`}>
                        {formatCurrency(symbol.netPnl)} <span className="text-xs font-normal text-gray-400">({symbol.dealCount})</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full ${symbol.netPnl < 0 ? 'bg-red-400' : 'bg-green-500'}`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {breakdown.bySymbol.length === 0 && (
                <p className="text-sm text-gray-400">No instruments traded in this range.</p>
              )}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex items-baseline justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Investor Share %</p>
                {shares?.asOfDate && (
                  <p className="text-xs text-gray-400">As of {fmtDate(shares.asOfDate)}</p>
                )}
              </div>

              {sharesLoading && <p className="text-sm text-gray-400">Loading investor shares…</p>}
              {!sharesLoading && sharesError && <p className="text-sm text-red-500">{sharesError}</p>}
              {!sharesLoading && !sharesError && shares && shares.investors.length === 0 && (
                <p className="text-sm text-gray-400">
                  {shares.asOfDate ? 'No investors hold a share of this fund as of this date.' : 'No ledger history for this fund yet.'}
                </p>
              )}

              {!sharesLoading && !sharesError && shares && shares.investors.length > 0 && (
                <div className="space-y-3">
                  {shares.investors.map((investor, i) => (
                    <div key={investor.investorId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-gray-700">{investor.name}</span>
                        <span className="font-semibold tabular-nums text-gray-900">
                          {investor.sharePct.toFixed(2)}% <span className="text-xs font-normal text-gray-400">({formatCurrency(investor.value)})</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${SHARE_BAR_CLASSES[i % SHARE_BAR_CLASSES.length]}`}
                          style={{ width: `${Math.max(2, Math.min(100, investor.sharePct))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
