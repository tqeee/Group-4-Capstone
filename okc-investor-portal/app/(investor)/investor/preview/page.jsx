'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { fmtDate, fmtMonth, fmtMoney, fmtPct, fmtTime } from '@/lib/format';

/*
 * DASHBOARD DESIGN PREVIEW — "tear-sheet" concept, NOT wired to anything.
 *
 * Self-contained throwaway mockup: all figures come from the deterministic
 * DEMO constant below. Nothing here touches Prisma, Supabase or the ledger.
 * Delete this folder when the exploration is done.
 *
 * Design basis — conventions from institutional fund reporting (hedge-fund
 * tear sheets, QuantStats-style reports, LP investor portals):
 *
 *  - One hero band, not four tiles. Industry portals answer "how much do I
 *    have, how did it do" in a single anchored block: total value with the
 *    day move, then MTD / YTD / inception in a quiet stat row beside it.
 *  - Cumulative-return view with a benchmark overlay. Retail apps plot raw
 *    value; fund reporting plots indexed performance ("growth of $100").
 *    Because the index is built from daily P&L / prior value, deposits never
 *    move the line — the TWR principle from the challenge statement §8.2,
 *    made visible. Raw value stays available as a toggle, with deposits
 *    flagged so a capital inflow never reads as a trading gain.
 *  - A monthly returns heatmap. Years × months with diverging green/red
 *    shading and a year column at the right edge is the single most
 *    recognisable artefact of professional fund reporting, and it is a free
 *    by-product of the daily P&L series the ledger already stores.
 *  - A risk strip. Max drawdown, annualised volatility and hit rate are
 *    standard tear-sheet stats; they sit below the fold as secondary context,
 *    never in the hero.
 *  - Holdings as a dense right-aligned table (tear-sheet register), and a
 *    persistent "as of" timestamp plus past-performance disclaimer for trust.
 */

// ── Demo data ───────────────────────────────────────────────────────────────
// Seeded LCG at module scope (never Math.random) so server and client render
// identical markup and hydration stays quiet. Business days only — daily NAV
// is a business-day concept.

const DAY = 86400000;
const round2 = n => Math.round(n * 100) / 100;

function makeRand(seedStart) {
  let seed = seedStart;
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

function buildSeries() {
  const rand = makeRand(20250102);
  const start = Date.UTC(2025, 0, 2); // 2 Jan 2025
  const end = Date.UTC(2026, 7, 3); // 3 Aug 2026
  let value = 50000;
  const out = [];
  let i = 0;
  for (let t = start; t <= end; t += DAY) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    // Deposits move the value but are NOT P&L — same rule the ledger enforces.
    const deposit = i === 100 ? 15000 : i === 260 ? 10000 : 0;
    value += deposit;
    const pnl = value * (0.0005 + (rand() - 0.5) * 0.018);
    value += pnl;
    out.push({ date: d.toISOString(), value: round2(value), pnl: round2(pnl), deposit });
    i += 1;
  }
  return out;
}

// A blended "60/40" style benchmark on the same calendar, for the overlay.
function buildBenchmark(dates) {
  const rand = makeRand(777001);
  let level = 100;
  return dates.map(date => {
    level *= 1 + (0.00028 + (rand() - 0.5) * 0.009);
    return { date, level: round2(level) };
  });
}

const SERIES = buildSeries();
const BENCH = buildBenchmark(SERIES.map(p => p.date));

