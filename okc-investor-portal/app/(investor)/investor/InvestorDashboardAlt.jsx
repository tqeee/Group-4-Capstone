'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtDate, fmtMonth, fmtMoney, fmtPct, fmtTime } from '@/lib/format';

/*
 * ALTERNATIVE INVESTOR DASHBOARD — design exploration, NOT wired to anything.
 *
 * Renders entirely from the DEMO constant below, which is shaped like the
 * `overview` object from getInvestorOverview() so adopting it later is a
 * matter of swapping `DEMO` for a prop. Nothing here touches Prisma, Supabase
 * or the ledger. Preview it at /investor/preview.
 *
 * How it differs from the current dashboard, and why:
 *  - Metrics first, one of them anchored. Four tiles across the top with the
 *    portfolio value in a dark tile, so the eye lands on the single number
 *    that matters before anything else. Each tile carries a micro-sparkline,
 *    so the shape of the trend is legible without reading the big chart.
 *  - Deltas as chips, not coloured text. A tinted pill with a direction
 *    arrow reads at a glance and survives being scanned on a phone.
 *  - Stacked allocation bar instead of a donut. Two or three funds in a donut
 *    is a lot of ink for very little information; a 100% bar compares parts
 *    against the whole more directly and leaves room for real values.
 *  - Holdings as rows, not a seven-column table. The current table forces a
 *    horizontal scroll on anything narrower than a laptop; these rows put the
 *    fund's identity and value on one line and the four return periods on the
 *    next, with the share of the fund shown as a bar rather than a number.
 *  - A right rail. Allocation and recent activity live beside the chart and
 *    holdings, which fills the dead space the current single-column stack
 *    leaves on wide screens and gives the flow lifecycle somewhere to surface.
 */

// ── Demo data ───────────────────────────────────────────────────────────────
// Generated deterministically at module scope (a seeded LCG, never Math.random)
// so server and client render identical markup and hydration stays quiet.

function buildSeries() {
  const start = Date.UTC(2025, 10, 3);
  const days = 275;
  let seed = 20251103;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let value = 50000;
  const out = [];
  for (let i = 0; i < days; i += 1) {
    // Deposits move the value but are NOT P&L — kept apart here for the same
    // reason the ledger keeps them apart, so "best day" can't be a transfer.
    const deposit = i === 150 ? 15000 : 0;
    value += deposit;
    const pnl = value * (0.0006 + (rand() - 0.5) * 0.019);
    value += pnl;
    out.push({
      date: new Date(start + i * 86400000).toISOString(),
      value: Math.round(value * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      deposit,
    });
  }
  return out;
}

const SERIES = buildSeries();

const DEMO = (() => {
  const last = SERIES[SERIES.length - 1];
  const prev = SERIES[SERIES.length - 2];
  const asOf = new Date(last.date);
  const monthStart = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1);
  const yearStart = Date.UTC(asOf.getUTCFullYear(), 0, 1);

  const valueAtOrBefore = cutoff => {
    const before = SERIES.filter(p => new Date(p.date).getTime() < cutoff);
    return before.length ? before[before.length - 1].value : SERIES[0].value;
  };
  // Period P&L is the sum of daily P&L, never the change in value — a deposit
  // would otherwise read as a gain. Same rule as getInvestorOverview().
  const pnlSince = cutoff =>
    SERIES.filter(p => new Date(p.date).getTime() >= cutoff).reduce((s, p) => s + p.pnl, 0);

  const grossDeposits = 65000;
  const dayPnl = last.pnl;
  const mtdBase = valueAtOrBefore(monthStart);
  const ytdBase = valueAtOrBefore(yearStart);
  const mtdPnl = pnlSince(monthStart);
  const ytdPnl = pnlSince(yearStart);

  return {
    name: 'Faye',
    asOf: last.date,
    asOfComputedAt: new Date(new Date(last.date).getTime() + 11 * 3600000).toISOString(),
    inceptionDate: SERIES[0].date,
    totalValue: last.value,
    grossDeposits,
    dayPnl,
    dayPct: (dayPnl / prev.value) * 100,
    mtdPnl,
    mtdPct: (mtdPnl / mtdBase) * 100,
    ytdPnl,
    ytdPct: (ytdPnl / ytdBase) * 100,
    inceptionPnl: last.value - grossDeposits,
    inceptionPct: ((last.value - grossDeposits) / grossDeposits) * 100,
    series: SERIES,
    allocation: [
      {
        fundId: 'a',
        name: 'Fund A',
        strategy: 'Systematic macro',
        currency: 'SGD',
        weight: 0.642,
        fundSharePct: 68.48,
      },
      {
        fundId: 'b',
        name: 'Fund B',
        strategy: 'Precious metals',
        currency: 'SGD',
        weight: 0.358,
        fundSharePct: 31.52,
      },
    ].map(f => ({
      ...f,
      value: Math.round(last.value * f.weight * 100) / 100,
      pctOfPortfolio: f.weight * 100,
      dayPnl: Math.round(dayPnl * f.weight * 100) / 100,
      mtdPnl: Math.round(mtdPnl * f.weight * 100) / 100,
      ytdPnl: Math.round(ytdPnl * f.weight * 100) / 100,
      inceptionPnl: Math.round((last.value - grossDeposits) * f.weight * 100) / 100,
    })),
  };
})();

