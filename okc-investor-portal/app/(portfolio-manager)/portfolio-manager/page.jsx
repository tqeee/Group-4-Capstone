'use client';
import { useMemo, useState } from 'react';
import { getDashboardActivity, getFundDetails, getFundPerformance, getPendingActions } from '../port-services/portfolioService';
import { calculatePortfolioPerformance } from '../performance/portfolioPerformance';

const monthIndex = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const rangeOptions = ['Today', '1W', '1M', '3M', '6M', '1Y', 'ALL'];

const fundPerformanceData = getFundPerformance();

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

const firstAvailableDate = parseDisplayDate(fundPerformanceData[0].date);
const lastAvailableDate = parseDisplayDate(fundPerformanceData[fundPerformanceData.length - 1].date);
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

const formatCurrency = value => {
  const sign = value < 0 ? '-' : '';
  const absoluteValue = Math.abs(value);

  return `${sign}SGD ${absoluteValue.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const valueTone = value => (value < 0 ? 'text-red-600' : value > 0 ? 'text-green-600' : 'text-gray-900');

const chartWidth = 900;
const chartHeight = 320;
const chartPaddingX = 44;
const chartPaddingY = 28;

export default function PortfolioManagerDashboardPage() {
  const fundDetails = getFundDetails()[0];
  const pendingActions = getPendingActions();
  const recentActivity = getDashboardActivity();
  const [selectedRange, setSelectedRange] = useState('ALL');
  const [fromDate, setFromDate] = useState(firstAvailableInput);
  const [toDate, setToDate] = useState(lastAvailableInput);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const filteredData = useMemo(() => {
    const from = parseInputDate(fromDate);
    const to = parseInputDate(toDate);

    return fundPerformanceData.filter(row => {
      const rowDate = parseDisplayDate(row.date);

      return rowDate >= from && rowDate <= to;
    });
  }, [fromDate, toDate]);

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

    const portfolioValues = chartData.map(point => point.portfolioValue);
    const minPortfolioValue = Math.min(...portfolioValues);
    const maxPortfolioValue = Math.max(...portfolioValues);
    const valueRange = maxPortfolioValue - minPortfolioValue || 1;

    return chartData.map((point, index) => {
      const x = chartPaddingX + (index / (chartData.length - 1 || 1)) * (chartWidth - chartPaddingX * 2);
      const y = chartPaddingY + ((maxPortfolioValue - point.portfolioValue) / valueRange) * (chartHeight - chartPaddingY * 2);

      return { ...point, x, y };
    });
  }, [chartData]);

  const polylinePoints = chartPoints.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const chartBaseline = chartHeight - chartPaddingY;
  const areaPoints = chartPoints.length > 0 ? `${chartPaddingX},${chartBaseline} ${polylinePoints} ${chartWidth - chartPaddingX},${chartBaseline}` : '';
  const gridLines = [0.2, 0.4, 0.6, 0.8].map(position => chartPaddingY + position * (chartHeight - chartPaddingY * 2));
  const dateLabels = chartPoints.filter((_, index) => index % 3 === 0 || index === chartPoints.length - 1);

  const kpis = [
    { label: 'Portfolio Value', value: formatCurrency(performance.portfolioValue), helper: lastRow ? `As of ${lastRow.date}` : 'No data', tone: valueTone(performance.portfolioValue), icon: '↗', accent: 'bg-blue-100 text-blue-700' },
    { label: "Today's P&L", value: formatCurrency(performance.todayPnL), helper: latestRow ? formatPercent(latestRow.dailyReturn) : '+0.00%', tone: valueTone(performance.todayPnL), icon: '↗', accent: 'bg-green-100 text-green-700' },
    { label: 'Total P&L', value: formatCurrency(performance.totalPnL), helper: latestRow ? formatPercent(latestRow.cumulativeReturn) : '+0.00%', tone: valueTone(performance.totalPnL), icon: '$', accent: 'bg-red-100 text-red-600' },
    { label: 'Fund Return', value: formatPercent(performance.fundReturn), helper: firstRow ? `Since ${firstRow.date}` : 'No data', tone: valueTone(performance.fundReturn), icon: '◎', accent: 'bg-purple-100 text-purple-700' },
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
    setHoveredPoint(null);
  };

  const handleApplyCustomRange = () => {
    setSelectedRange('Custom');
    setHoveredPoint(null);
  };

  return (
    <div className="xl:relative xl:left-1/2 xl:w-[calc(100vw-4rem)] xl:max-w-[1600px] xl:-translate-x-1/2">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Portfolio Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">Track your portfolio performance and daily P&L.</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {rangeOptions.map(range => (
            <button
              key={range}
              type="button"
              onClick={() => handleRangeClick(range)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${selectedRange === range ? 'bg-blue-700 text-white' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-700'}`}
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

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map(card => (
          <div key={card.label} className="flex min-h-36 items-start justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <p className="text-sm font-semibold text-gray-900">{card.label}</p>
              <p className={`mt-4 text-2xl font-bold ${card.tone}`}>{card.value}</p>
              <p className="mt-3 text-sm text-gray-500">{card.helper}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold ${card.accent}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Portfolio Value Over Time</h2>
              <p className="mt-3 text-sm text-blue-700"><span className="mr-2 inline-block h-0.5 w-5 align-middle bg-blue-700" />Portfolio Value (SGD)</p>
            </div>
            <button type="button" className="w-fit rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 transition hover:border-blue-200">Compare</button>
          </div>

          <div className="group relative h-[360px] overflow-hidden rounded-lg border border-gray-100 bg-gradient-to-b from-white to-blue-50/30 p-4" onMouseLeave={() => setHoveredPoint(null)}>
            {chartPoints.length > 0 ? (
              <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} aria-label="Portfolio value over time line chart">
                {gridLines.map(lineY => (
                  <line key={lineY} x1={chartPaddingX} x2={chartWidth - chartPaddingX} y1={lineY} y2={lineY} stroke="#e5e7eb" strokeDasharray="5 5" />
                ))}
                <line x1={chartPaddingX} x2={chartWidth - chartPaddingX} y1={chartBaseline} y2={chartBaseline} stroke="#d1d5db" />
                <polygon points={areaPoints} fill="#bfdbfe" opacity="0.55" />
                <polyline points={polylinePoints} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                {chartPoints.map(point => (
                  <circle
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r="6"
                    fill="white"
                    stroke="#2563eb"
                    strokeWidth="3"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(point)}
                  />
                ))}
                {dateLabels.map(point => (
                  <text key={point.date} x={point.x} y={chartHeight - 6} textAnchor="middle" className="fill-gray-400 text-[12px]">
                    {point.date.split(' ').slice(0, 2).join(' ')}
                  </text>
                ))}
              </svg>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">No performance data for this date range.</div>
            )}
            {hoveredPoint && (
              <div className="pointer-events-none absolute rounded-xl border border-gray-200 bg-white p-4 text-xs shadow-lg" style={{ left: `${Math.min(70, Math.max(8, (hoveredPoint.x / chartWidth) * 100))}%`, top: `${Math.min(62, Math.max(8, (hoveredPoint.y / chartHeight) * 100))}%` }}>
                <p className="mb-3 text-sm font-bold text-gray-900">{hoveredPoint.date}</p>
                <div className="space-y-2">
                  <div className="flex min-w-56 justify-between gap-5"><span className="text-gray-500">Portfolio Value</span><span className="font-semibold text-gray-900">{formatCurrency(hoveredPoint.portfolioValue)}</span></div>
                  <div className="flex justify-between gap-5"><span className="text-gray-500">Daily P&L</span><span className={`font-semibold ${valueTone(hoveredPoint.dailyPnL)}`}>{formatCurrency(hoveredPoint.dailyPnL)}</span></div>
                  <div className="flex justify-between gap-5"><span className="text-gray-500">Daily Return</span><span className={`font-semibold ${valueTone(hoveredPoint.dailyReturn)}`}>{formatPercent(hoveredPoint.dailyReturn)}</span></div>
                  <div className="flex justify-between gap-5"><span className="text-gray-500">Cumulative P&L</span><span className={`font-semibold ${valueTone(hoveredPoint.cumulativePnL)}`}>{formatCurrency(hoveredPoint.cumulativePnL)}</span></div>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Performance Summary</h2>
          <div className="mt-5 divide-y divide-gray-100">
            {summaryRows.map(row => (
              <div key={row.label} className="flex items-center justify-between gap-4 py-4 text-sm first:pt-0 last:pb-0">
                <span className="text-gray-500">{row.label}</span>
                <span className={`text-right font-semibold ${row.tone || 'text-gray-900'}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="space-y-5">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900">Recent Performance</h2>
            <p className="mt-1 text-xs text-gray-400">Latest 5 trading days for the selected range.</p>
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
                  <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(row.beginningValue)}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${valueTone(row.dailyPnL)}`}>{formatCurrency(row.dailyPnL)}</td>
                  <td className={`px-3 py-3 text-right ${valueTone(row.dailyReturn)}`}>{formatPercent(row.dailyReturn)}</td>
                  <td className="px-3 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.endingValue)}</td>
                  <td className={`px-3 py-3 text-right font-semibold ${valueTone(row.cumulativePnL)}`}>{formatCurrency(row.cumulativePnL)}</td>
                  <td className={`px-3 py-3 text-right ${valueTone(row.cumulativeReturn)}`}>{formatPercent(row.cumulativeReturn)}</td>
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
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Pending Actions</h2>
            <div className="mt-5 divide-y divide-gray-100">
              {pendingActions.map(action => (
                <div key={action.label} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                    <p className="mt-1 text-xs text-gray-400">Requires portfolio manager review</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">{action.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <div className="mt-5 space-y-4">
              {recentActivity.map(activity => (
                <div key={`${activity.label}-${activity.time.replace(' · ', ' • ')}`} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{activity.label}</p>
                    <p className="mt-1 text-xs text-gray-400">{activity.time.replace(' · ', ' • ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Fund Allocation</h2>
          <div className="mt-8">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{fundDetails.name}</p>
                <p className="mt-1 text-xs text-gray-400">Single-fund allocation</p>
              </div>
              <p className="text-3xl font-bold text-blue-700">{fundDetails.allocation}%</p>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-blue-700" style={{ width: `${fundDetails.allocation}%` }} />
            </div>
            <p className="mt-6 text-xs text-gray-400">As of {lastRow?.date || 'No data'}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}