const DEMO = (() => {
  const last = SERIES[SERIES.length - 1];
  const prev = SERIES[SERIES.length - 2];
  const asOf = new Date(last.date);
  const monthStart = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1);
  const yearStart = Date.UTC(asOf.getUTCFullYear(), 0, 1);

  const valueBefore = cutoff => {
    const before = SERIES.filter(p => new Date(p.date).getTime() < cutoff);
    return before.length ? before[before.length - 1].value : SERIES[0].value;
  };
  const pnlSince = cutoff =>
    SERIES.filter(p => new Date(p.date).getTime() >= cutoff).reduce((s, p) => s + p.pnl, 0);

  const grossDeposits = 75000;
  const dayPnl = last.pnl;
  const mtdPnl = pnlSince(monthStart);
  const ytdPnl = pnlSince(yearStart);

  // Risk stats from the daily series — standard tear-sheet secondary block.
  let peak = -Infinity;
  let maxDrawdown = 0;
  const dailyReturns = [];
  let upDays = 0;
  SERIES.forEach((p, i) => {
    peak = Math.max(peak, p.value);
    maxDrawdown = Math.max(maxDrawdown, (peak - p.value) / peak);
    if (i > 0) dailyReturns.push(p.pnl / SERIES[i - 1].value);
    if (p.pnl >= 0) upDays += 1;
  });
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) / dailyReturns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252);

  // Monthly returns: month P&L over value at month start, keyed by year.
  const monthly = {};
  SERIES.forEach((p, i) => {
    const d = new Date(p.date);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth();
    monthly[y] = monthly[y] || Array(12).fill(0);
    monthly[y][m] += p.pnl;
    monthly[y].base = monthly[y].base || {};
    if (!(m in monthly[y].base)) monthly[y].base[m] = i > 0 ? SERIES[i - 1].value : 50000;
  });
  Object.keys(monthly).forEach(y => {
    const base = monthly[y].base;
    monthly[y] = monthly[y].map((pnl, m) => (m in base ? (pnl / base[m]) * 100 : null));
  });

  const inceptionPnl = last.value - grossDeposits;

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
    mtdPct: (mtdPnl / valueBefore(monthStart)) * 100,
    ytdPnl,
    ytdPct: (ytdPnl / valueBefore(yearStart)) * 100,
    inceptionPnl,
    inceptionPct: (inceptionPnl / grossDeposits) * 100,
    series: SERIES,
    benchmark: BENCH,
    monthly,
    risk: {
      maxDrawdown: maxDrawdown * 100,
      volatility: volatility * 100,
      upDayPct: (upDays / SERIES.length) * 100,
    },
    funds: [
      { fundId: 'a', name: 'Fund A', strategy: 'Systematic macro', currency: 'SGD', weight: 0.52, fundSharePct: 41.27 },
      { fundId: 'b', name: 'Fund B', strategy: 'Precious metals', currency: 'SGD', weight: 0.31, fundSharePct: 22.83 },
      { fundId: 'c', name: 'Fund C', strategy: 'Global equities', currency: 'SGD', weight: 0.17, fundSharePct: 9.64 },
    ].map(f => ({
      ...f,
      value: round2(last.value * f.weight),
      dayPnl: round2(dayPnl * f.weight),
      mtdPnl: round2(mtdPnl * f.weight),
      ytdPnl: round2(ytdPnl * f.weight),
      inceptionPnl: round2(inceptionPnl * f.weight),
    })),
  };
})();

const ACTIVITY = [
  { label: 'Transfer reference submitted', detail: 'Ref OKC-8841 · Fund A', when: '1 Aug 2026', status: 'Pending receipt' },
  { label: 'Deposit approved', detail: 'SGD 6,500.00 · Fund A', when: '30 Jul 2026', status: 'Awaiting proof' },
  { label: 'Withdrawal requested', detail: 'SGD 4,000.00 · Fund B', when: '28 Jul 2026', status: 'In review' },
  { label: 'Statement ready', detail: 'July 2026 · PDF', when: '1 Jul 2026', status: 'Completed' },
  { label: 'Deposit received', detail: 'SGD 10,000.00 · Fund C', when: '14 Jun 2026', status: 'Completed' },
];

const STATUS_STYLES = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'In review': 'bg-amber-50 text-amber-700 ring-amber-600/20',
  'Awaiting proof': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  'Pending receipt': 'bg-violet-50 text-violet-700 ring-violet-600/20',
};

