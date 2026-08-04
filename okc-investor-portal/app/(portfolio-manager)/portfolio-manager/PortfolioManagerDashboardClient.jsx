'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculatePortfolioPerformance } from '../performance/portfolioPerformance';
import StatCard from '@/components/dashboard/StatCard';
import PortfolioChart from '../port-components/PortfolioManagerChart';
import { fmtMoney, fmtPct, fmtDate, fmtTime } from '@/lib/format';
 
const monthIndex = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};
 
const rangeOptions = ['Today', '1W', '1M', '3M', '6M', '1Y', 'ALL'];
// Cycles if there are ever more funds than colors, so this never breaks as
// funds are added — just repeats the palette rather than erroring.
const DONUT_COLORS = ['#2563eb', '#60a5fa', '#93c5fd', '#1e40af', '#3b82f6', '#bfdbfe'];
const DOT_CLASSES = ['bg-blue-600', 'bg-blue-400', 'bg-blue-300', 'bg-blue-800', 'bg-blue-500', 'bg-blue-200'];
 
const formatDateInput = date => date.toISOString().slice(0, 10);
const parseInputDate = value => new Date(`${value}T00:00:00`);
const parseDisplayDate = value => {
  const [day, month, year] = value.split(' ');
  return new Date(Number(year), monthIndex[month], Number(day));
};
 
const addMonths = (date, months) => {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
};
 
const addDays = (date, days) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};
 
// Thin wrappers so every call site below stays the same, but the actual
// formatting logic lives in one shared place (lib/format) instead of being
// reimplemented here — matches how the Investor dashboard formats the same
// kinds of values.
const formatCurrency = value => fmtMoney(value, { currency: 'SGD ' });
const formatPercent = value => fmtPct(value);
const valueTone = value => (value < 0 ? 'text-red-600' : value > 0 ? 'text-green-600' : 'text-gray-900');
 