const ACTIVITY = [
  { label: 'Deposit received', detail: 'SGD 15,000.00 · Fund A', when: '1 May 2026', status: 'Completed' },
  { label: 'Withdrawal requested', detail: 'SGD 4,000.00 · Fund B', when: '28 Jul 2026', status: 'Pending' },
  { label: 'Deposit approved', detail: 'SGD 6,500.00 · Fund A', when: '30 Jul 2026', status: 'Awaiting proof' },
  { label: 'Transfer reference submitted', detail: 'Ref OKC-8841 · Fund A', when: '1 Aug 2026', status: 'Pending receipt' },
  { label: 'Statement ready', detail: 'July 2026 · CSV', when: '1 Aug 2026', status: 'Completed' },
];

const STATUS_STYLES = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'Awaiting proof': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'Pending receipt': 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const FUND_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6'];
const RANGES = ['1M', '3M', '6M', 'YTD', 'ALL'];

// ── Primitives ──────────────────────────────────────────────────────────────

function DeltaChip({ value, label, dark = false }) {
  const up = value >= 0;
  const tone = dark
    ? up
      ? 'bg-emerald-400/15 text-emerald-300'
      : 'bg-rose-400/15 text-rose-300'
    : up
      ? 'bg-emerald-50 text-emerald-700'
      : 'bg-rose-50 text-rose-600';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
        {up ? <path d="M6 2.5L10 8H2z" /> : <path d="M6 9.5L2 4h8z" />}
      </svg>
      {label}
    </span>
  );
}

// Coloured by its OWN direction, not by the tile's headline number: a red
// "day P&L" tile can still sit above a fortnight that trended up, and drawing
// that line in red would say something untrue about the fortnight.
function Sparkline({ values, className = '' }) {
  const up = values.length > 1 ? values[values.length - 1] >= values[0] : true;
  const d = useMemo(() => {
    if (values.length < 2) return '';
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo || 1;
    return values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 30 - ((v - lo) / span) * 26 - 2;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }, [values]);

  return (
    <svg
      className={className}
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={d}
        stroke={up ? '#10b981' : '#f43f5e'}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          aria-pressed={value === o}
          className={`rounded-md px-2.5 py-1 text-xs font-medium tabular-nums transition ${
            value === o
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <section
      className={`rounded-2xl border border-gray-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${className}`}
    >
      {children}
    </section>
  );
}

function PanelHeader({ eyebrow, title, action }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
      <div>
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{eyebrow}</p>
        )}
        <h2 className="mt-0.5 text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

// ── Stat tiles ──────────────────────────────────────────────────────────────

function HeroTile({ value, deltaLabel, delta, spark, asOf }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-sm">
      <div
        className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Total portfolio value
        </p>
        <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
        <div className="mt-3 flex items-center gap-2">
          <DeltaChip value={delta} label={deltaLabel} dark />
          <span className="text-xs text-slate-400">today</span>
        </div>
        <div className="mt-4 flex items-end justify-between gap-3">
          <span className="text-[11px] text-slate-500">NAV {asOf}</span>
          <Sparkline values={spark} className="h-8 w-24 opacity-80" />
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, delta, deltaLabel, spark, footnote }) {
  const up = delta >= 0;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${up ? 'text-gray-900' : 'text-rose-600'}`}>
        {value}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <DeltaChip value={delta} label={deltaLabel} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span className="text-[11px] text-gray-400">{footnote}</span>
        <Sparkline values={spark} className="h-8 w-24" />
      </div>
    </div>
  );
}