const FUND_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6'];
const RANGES = ['1M', '3M', '6M', 'YTD', '1Y', 'ALL'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
            value === o ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

function BenchToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition hover:text-gray-900"
    >
      <svg className="h-3 w-8" viewBox="0 0 32 6" fill="none" aria-hidden="true">
        <path d="M0 3h32" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 3" />
      </svg>
      Benchmark
      <span
        className={`relative h-4 w-7 rounded-full transition ${checked ? 'bg-slate-500' : 'bg-gray-200'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${
            checked ? 'left-3.5' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

// ── Hero band ───────────────────────────────────────────────────────────────
// One anchored block instead of a tile grid: the number that matters, the day
// move beside it, and the three standard reporting periods in a quiet row.

function HeroBand({ o }) {
  const periods = [
    { label: 'Month to date', pnl: o.mtdPnl, pct: o.mtdPct },
    { label: 'Year to date', pnl: o.ytdPnl, pct: o.ytdPct },
    { label: 'Since inception (TWR)', pnl: o.inceptionPnl, pct: o.inceptionPct },
  ];
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-sm">
      <div
        className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total portfolio value
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-white">
              {fmtMoney(o.totalValue, { currency: 'SGD ' })}
            </p>
            <DeltaChip value={o.dayPnl} label={`${fmtMoney(o.dayPnl, { sign: true })} · ${fmtPct(o.dayPct)}`} dark />
            <span className="text-xs text-slate-400">today</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Invested capital {fmtMoney(o.grossDeposits, { currency: 'SGD ' })} · Net gain{' '}
            <span className={o.inceptionPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {fmtMoney(o.inceptionPnl, { sign: true })}
            </span>{' '}
            since {fmtDate(o.inceptionDate)}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-6 lg:gap-10">
          {periods.map(p => (
            <div key={p.label} className="border-l border-slate-700 pl-4">
              <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{p.label}</dt>
              <dd
                className={`mt-1 text-lg font-bold tabular-nums ${
                  p.pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fmtPct(p.pct)}
              </dd>
              <dd className="text-xs tabular-nums text-slate-500">{fmtMoney(p.pnl, { sign: true })}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ── Performance chart ───────────────────────────────────────────────────────
// Two modes on one series: raw value (SGD), or cumulative return indexed to
// 100 at the range start. The indexed view is where the benchmark overlay
// lives — both lines share the same base, so they are genuinely comparable.
// In value mode deposits are flagged; in indexed mode they vanish from the
// line entirely, because P&L-based indexing is immune to capital flows.

function PerformanceChart({ points, bench, mode, showBench }) {
  const [hover, setHover] = useState(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const base = points[0].value;
    const benchBase = bench.length ? bench[0].level : 100;
    const primary = points.map(p => (mode === 'indexed' ? (p.value / base) * 100 : p.value));
    const secondary =
      mode === 'indexed' && showBench && bench.length === points.length
        ? bench.map(b => (b.level / benchBase) * 100)
        : null;

    const all = secondary ? primary.concat(secondary) : primary;
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.18 || 1;
    const min = lo - pad;
    const max = hi + pad;
    const toX = i => (i / (points.length - 1)) * 1000;
    const toY = v => 300 - ((v - min) / (max - min)) * 300;
    const toPath = vals =>
      vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(2)},${toY(v).toFixed(2)}`).join(' ');

    return {
      min,
      max,
      primary,
      secondary,
      xs: points.map((_, i) => toX(i)),
      ys: primary.map(toY),
      benchYs: secondary ? secondary.map(toY) : null,
      line: toPath(primary),
      area: `${toPath(primary)} L1000,300 L0,300 Z`,
      benchLine: secondary ? toPath(secondary) : null,
    };
  }, [points, bench, mode, showBench]);

  if (!geom) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-300">
        No data for this period
      </div>
    );
  }

  const isIndexed = mode === 'indexed';
  const fmtAxis = v => (isIndexed ? `${fmtPct(v - 100, { sign: true, dp: 1 })}` : `$${Math.round(v / 1000)}K`);
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
        <div className="flex w-16 flex-col justify-between pr-2 text-right text-[11px] tabular-nums text-gray-400">
          {gridValues.map(v => (
            <span key={v}>{fmtAxis(v)}</span>
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

          {/* Deposit flags (value mode only). A capital inflow steps the line
              exactly like a spectacular trading day — it must be labelled. */}
          {!isIndexed &&
            points.map((p, i) =>
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
              <linearGradient id="okc-prev-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={geom.area} fill="url(#okc-prev-area)" />
            {geom.benchLine && (
              <path
                d={geom.benchLine}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            )}
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
                <p className="font-semibold tabular-nums">
                  {isIndexed
                    ? fmtPct(geom.primary[hover] - 100)
                    : fmtMoney(geom.primary[hover], { currency: 'SGD ' })}
                </p>
                {geom.benchYs && (
                  <p className="tabular-nums text-slate-400">
                    Benchmark {fmtPct(geom.secondary[hover] - 100)}
                  </p>
                )}
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

// ── Allocation rail ─────────────────────────────────────────────────────────

function AllocationRail({ o }) {
  return (
    <Panel>
      <PanelHeader eyebrow="Allocation" title="Across funds" />
      <div className="px-5 py-4">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
          {o.funds.map((f, i) => (
            <div
              key={f.fundId}
              style={{ width: `${f.weight * 100}%`, backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
              title={`${f.name} ${(f.weight * 100).toFixed(1)}%`}
            />
          ))}
        </div>

        <ul className="mt-5 space-y-4">
          {o.funds.map((f, i) => (
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
                  {(f.weight * 100).toFixed(1)}%
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
            <dt className="text-gray-500">Invested capital</dt>
            <dd className="font-medium tabular-nums text-gray-900">{fmtMoney(o.grossDeposits)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Net gain</dt>
            <dd className={`font-medium tabular-nums ${o.inceptionPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {fmtMoney(o.inceptionPnl, { sign: true })}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Invested since</dt>
            <dd className="font-medium text-gray-900">{fmtDate(o.inceptionDate)}</dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

// ── Risk strip ──────────────────────────────────────────────────────────────
// Tear-sheet secondary stats: present, but never competing with the hero.

function RiskStrip({ o }) {
  const moves = o.series.map(p => p.pnl);
  const best = Math.max(...moves);
  const worst = Math.min(...moves);
  const stats = [
    { label: 'Max drawdown', value: fmtPct(-o.risk.maxDrawdown, { sign: false }), tone: 'text-rose-600' },
    { label: 'Volatility (ann.)', value: fmtPct(o.risk.volatility, { sign: false }), tone: 'text-gray-900' },
    { label: 'Positive days', value: fmtPct(o.risk.upDayPct, { sign: false, dp: 0 }), tone: 'text-gray-900' },
    { label: 'Best day', value: fmtMoney(best, { sign: true }), tone: 'text-emerald-600' },
    { label: 'Worst day', value: fmtMoney(worst, { sign: true }), tone: 'text-rose-600' },
  ];
  return (
    <Panel>
      <div className="grid grid-cols-2 divide-gray-100 sm:grid-cols-5 sm:divide-x">
        {stats.map(s => (
          <div key={s.label} className="px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{s.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ── Holdings table ──────────────────────────────────────────────────────────
// Tear-sheet register: right-aligned tabular numbers, one row per fund. The
// "share of fund" column is the §8.1 shareholding percentage — the number
// that explains how P&L is split, surfaced rather than hidden in a report.

function HoldingsTable({ o }) {
  return (
    <Panel className="lg:col-span-2">
      <PanelHeader
        eyebrow={`Your fund${o.funds.length > 1 ? 's' : ''}`}
        title="Holdings & returns"
        action={
          <Link href="/funds" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            View all →
          </Link>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] uppercase tracking-wider text-gray-400">
              <th className="px-5 py-3 font-medium">Fund</th>
              <th className="px-3 py-3 text-right font-medium">Value</th>
              <th className="px-3 py-3 text-right font-medium">Share of fund</th>
              <th className="px-3 py-3 text-right font-medium">Day</th>
              <th className="px-3 py-3 text-right font-medium">MTD</th>
              <th className="px-3 py-3 text-right font-medium">YTD</th>
              <th className="px-5 py-3 text-right font-medium">Inception</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {o.funds.map((f, i) => (
              <tr key={f.fundId} className="transition hover:bg-gray-50/70">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: FUND_COLORS[i % FUND_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{f.name}</p>
                      <p className="text-xs text-gray-400">
                        {f.strategy} · {f.currency}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3.5 text-right tabular-nums">
                  <p className="font-semibold text-gray-900">{fmtMoney(f.value, { currency: `${f.currency} ` })}</p>
                  <p className="text-xs text-gray-400">{(f.weight * 100).toFixed(1)}% of portfolio</p>
                </td>
                <td className="px-3 py-3.5 text-right">
                  <div className="inline-flex items-center gap-2">
                    <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${f.fundSharePct}%`,
                          backgroundColor: FUND_COLORS[i % FUND_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="tabular-nums text-gray-500">{f.fundSharePct.toFixed(2)}%</span>
                  </div>
                </td>
                {[f.dayPnl, f.mtdPnl, f.ytdPnl, f.inceptionPnl].map((v, j) => (
                  <td
                    key={j}
                    className={`${j === 3 ? 'px-5' : 'px-3'} py-3.5 text-right font-medium tabular-nums ${
                      v >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {fmtMoney(v, { sign: true })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50/60 text-sm">
              <td className="px-5 py-3 font-semibold text-gray-900">Total</td>
              <td className="px-3 py-3 text-right font-semibold tabular-nums text-gray-900">
                {fmtMoney(o.totalValue, { currency: 'SGD ' })}
              </td>
              <td className="px-3 py-3" />
              {[o.dayPnl, o.mtdPnl, o.ytdPnl, o.inceptionPnl].map((v, j) => (
                <td
                  key={j}
                  className={`${j === 3 ? 'px-5' : 'px-3'} py-3 text-right font-semibold tabular-nums ${
                    v >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {fmtMoney(v, { sign: true })}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

// ── Activity rail ───────────────────────────────────────────────────────────

function ActivityRail() {
  return (
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
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
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
  );
}

// ── Monthly returns heatmap ─────────────────────────────────────────────────
// The tear-sheet signature: years down, months across, diverging colour with
// the year column pinned at the right edge. Reads in three seconds and is a
// free by-product of the daily P&L series.

function heatColor(pct) {
  if (pct === null || pct === undefined) return undefined;
  const t = Math.min(Math.abs(pct) / 4, 1); // saturates at ±4%
  return pct >= 0
    ? `rgba(16, 185, 129, ${0.1 + t * 0.65})`
    : `rgba(244, 63, 94, ${0.1 + t * 0.65})`;
}

function ReturnsHeatmap({ monthly, asOf }) {
  const years = Object.keys(monthly).sort();
  const currentYear = new Date(asOf).getUTCFullYear();

  const yearTotal = (y, vals) => {
    const base = 1;
    return vals.reduce((acc, v) => (v === null ? acc : acc * (1 + v / 100)), base) - 1;
  };

  return (
    <Panel>
      <PanelHeader
        eyebrow="Monthly returns"
        title="Performance by month"
        action={
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span>−4%</span>
            <span
              className="h-2 w-24 rounded-full"
              style={{
                background:
                  'linear-gradient(to right, rgba(244,63,94,0.75), rgba(244,63,94,0.1), rgba(16,185,129,0.1), rgba(16,185,129,0.75))',
              }}
              aria-hidden="true"
            />
            <span>+4%</span>
          </div>
        }
      />
      <div className="overflow-x-auto px-5 py-4">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[3rem_repeat(12,1fr)_4rem] gap-1">
            <span />
            {MONTH_LABELS.map(m => (
              <span key={m} className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {m}
              </span>
            ))}
            <span className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Year
            </span>

            {years.map(y => {
              const vals = monthly[y];
              const isCurrent = Number(y) === currentYear;
              const total = yearTotal(y, vals) * 100;
              return [
                <span key={`${y}-label`} className="flex items-center text-xs font-semibold tabular-nums text-gray-500">
                  {y}
                </span>,
                ...vals.map((v, m) => {
                  const future = isCurrent && v === null;
                  return (
                    <span
                      key={`${y}-${m}`}
                      className={`flex h-9 items-center justify-center rounded-md text-xs font-medium tabular-nums ${
                        future ? 'text-gray-300' : Math.abs(v ?? 0) > 2.4 ? 'text-white' : 'text-gray-700'
                      }`}
                      style={{ backgroundColor: future ? '#f9fafb' : heatColor(v) }}
                      title={v === null ? undefined : `${MONTH_LABELS[m]} ${y}: ${fmtPct(v)}`}
                    >
                      {v === null ? '·' : v.toFixed(1)}
                    </span>
                  );
                }),
                <span
                  key={`${y}-total`}
                  className={`flex h-9 items-center justify-center rounded-md text-xs font-bold tabular-nums ${
                    total >= 0 ? 'bg-emerald-600/90 text-white' : 'bg-rose-600/90 text-white'
                  }`}
                >
                  {fmtPct(total, { dp: 1 })}
                </span>,
              ];
            })}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Monthly return = month P&L ÷ portfolio value at month start. Partial month shown for{' '}
            {fmtMonth(asOf)}.
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function DashboardDesignPreviewPage() {
  const [range, setRange] = useState('ALL');
  const [mode, setMode] = useState('indexed'); // 'indexed' | 'value'
  const [showBench, setShowBench] = useState(true);
  const o = DEMO;

  const { chartPoints, chartBench } = useMemo(() => {
    const latest = new Date(o.asOf).getTime();
    const cutoffs = {
      '1M': latest - 30 * DAY,
      '3M': latest - 90 * DAY,
      '6M': latest - 182 * DAY,
      '1Y': latest - 365 * DAY,
      YTD: Date.UTC(new Date(o.asOf).getUTCFullYear(), 0, 1),
      ALL: 0,
    };
    const keep = p => new Date(p.date).getTime() >= cutoffs[range];
    return { chartPoints: o.series.filter(keep), chartBench: o.benchmark.filter(keep) };
  }, [o, range]);

  const rangeReturn =
    chartPoints.length > 1
      ? (chartPoints[chartPoints.length - 1].value / chartPoints[0].value - 1) * 100
      : 0;

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Portfolio overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, <span className="font-medium text-gray-700">{o.name}</span> · NAV as of{' '}
            {fmtDate(o.asOf)}, computed {fmtTime(o.asOfComputedAt)}
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

      {/* ── Hero band ───────────────────────────────────────────────── */}
      <HeroBand o={o} />

      {/* ── Performance chart + allocation rail ─────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {mode === 'indexed' ? 'Cumulative return' : 'Portfolio value'}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-gray-900">
                  {mode === 'indexed' ? fmtPct(rangeReturn) : fmtMoney(o.totalValue, { currency: 'SGD ' })}
                </span>
                <DeltaChip value={rangeReturn} label={`${fmtPct(rangeReturn)} over ${range}`} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                options={['Return %', 'Value $']}
                value={mode === 'indexed' ? 'Return %' : 'Value $'}
                onChange={label => {
                  const m = label === 'Return %' ? 'indexed' : 'value';
                  setMode(m);
                  if (m === 'value') setShowBench(false);
                }}
              />
              {mode === 'indexed' && <BenchToggle checked={showBench} onChange={setShowBench} />}
              <Segmented options={RANGES} value={range} onChange={setRange} />
            </div>
          </div>

          <div className="px-5 pb-4">
            <PerformanceChart points={chartPoints} bench={chartBench} mode={mode} showBench={showBench} />
          </div>
        </Panel>

        <AllocationRail o={o} />
      </div>

      {/* ── Risk strip ──────────────────────────────────────────────── */}
      <RiskStrip o={o} />

      {/* ── Holdings + activity ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <HoldingsTable o={o} />
        <ActivityRail />
      </div>

      {/* ── Monthly returns heatmap ─────────────────────────────────── */}
      <ReturnsHeatmap monthly={o.monthly} asOf={o.asOf} />

      <p className="pb-2 text-center text-[11px] text-gray-400">
        Design preview · figures are illustrative demo data, not live portfolio data. Past
        performance is not indicative of future results.
      </p>
    </div>
  );
}
