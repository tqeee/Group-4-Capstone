'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { fmtDate, fmtMoney, fmtPct, fmtTime } from '@/lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip);

const METRICS = [
  { key: 'nav', label: 'Fund NAV' },
  { key: 'cumulativePnl', label: 'Cumulative P&L' },
  { key: 'dailyPnl', label: 'Daily P&L' },
];

// Months back from the latest ledger day; null = the whole history.
const RANGES = [
  { key: '1M', label: '1M', months: 1 },
  { key: '3M', label: '3M', months: 3 },
  { key: '6M', label: '6M', months: 6 },
  { key: '1Y', label: '1Y', months: 12 },
  { key: 'ALL', label: 'All', months: null },
];

const GREEN = '#16a34a';
const RED = '#ef4444';
const GREEN_FILL = 'rgba(22, 163, 74, 0.08)';
const RED_FILL = 'rgba(239, 68, 68, 0.08)';

// Axis labels only — the tooltip and stat cards show full precision.
function compactMoney(v) {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

// Draws the reference line the green/red split is measured against. Chart.js has
// no built-in annotation, and the value moves with the selected range, so it is
// read from options at draw time rather than baked into the data.
const baselinePlugin = {
  id: 'okcBaseline',
  afterDatasetsDraw(chart, _args, opts) {
    if (opts?.value == null) return;
    const y = chart.scales.y.getPixelForValue(opts.value);
    const { left, right } = chart.chartArea;
    const { ctx } = chart;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#9ca3af';
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.restore();
  },
};

function isoMonthsBack(isoDate, months) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

export default function FundDetailModal({ fund, series, onClose }) {
  const [metric, setMetric] = useState('nav');
  const [range, setRange] = useState('ALL');

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cumulative P&L runs from inception so a narrowed range shows the true tail
  // of the curve rather than restarting at zero.
  const allRows = useMemo(() => {
    const out = [];
    let cumulative = 0;
    for (const p of series) {
      cumulative += p.dailyPnL;
      const netFlow = p.deposits - p.withdrawals;
      out.push({
        date: p.date,
        isoDate: p.isoDate,
        beginningValue: p.beginningValue,
        nav: p.beginningValue + p.dailyPnL + netFlow,
        dailyPnl: p.dailyPnL,
        cumulativePnl: cumulative,
        netFlow,
      });
    }
    return out;
  }, [series]);

  const rows = useMemo(() => {
    const months = RANGES.find(r => r.key === range)?.months;
    if (!months || allRows.length === 0) return allRows;
    const cutoff = isoMonthsBack(allRows[allRows.length - 1].isoDate, months);
    return allRows.filter(r => r.isoDate >= cutoff);
  }, [allRows, range]);

  // Range-scoped statistics.
  const stats = useMemo(() => {
    if (rows.length === 0) return null;
    const traded = rows.filter(r => r.dailyPnl !== 0);
    // Same rule as §8.2 compoundReturn: multiplicative, and days that open with
    // no capital are skipped (a return on a zero base is undefined).
    const growth = rows.reduce(
      (acc, r) => (r.beginningValue > 0 ? acc * (1 + r.dailyPnl / r.beginningValue) : acc),
      1
    );
    return {
      pnl: rows.reduce((s, r) => s + r.dailyPnl, 0),
      returnPct: (growth - 1) * 100,
      netFlows: rows.reduce((s, r) => s + r.netFlow, 0),
      best: traded.length ? traded.reduce((a, b) => (b.dailyPnl > a.dailyPnl ? b : a)) : null,
      worst: traded.length ? traded.reduce((a, b) => (b.dailyPnl < a.dailyPnl ? b : a)) : null,
      upDays: traded.filter(r => r.dailyPnl > 0).length,
      downDays: traded.filter(r => r.dailyPnl < 0).length,
      tradingDays: traded.length,
    };
  }, [rows]);

  const labels = rows.map(r => r.date);
  const values = rows.map(r => r[metric]);

  // Green/red is measured against where the line STARTS in the selected range,
  // not against inception. Pick 1M and the question becomes "is the fund up or
  // down over this month", which is what the range control is for — an inception
  // baseline would paint a fund red all year for a loss it already recovered.
  const isBarMetric = metric === 'dailyPnl';
  const baseline = values.length > 0 ? values[0] : 0;
  const endedUp = values.length > 0 ? values[values.length - 1] >= baseline : true;

  const rangeStartLabel = rows.length > 0 ? rows[0].date : null;

  const tooltip = {
    callbacks: {
      // The plotted value is absolute (cumulative P&L runs from inception, NAV
      // is a balance), so on its own it says nothing about the selected range.
      // Add the move since the range opened — the same number the line's colour
      // is derived from, so the two always agree.
      label: ctx => {
        const value = ` ${fmtMoney(ctx.parsed.y, { sign: metric !== 'nav' })} ${fund.currency}`;
        if (isBarMetric || rangeStartLabel === null) return value;
        const delta = ctx.parsed.y - baseline;
        return [value, ` ${fmtMoney(delta, { sign: true })} since ${rangeStartLabel}`];
      },
    },
    mode: 'index',
    intersect: false,
  };
  const scales = {
    x: {
      grid: { display: false },
      ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 8, autoSkip: true },
    },
    y: {
      grid: {
        // Bars are read against zero; the line metrics get a drawn baseline instead.
        color: ctx => (isBarMetric && ctx.tick.value === 0 ? '#9ca3af' : '#f3f4f6'),
      },
      ticks: { color: '#9ca3af', font: { size: 11 }, callback: compactMoney },
    },
  };
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip,
      okcBaseline: isBarMetric ? { value: null } : { value: baseline },
    },
    scales,
  };

  const headline = [
    { label: `AUM (${fund.currency})`, value: fmtMoney(fund.aum) },
    { label: 'Total P&L', value: fmtMoney(fund.totalPnl, { sign: true }), tone: fund.totalPnl },
    { label: 'Return since inception', value: fmtPct(fund.returnPct), tone: fund.returnPct },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fadeIn transition-all duration-300"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-bold text-white">
              {fund.code.slice(0, 4)}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{fund.name}</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {fund.code} · {fund.currency} · since {fmtDate(fund.inceptionDate)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600"
            type="button"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {(fund.strategy || fund.description) && (
          <p className="mt-4 text-sm text-gray-500">{fund.strategy || fund.description}</p>
        )}

        {/* Since-inception headline */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {headline.map(card => (
            <div key={card.label} className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {card.label}
              </p>
              <p
                className={`mt-1.5 text-xl font-bold ${
                  card.tone === undefined
                    ? 'text-gray-900'
                    : card.tone >= 0
                      ? 'text-green-600'
                      : 'text-red-500'
                }`}
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        {series.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-gray-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-600">No performance history yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-400">
              The ledger builds from imported deals and completed fund flows. Import a broker
              CSV on Data Import, or confirm a deposit into this fund, and the chart appears
              here.
            </p>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {METRICS.map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetric(m.key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      metric === m.key
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {RANGES.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRange(r.key)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      range === r.key
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="mt-4 h-72 rounded-xl border border-gray-200 p-4">
              {rows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-300">
                  No data in this range
                </div>
              ) : metric === 'dailyPnl' ? (
                <Bar
                  data={{
                    labels,
                    datasets: [
                      {
                        data: values,
                        backgroundColor: values.map(v => (v >= 0 ? GREEN : RED)),
                        borderRadius: 2,
                      },
                    ],
                  }}
                  options={baseOptions}
                />
              ) : (
                <Line
                  data={{
                    labels,
                    datasets: [
                      {
                        data: values,
                        borderColor: endedUp ? GREEN : RED,
                        borderWidth: 2,
                        // Per-segment colour against the range's opening value:
                        // any segment dipping below where the period started is
                        // drawn red, so a mid-period drawdown is visible even on
                        // a period that ends up.
                        segment: {
                          borderColor: ctx =>
                            ctx.p0.parsed.y < baseline || ctx.p1.parsed.y < baseline
                              ? RED
                              : GREEN,
                        },
                        backgroundColor: endedUp ? GREEN_FILL : RED_FILL,
                        fill: { target: { value: baseline }, above: GREEN_FILL, below: RED_FILL },
                        // Straight joins so a crossing sits where it actually
                        // happened — a spline would overshoot the baseline.
                        tension: 0,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: endedUp ? GREEN : RED,
                      },
                    ],
                  }}
                  options={baseOptions}
                  plugins={[baselinePlugin]}
                />
              )}
            </div>

            {!isBarMetric && rows.length > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                Dashed line: {METRICS.find(m => m.key === metric)?.label} at the start of this
                range — {fmtMoney(baseline, { sign: metric !== 'nav' })} on {rows[0].date}. Green
                above it, red below.
              </p>
            )}

            {/* Range-scoped stats */}
            {stats && (
              <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {[
                  {
                    label: 'P&L in range',
                    value: fmtMoney(stats.pnl, { sign: true }),
                    tone: stats.pnl,
                  },
                  {
                    label: 'Return in range',
                    value: fmtPct(stats.returnPct),
                    tone: stats.returnPct,
                  },
                  {
                    label: 'Best day',
                    value: stats.best ? fmtMoney(stats.best.dailyPnl, { sign: true }) : '—',
                    sub: stats.best?.date,
                    tone: stats.best?.dailyPnl,
                  },
                  {
                    label: 'Worst day',
                    value: stats.worst ? fmtMoney(stats.worst.dailyPnl, { sign: true }) : '—',
                    sub: stats.worst?.date,
                    tone: stats.worst?.dailyPnl,
                  },
                ].map(card => (
                  <div key={card.label} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-xs text-gray-400">{card.label}</p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        card.tone === undefined
                          ? 'text-gray-900'
                          : card.tone >= 0
                            ? 'text-green-600'
                            : 'text-red-500'
                      }`}
                    >
                      {card.value}
                    </p>
                    {card.sub && <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-400">
              {stats?.tradingDays ?? 0} trading day(s) in range · {stats?.upDays ?? 0} up /{' '}
              {stats?.downDays ?? 0} down · net flows{' '}
              {fmtMoney(stats?.netFlows ?? 0, { sign: true })}
              {fund.asOf && ` · NAV as of ${fmtDate(fund.asOf)}`}
              {fund.asOfComputedAt && `, computed ${fmtTime(fund.asOfComputedAt)}`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