// ── Area chart ──────────────────────────────────────────────────────────────
// Hand-rolled SVG rather than chart.js: the path scales with the container via
// preserveAspectRatio="none", and non-scaling-stroke keeps the line an even
// weight at any width. The hover marker is HTML positioned in percentages so
// it is not stretched by that same scaling.

function AreaChart({ points }) {
  const [hover, setHover] = useState(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map(p => p.value);
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const pad = (hi - lo) * 0.18 || 1;
    const min = lo - pad;
    const max = hi + pad;
    const xs = points.map((_, i) => (i / (points.length - 1)) * 1000);
    const ys = values.map(v => 300 - ((v - min) / (max - min)) * 300);
    const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${ys[i].toFixed(2)}`).join(' ');
    return { min, max, xs, ys, line, area: `${line} L1000,300 L0,300 Z` };
  }, [points]);

  if (!geom) {
    return <div className="flex h-64 items-center justify-center text-sm text-gray-300">No data for this period</div>;
  }

  const gridValues = [0, 1, 2, 3].map(i => geom.max - (i / 3) * (geom.max - geom.min));
  const tickCount = Math.min(5, points.length);
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / (tickCount - 1)) * (points.length - 1)),
  );

  const onMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (points.length - 1)));
  };

  const hx = hover === null ? 0 : (geom.xs[hover] / 1000) * 100;
  const hy = hover === null ? 0 : (geom.ys[hover] / 300) * 100;

  return (
    <div>
      <div className="flex">
        {/* y-axis labels sit outside the plot so the plot can stretch freely */}
        <div className="flex w-16 flex-col justify-between pr-2 text-right text-[11px] tabular-nums text-gray-400">
          {gridValues.map(v => (
            <span key={v}>${Math.round(v / 1000)}K</span>
          ))}
        </div>

        <div
          className="relative h-64 flex-1 cursor-crosshair"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {gridValues.map((v, i) => (
            <div
              key={v}
              className="absolute inset-x-0 border-t border-dashed border-gray-100"
              style={{ top: `${(i / 3) * 100}%` }}
              aria-hidden="true"
            />
          ))}

          {/* Deposit markers. A deposit puts a step in the line that looks
              exactly like a spectacular trading day; labelling it is the
              difference between a chart that informs and one that misleads. */}
          {points.map((p, i) =>
            p.deposit > 0 ? (
              <div
                key={p.date}
                className="pointer-events-none absolute inset-y-0"
                style={{ left: `${(geom.xs[i] / 1000) * 100}%` }}
              >
                <div className="h-full w-px border-l border-dashed border-emerald-400/70" />
                <span className="absolute -top-0.5 left-1.5 whitespace-nowrap rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  + {fmtMoney(p.deposit, { currency: '' })} deposit
                </span>
              </div>
            ) : null,
          )}

          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 300" preserveAspectRatio="none">
            <defs>
              <linearGradient id="okc-alt-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.24" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={geom.area} fill="url(#okc-alt-area)" />
            <path
              d={geom.line}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {hover !== null && (
            <>
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-blue-200"
                style={{ left: `${hx}%` }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow"
                style={{ left: `${hx}%`, top: `${hy}%` }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute z-10 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] text-white shadow-lg"
                style={{
                  left: `${hx}%`,
                  top: `${hy}%`,
                  transform: `translate(${hx > 70 ? '-100%' : hx < 10 ? '0' : '-50%'}, calc(-100% - 10px))`,
                }}
              >
                <p className="font-semibold tabular-nums">{fmtMoney(points[hover].value, { currency: 'SGD ' })}</p>
                <p className="text-slate-400">{fmtDate(points[hover].date)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="ml-16 mt-2 flex justify-between text-[11px] text-gray-400">
        {ticks.map(i => (
          <span key={i}>{fmtDate(points[i].date).slice(0, -5)}</span>
        ))}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function InvestorDashboardAlt() {
  const [range, setRange] = useState('ALL');
  const o = DEMO;

  const chartPoints = useMemo(() => {
    const latest = new Date(o.asOf).getTime();
    const DAY = 86400000;
    const cutoffs = {
      '1M': latest - 30 * DAY,
      '3M': latest - 90 * DAY,
      '6M': latest - 182 * DAY,
      YTD: Date.UTC(new Date(o.asOf).getUTCFullYear(), 0, 1),
      ALL: 0,
    };
    return o.series.filter(p => new Date(p.date).getTime() >= cutoffs[range]);
  }, [o, range]);

  const rangeChange = chartPoints.length > 1
    ? ((chartPoints[chartPoints.length - 1].value - chartPoints[0].value) / chartPoints[0].value) * 100
    : 0;

  const spark = n => o.series.slice(-n).map(p => p.value);

  // Best/worst trading day within the visible range — context the current
  // dashboard doesn't surface anywhere. Daily P&L, so a deposit can never
  // masquerade as the best day of the period.
  const moves = chartPoints.map(p => p.pnl);
  const best = moves.length ? Math.max(...moves) : 0;
  const worst = moves.length ? Math.min(...moves) : 0;

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Portfolio</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-700">{o.name}</span> · NAV as of{' '}
            {fmtDate(o.asOf)}, {fmtTime(o.asOfComputedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
            </svg>
            Statement
          </Link>
          <Link
            href="/request-transaction"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
            Request transaction
          </Link>
        </div>
      </header>

      {/* ── Metric tiles ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroTile
          value={fmtMoney(o.totalValue, { currency: 'SGD ' })}
          delta={o.dayPnl}
          deltaLabel={fmtPct(o.dayPct)}
          spark={spark(30)}
          asOf={fmtDate(o.asOf)}
        />
        <StatTile
          label="Day P&L"
          value={fmtMoney(o.dayPnl, { sign: true })}
          delta={o.dayPnl}
          deltaLabel={fmtPct(o.dayPct)}
          spark={spark(14)}
          footnote={fmtDate(o.asOf)}
        />
        <StatTile
          label="Month to date"
          value={fmtMoney(o.mtdPnl, { sign: true })}
          delta={o.mtdPnl}
          deltaLabel={fmtPct(o.mtdPct)}
          spark={spark(31)}
          footnote={fmtMonth(o.asOf)}
        />
        <StatTile
          label="Since inception"
          value={fmtPct(o.inceptionPct)}
          delta={o.inceptionPnl}
          deltaLabel={fmtMoney(o.inceptionPnl, { sign: true })}
          spark={spark(140)}
          footnote={`Since ${fmtDate(o.inceptionDate)}`}
        />
      </div>

      {/* ── Chart + allocation rail ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Portfolio value
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-gray-900">
                  {fmtMoney(o.totalValue, { currency: 'SGD ' })}
                </span>
                <DeltaChip value={rangeChange} label={`${fmtPct(rangeChange)} over ${range}`} />
              </div>
            </div>
            <Segmented options={RANGES} value={range} onChange={setRange} />
          </div>

          <div className="px-5 pb-2">
            <AreaChart points={chartPoints} />
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
            {[
              { label: 'Trading days', value: String(chartPoints.length) },
              { label: 'Best day', value: fmtMoney(best, { sign: true }), tone: 'text-emerald-600' },
              { label: 'Worst day', value: fmtMoney(worst, { sign: true }), tone: 'text-rose-600' },
            ].map(s => (
              <div key={s.label} className="px-5 py-3">
                <p className="text-[11px] uppercase tracking-wider text-gray-400">{s.label}</p>
                <p className={`mt-0.5 text-sm font-semibold tabular-nums ${s.tone ?? 'text-gray-900'}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Allocation" title="Across funds" />
          <div className="px-5 py-4">
            {/* 100% stacked bar — parts against a whole, without a donut's ink */}
            <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
              {o.allocation.map((f, i) => (
                <div
                  key={f.fundId}
                  style={{ width: `${f.pctOfPortfolio}%`, backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
                  title={`${f.name} ${f.pctOfPortfolio.toFixed(1)}%`}
                />
              ))}
            </div>

            <ul className="mt-5 space-y-4">
              {o.allocation.map((f, i) => (
                <li key={f.fundId} className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-400">{f.strategy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {f.pctOfPortfolio.toFixed(1)}%
                    </p>
                    <p className="text-xs tabular-nums text-gray-400">
                      {fmtMoney(f.value, { currency: `${f.currency} ` })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-5 space-y-2.5 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Total deposits</dt>
                <dd className="font-medium tabular-nums text-gray-900">{fmtMoney(o.grossDeposits)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Net gain</dt>
                <dd
                  className={`font-medium tabular-nums ${o.inceptionPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {fmtMoney(o.inceptionPnl, { sign: true })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">In the fund since</dt>
                <dd className="font-medium text-gray-900">{fmtDate(o.inceptionDate)}</dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>

      {/* ── Holdings + activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeader
            eyebrow={`Your fund${o.allocation.length > 1 ? 's' : ''}`}
            title="Holdings & returns"
            action={
              <Link href="/funds" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-gray-100">
            {o.allocation.map((f, i) => (
              <li key={f.fundId} className="px-5 py-4 transition hover:bg-gray-50/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-400">
                        {f.strategy} · {f.currency}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-gray-900">
                      {fmtMoney(f.value, { currency: `${f.currency} ` })}
                    </p>
                    <p className="text-xs tabular-nums text-gray-400">
                      {f.pctOfPortfolio.toFixed(1)}% of portfolio
                    </p>
                  </div>
                </div>

                {/* Share of the fund as a bar: a % of a pool is easier to feel
                    than to read, and it is the §8.1 number investors ask about */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${f.fundSharePct}%`,
                        backgroundColor: FUND_COLORS[i % FUND_COLORS.length],
                      }}
                    />
                  </div>
                  <span className="w-32 text-right text-[11px] tabular-nums text-gray-400">
                    {f.fundSharePct.toFixed(2)}% of fund
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    { k: 'Day', v: f.dayPnl },
                    { k: 'MTD', v: f.mtdPnl },
                    { k: 'YTD', v: f.ytdPnl },
                    { k: 'Inception', v: f.inceptionPnl },
                  ].map(m => (
                    <div key={m.k} className="rounded-lg bg-gray-50 px-2.5 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400">{m.k}</p>
                      <p
                        className={`text-sm font-semibold tabular-nums ${
                          m.v >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {fmtMoney(m.v, { sign: true })}
                      </p>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/60 px-5 py-3.5">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Total · {o.allocation.length} funds
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold tabular-nums text-gray-900">
                {fmtMoney(o.totalValue, { currency: 'SGD ' })}
              </span>
              <DeltaChip value={o.dayPnl} label={`${fmtMoney(o.dayPnl, { sign: true })} today`} />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            eyebrow="Activity"
            title="Recent"
            action={
              <Link href="/activity" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                All →
              </Link>
            }
          />
          <ol className="px-5 py-4">
            {ACTIVITY.map((a, i) => (
              <li key={a.label} className="relative flex gap-3 pb-5 last:pb-0">
                {i < ACTIVITY.length - 1 && (
                  <span className="absolute left-[5px] top-4 h-full w-px bg-gray-200" aria-hidden="true" />
                )}
                <span
                  className={`relative mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ring-4 ring-white ${
                    a.status === 'Completed' ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{a.label}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        STATUS_STYLES[a.status]
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{a.detail}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{a.when}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <p className="pb-2 text-center text-[11px] text-gray-400">
        Design preview · figures are illustrative, not live portfolio data
      </p>
    </div>
  );
}