// Compact form for the donut's center label, which has limited space —
// "SGD 262K" instead of "SGD 261,638.73".
const formatCompactCurrency = value => {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}SGD ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `${sign}SGD ${(abs / 1000).toFixed(0)}K`;
  return formatCurrency(value);
};
 
 
export default function PortfolioManagerDashboardClient({ name, funds, seriesByFund, pendingActions, recentActivity }) {
  const defaultFundId = useMemo(() => {
    if (funds.length === 0) return null;
    return funds.reduce((best, f) => (f.aum > best.aum ? f : best), funds[0]).id;
  }, [funds]);
 
  const [selectedFundId, setSelectedFundId] = useState(defaultFundId);
  const fundDetails = funds.find(f => f.id === selectedFundId) ?? null;
  const totalAum = funds.reduce((s, f) => s + f.aum, 0);
 
  // Every fund's share of total AUM — scales automatically to however many
  // funds actually exist, rather than a hardcoded "this fund vs the rest".
  const allocationSegments = useMemo(() => {
    // Percentages first, so each segment's start offset can be derived from
    // them rather than by mutating a running total during the map — the React
    // Compiler rejects reassigning an outer variable inside render.
    const pcts = funds.map(fund => (totalAum > 0 ? (fund.aum / totalAum) * 100 : 0));
    return funds.map((fund, i) => ({
      fund,
      pct: pcts[i],
      // Cumulative % before this segment — used both to position it on the
      // ring and to place its label at the ring's midpoint angle.
      start: pcts.slice(0, i).reduce((sum, p) => sum + p, 0),
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      dotClass: DOT_CLASSES[i % DOT_CLASSES.length],
    }));
  }, [funds, totalAum]);
 
  const fundPerformanceData = useMemo(() => seriesByFund[selectedFundId] ?? [], [seriesByFund, selectedFundId]);
  const hasData = fundPerformanceData.length > 0;
 
  const firstAvailableDate = useMemo(
    () => (hasData ? parseDisplayDate(fundPerformanceData[0].date) : new Date()),
    [hasData, fundPerformanceData]
  );
  const lastAvailableDate = useMemo(
    () => (hasData ? parseDisplayDate(fundPerformanceData[fundPerformanceData.length - 1].date) : new Date()),
    [hasData, fundPerformanceData]
  );
  const firstAvailableInput = formatDateInput(firstAvailableDate);
  const lastAvailableInput = formatDateInput(lastAvailableDate);
 
  const getRangeDates = range => {
    if (range === 'Today') return { from: lastAvailableInput, to: lastAvailableInput };
    if (range === '1W') return { from: formatDateInput(addDays(lastAvailableDate, -7)), to: lastAvailableInput };
    if (range === '1M') return { from: formatDateInput(addMonths(lastAvailableDate, -1)), to: lastAvailableInput };
    if (range === '3M') return { from: formatDateInput(addMonths(lastAvailableDate, -3)), to: lastAvailableInput };
    if (range === '6M') return { from: formatDateInput(addMonths(lastAvailableDate, -6)), to: lastAvailableInput };
    if (range === '1Y') return { from: formatDateInput(addMonths(lastAvailableDate, -12)), to: lastAvailableInput };
    return { from: firstAvailableInput, to: lastAvailableInput };
  };
 
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [fromDate, setFromDate] = useState(firstAvailableInput);
  const [toDate, setToDate] = useState(lastAvailableInput);
 
  const handleFundChange = fundId => {
    setSelectedFundId(fundId);
    const series = seriesByFund[fundId] ?? [];
    if (series.length > 0) {
      setFromDate(formatDateInput(parseDisplayDate(series[0].date)));
      setToDate(formatDateInput(parseDisplayDate(series[series.length - 1].date)));
    }
    setSelectedRange('ALL');
  };
 
  const filteredData = useMemo(() => {
    const from = parseInputDate(fromDate);
    const to = parseInputDate(toDate);
    return fundPerformanceData.filter(row => {
      const rowDate = parseDisplayDate(row.date);
      return rowDate >= from && rowDate <= to;
    });
  }, [fromDate, toDate, fundPerformanceData]);
 
  const performance = useMemo(() => calculatePortfolioPerformance(filteredData), [filteredData]);
  const performanceRows = performance.performanceRows;
  const chartData = performance.chartData;
  const firstRow = filteredData[0];
  const lastRow = filteredData[filteredData.length - 1];
  const initialCapital = firstRow?.beginningValue || 0;
  const netContributions = filteredData.reduce((total, row) => total + row.deposits - row.withdrawals, 0);
  const visibleRows = [...performanceRows].reverse().slice(0, 5);
  const latestRow = performanceRows[performanceRows.length - 1];
 
  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return [];
    return chartData;
  }, [chartData]);
 
  const kpis = [
    {
      label: 'PORTFOLIO VALUE',
      value: formatCurrency(performance.portfolioValue),
      sub: lastRow ? `As of ${lastRow.date}` : 'No data',
      positive: performance.portfolioValue >= 0,
    },
    {
      label: "TODAY'S P&L",
      value: formatCurrency(performance.todayPnL),
      sub: latestRow ? formatPercent(latestRow.dailyReturn) : '+0.00%',
      positive: performance.todayPnL >= 0,
    },
    {
      label: 'TOTAL P&L',
      value: formatCurrency(performance.totalPnL),
      sub: latestRow ? formatPercent(latestRow.cumulativeReturn) : '+0.00%',
      positive: performance.totalPnL >= 0,
    },
    {
      label: 'FUND RETURN',
      value: formatPercent(performance.fundReturn),
      sub: firstRow ? `Since ${firstRow.date}` : 'No data',
      positive: performance.fundReturn >= 0,
    },
  ];
 
  const summaryRows = [
    { label: 'Beginning Value', value: formatCurrency(initialCapital) },
    { label: 'Ending Value', value: formatCurrency(performance.portfolioValue), tone: valueTone(performance.portfolioValue) },
    { label: 'Net Contributions', value: formatCurrency(netContributions), tone: valueTone(netContributions) },
    { label: 'Total P&L', value: formatCurrency(performance.totalPnL), tone: valueTone(performance.totalPnL) },
    { label: 'Fund Return', value: formatPercent(performance.fundReturn), tone: valueTone(performance.fundReturn) },
    { label: 'Best Day', value: performance.bestDay ? `${performance.bestDay.date} · ${formatCurrency(performance.bestDay.dailyPnL)}` : 'No data', tone: 'text-green-600' },
    { label: 'Worst Day', value: performance.worstDay ? `${performance.worstDay.date} · ${formatCurrency(performance.worstDay.dailyPnL)}` : 'No data', tone: 'text-red-600' },
  ];
 
  const handleRangeClick = range => {
    const dates = getRangeDates(range);
    setSelectedRange(range);
    setFromDate(dates.from);
    setToDate(dates.to);
  };
 
  const handleApplyCustomRange = () => {
    setSelectedRange('Custom');
  };
 
  if (funds.length === 0 || !fundDetails) {
    return (
      <div className="card p-12 text-center text-sm text-gray-400">
        No funds configured yet.
      </div>
    );
  }
 
  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-gray-500 text-sm mb-1">Welcome back, {name}!</p>
          <h1 className="page-title tracking-tight">Portfolio Dashboard</h1>
          <p className="page-subtitle">Track your portfolio performance and daily P&L.</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          {fundDetails?.asOf && (
            <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
              NAV as of {fmtDate(fundDetails.asOf)} · {fmtTime(fundDetails.asOfComputedAt)}
            </span>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Fund</label>
            <select
              value={selectedFundId ?? ''}
              onChange={event => handleFundChange(event.target.value)}
              className="w-full min-w-[220px] rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-400"
            >
              {funds.map(fund => (
                <option key={fund.id} value={fund.id}>{fund.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
 
      {!hasData ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          No performance history yet for {fundDetails.name}.
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 card p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {rangeOptions.map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => handleRangeClick(range)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${selectedRange === range ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-700'}`}
                >
                  {range}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">From Date</label>
              <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400" />
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">To Date</label>
              <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400" />
              <button type="button" onClick={handleApplyCustomRange} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800">Apply</button>
            </div>
          </div>
 
          <p className="mb-2 text-sm font-semibold text-gray-600">{fundDetails.name} — Portfolio Overview</p>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {kpis.map((card, i) => (
              <StatCard key={i} {...card} />
            ))}
          </div>
 
          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
            <section className="card p-5">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="section-label mb-1">FUND ANALYTICS</p>
                  <h2 className="text-lg font-bold text-gray-900">Portfolio Value Over Time</h2>
                  <p className="mt-3 text-sm text-blue-700"><span className="mr-2 inline-block h-0.5 w-5 align-middle bg-blue-700" />Portfolio Value (SGD)</p>
                </div>
              </div>
 
              <PortfolioChart data={chartPoints.map(p => ({ date: p.date, value: p.portfolioValue, pnl: p.dailyPnL }))} />
            </section>
 
            <aside className="card p-5">
              <p className="section-label mb-1">SELECTED PERIOD</p>
              <h2 className="text-lg font-bold text-gray-900">Performance Summary</h2>
              <div className="mt-5 divide-y divide-gray-100">
                {summaryRows.map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-4 text-sm first:pt-0 last:pb-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`text-right font-semibold tabular-nums ${row.tone || 'text-gray-900'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
 
          <div className="space-y-5">
            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Recent Performance</h2>
                  <p className="mt-1 text-xs text-gray-400">Latest 5 trading days for the selected range.</p>
                </div>
                <Link href="/performance" className="whitespace-nowrap text-sm font-semibold text-blue-700 hover:text-blue-800">
                  View full performance →
                </Link>
              </div>
              <table className="w-full table-fixed text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="w-[13%] px-3 py-3 text-left">Date</th>
                    <th className="px-3 py-3 text-right">Beginning</th>
                    <th className="px-3 py-3 text-right">Daily P&L</th>
                    <th className="px-3 py-3 text-right">Daily %</th>
                    <th className="px-3 py-3 text-right">Ending</th>
                    <th className="px-3 py-3 text-right">Cumulative</th>
                    <th className="px-3 py-3 text-right">Cumulative %</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map(row => (
                    <tr key={row.date} className="border-b border-gray-100 transition last:border-0 hover:bg-blue-50/40">
                      <td className="px-3 py-3 text-gray-700">{row.date}</td>
                      <td className="px-3 py-3 text-right text-gray-700 tabular-nums">{formatCurrency(row.beginningValue)}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${valueTone(row.dailyPnL)}`}>{formatCurrency(row.dailyPnL)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${valueTone(row.dailyReturn)}`}>{formatPercent(row.dailyReturn)}</td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-900 tabular-nums">{formatCurrency(row.endingValue)}</td>
                      <td className={`px-3 py-3 text-right font-semibold tabular-nums ${valueTone(row.cumulativePnL)}`}>{formatCurrency(row.cumulativePnL)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${valueTone(row.cumulativeReturn)}`}>{formatPercent(row.cumulativeReturn)}</td>
                    </tr>
                  ))}
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No daily performance data for this date range.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
 
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <section className="card p-5">
                <h2 className="text-lg font-bold text-gray-900">Pending Actions</h2>
                <div className="mt-5 divide-y divide-gray-100">
                  {pendingActions.map(action => (
                    <Link
                      key={action.label}
                      href="/port-transactions"
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 transition hover:bg-gray-50 -mx-2 px-2 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                        <p className="mt-1 text-xs text-gray-400">Requires portfolio manager review</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{action.count}</span>
                    </Link>
                  ))}
                </div>
              </section>
 
              <section className="card p-5">
                <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                <div className="mt-5 space-y-4">
                  {recentActivity.map((activity, i) => (
                    <div key={`${activity.label}-${i}`} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{activity.label}</p>
                        <p className="mt-1 text-xs text-gray-400">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p className="text-sm text-gray-400">No recent activity.</p>
                  )}
                </div>
              </section>
            </div>
 
            <aside className="card p-5">
              <p className="section-label mb-1">AUM SHARE</p>
              <h2 className="text-lg font-bold text-gray-900">Fund Allocation</h2>
              <div className="mt-6 flex flex-col items-center">
                {/* Sizing math: ring radius 80px + a 20px minimum visual gap +
                    half the label's own width (50px, since a label sitting
                    directly left/right of the ring is as close as its width
                    allows, not just its distance from center) = labelRadius
                    of 155px keeps every label clear of the ring regardless
                    of angle or how many digits the amounts grow to. */}
                <div className="relative mx-auto mb-4" style={{ width: 420, height: 420 }}>
                  {/* Donut ring, centered within the larger label area */}
                  <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 42 42">
                      {allocationSegments.map(segment => (
                        <circle
                          key={segment.fund.id}
                          cx="21" cy="21" r="15.915" fill="transparent"
                          stroke={segment.color} strokeWidth="4"
                          strokeDasharray={`${segment.pct} ${100 - segment.pct}`}
                          strokeDashoffset={100 - segment.start}
                        />
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                      <p className="text-xs text-gray-400">TOTAL</p>
                      <p className="text-base font-bold leading-tight text-gray-900 tabular-nums">{formatCompactCurrency(totalAum)}</p>
                    </div>
                  </div>
 
                  {/* Percentage + amount labels at each segment's midpoint
                      angle (0% = top, clockwise). */}
                  {allocationSegments.map(segment => {
                    const midpointPct = segment.start + segment.pct / 2;
                    const angle = (midpointPct / 100) * 2 * Math.PI;
                    const labelRadius = 155;
                    const x = 210 + labelRadius * Math.sin(angle);
                    const y = 210 - labelRadius * Math.cos(angle);
                    return (
                      <div
                        key={segment.fund.id}
                        className="absolute text-center"
                        style={{ left: x, top: y, transform: 'translate(-50%, -50%)', width: 100 }}
                      >
                        <p className="text-sm font-bold text-gray-900 tabular-nums">{segment.pct.toFixed(0)}%</p>
                        <p className="text-xs text-gray-500 leading-tight tabular-nums">{formatCurrency(segment.fund.aum)}</p>
                      </div>
                    );
                  })}
                </div>
 
                <div className="w-full flex flex-col gap-3">
                  {allocationSegments.map(segment => (
                    <div key={segment.fund.id} className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${segment.dotClass} shrink-0`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{segment.fund.name}</p>
                          <p className="text-sm text-gray-400 tabular-nums">{formatCurrency(segment.fund.aum)}</p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{segment.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-xs text-gray-400 self-start">As of {lastRow?.date || 'No data'}</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}