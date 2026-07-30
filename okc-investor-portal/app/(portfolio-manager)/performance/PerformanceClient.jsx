'use client';
import { useMemo, useState } from 'react';
import { calculatePortfolioPerformance } from './portfolioPerformance';

const monthIndex = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const rangeOptions = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];
const metricOptions = [
  { label: 'Portfolio Value', value: 'portfolioValue', type: 'currency' },
  { label: 'Daily P&L', value: 'dailyPnL', type: 'currency' },
  { label: 'Cumulative P&L', value: 'cumulativePnL', type: 'currency' },
  { label: 'Fund Return %', value: 'fundReturn', type: 'percent' },
];

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

const formatCurrency = value => {
  const sign = value < 0 ? '-' : '';
  const absoluteValue = Math.abs(value);
  return `${sign}SGD ${absoluteValue.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = value => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
const valueTone = value => (value < 0 ? 'text-red-600' : value > 0 ? 'text-green-600' : 'text-gray-900');
const formatMetricValue = (value, type) => (type === 'percent' ? formatPercent(value) : formatCurrency(value));

const chartWidth = 900;
const chartHeight = 340;
const chartPaddingX = 44;
const chartPaddingY = 30;

export default function PerformanceClient({ funds, seriesByFund }) {
  const defaultFundId = useMemo(() => {
    if (funds.length === 0) return null;
    return funds.reduce((best, f) => (f.aum > best.aum ? f : best), funds[0]).id;
  }, [funds]);

  const [selectedFund, setSelectedFund] = useState(defaultFundId);
  const fundPerformanceData = useMemo(() => seriesByFund[selectedFund] ?? [], [seriesByFund, selectedFund]);
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
  const [selectedMetric, setSelectedMetric] = useState('portfolioValue');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const handleFundChange = fundId => {
    setSelectedFund(fundId);
    const series = seriesByFund[fundId] ?? [];
    if (series.length > 0) {
      setFromDate(formatDateInput(parseDisplayDate(series[0].date)));
      setToDate(formatDateInput(parseDisplayDate(series[series.length - 1].date)));
    }
    setSelectedRange('ALL');
    setHoveredPoint(null);
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
  const rows = performance.performanceRows;
  const firstRow = filteredData[0];
  const initialCapital = firstRow?.beginningValue || 0;
  const netContributions = filteredData.reduce((total, row) => total + row.deposits - row.withdrawals, 0);
  const selectedMetricConfig = metricOptions.find(metric => metric.value === selectedMetric) || metricOptions[0];
  const selectedFundName = funds.find(fund => fund.id === selectedFund)?.name || funds[0]?.name || '—';
  const periodLabel = firstRow && filteredData[filteredData.length - 1]
    ? `${firstRow.date} – ${filteredData[filteredData.length - 1].date}`
    : `${fromDate} – ${toDate}`;

  const chartData = useMemo(() => rows.map(row => ({
    date: row.date,
    portfolioValue: row.endingValue,
    dailyPnL: row.dailyPnL,
    cumulativePnL: row.cumulativePnL,
    fundReturn: row.cumulativeReturn,
  })), [rows]);

  const chartPoints = useMemo(() => {
    if (chartData.length === 0) return [];
    const metricValues = chartData.map(point => point[selectedMetric]);
    const minMetricValue = Math.min(...metricValues);
    const maxMetricValue = Math.max(...metricValues);
    const valueRange = maxMetricValue - minMetricValue || 1;

    return chartData.map((point, index) => {
      const x = chartPaddingX + (index / (chartData.length - 1 || 1)) * (chartWidth - chartPaddingX * 2);
      const y = chartPaddingY + ((maxMetricValue - point[selectedMetric]) / valueRange) * (chartHeight - chartPaddingY * 2);
      return { ...point, x, y, metricValue: point[selectedMetric] };
    });
  }, [chartData, selectedMetric]);

  const polylinePoints = chartPoints.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const chartBaseline = chartHeight - chartPaddingY;
  const areaPoints = chartPoints.length > 0 ? `${chartPaddingX},${chartBaseline} ${polylinePoints} ${chartWidth - chartPaddingX},${chartBaseline}` : '';
  const gridLines = [0.2, 0.4, 0.6, 0.8].map(position => chartPaddingY + position * (chartHeight - chartPaddingY * 2));
  const dateLabels = chartPoints.filter((_, index) => index % 3 === 0 || index === chartPoints.length - 1);

  const statistics = useMemo(() => {
    if (rows.length === 0) {
      return { bestDay: null, worstDay: null, averageDailyPnL: 0, averageDailyReturn: 0, positiveDays: 0, negativeDays: 0 };
    }
    const totalDailyReturn = rows.reduce((total, row) => total + row.dailyReturn, 0);
    return {
      bestDay: rows.reduce((best, row) => (row.dailyPnL > best.dailyPnL ? row : best), rows[0]),
      worstDay: rows.reduce((worst, row) => (row.dailyPnL < worst.dailyPnL ? row : worst), rows[0]),
      averageDailyPnL: rows.reduce((total, row) => total + row.dailyPnL, 0) / rows.length,
      averageDailyReturn: totalDailyReturn / rows.length,
      positiveDays: rows.filter(row => row.dailyPnL > 0).length,
      negativeDays: rows.filter(row => row.dailyPnL < 0).length,
    };
  }, [rows]);

  const rollingReturns = useMemo(() => {
    const selectedEndDate = filteredData.length > 0 ? parseDisplayDate(filteredData[filteredData.length - 1].date) : lastAvailableDate;
    const buildPeriod = (period, targetStartDate) => {
      const periodData = filteredData.filter(row => parseDisplayDate(row.date) >= targetStartDate && parseDisplayDate(row.date) <= selectedEndDate);
      const usableData = periodData.length > 0 ? periodData : filteredData;
      const result = calculatePortfolioPerformance(usableData);
      const firstUsableDate = usableData[0] ? parseDisplayDate(usableData[0].date) : null;
      const label = firstUsableDate && firstUsableDate > targetStartDate ? `${period} (available)` : period;
      return { period: label, returnPercent: result.fundReturn, totalPnL: result.totalPnL, endingValue: result.portfolioValue };
    };

    return [
      buildPeriod('1D', selectedEndDate),
      buildPeriod('1W', addDays(selectedEndDate, -7)),
      buildPeriod('1M', addMonths(selectedEndDate, -1)),
      buildPeriod('YTD', new Date(selectedEndDate.getFullYear(), 0, 1)),
      buildPeriod('Since Inception', firstAvailableDate),
    ];
  }, [filteredData, lastAvailableDate, firstAvailableDate]);

  const summaryRows = [
    { label: 'Beginning Value', value: formatCurrency(initialCapital) },
    { label: 'Ending Value', value: formatCurrency(performance.portfolioValue), tone: valueTone(performance.portfolioValue) },
    { label: 'Latest P&L', value: formatCurrency(performance.todayPnL), tone: valueTone(performance.todayPnL) },
    { label: 'Total P&L', value: formatCurrency(performance.totalPnL), tone: valueTone(performance.totalPnL) },
    { label: 'Fund Return', value: formatPercent(performance.fundReturn), tone: valueTone(performance.fundReturn) },
    { label: 'Net Contributions', value: formatCurrency(netContributions), tone: valueTone(netContributions) },
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

  if (funds.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
        No funds configured yet.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm text-gray-500">Portfolio Manager</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">Performance</h1>
          <p className="mt-2 text-sm text-gray-500">Detailed fund analytics for NAV, daily P&L, cumulative P&L, and fund return.</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(0,2fr)]">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-400">Fund</label>
            <select
              value={selectedFund ?? ''}
              onChange={event => handleFundChange(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-400"
            >
              {funds.map(fund => <option key={fund.id} value={fund.id}>{fund.name}</option>)}
            </select>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Date Range</p>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-gray-200 bg-white">
                {rangeOptions.map(range => (
                  <button
                    key={range}
                    type="button"
                    onClick={() => handleRangeClick(range)}
                    className={`px-4 py-2 text-sm transition ${selectedRange === range ? 'bg-blue-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    {range}
                  </button>
                ))}
              </div>
              <input type="date" value={fromDate} onChange={event => setFromDate(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400" />
              <input type="date" value={toDate} onChange={event => setToDate(event.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 outline-none focus:border-blue-400" />
              <button type="button" onClick={handleApplyCustomRange} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Apply</button>
            </div>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-400">
          No performance history yet for {selectedFundName}.
        </div>
      ) : (
        <>
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Metric</span>
              {metricOptions.map(metric => (
                <button
                  key={metric.value}
                  type="button"
                  onClick={() => { setSelectedMetric(metric.value); setHoveredPoint(null); }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${selectedMetric === metric.value ? 'bg-blue-700 text-white' : 'bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-700'}`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Fund analytics</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">Fund Performance Over Time</h2>
                <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-500 md:grid-cols-3">
                  <p><span className="font-semibold text-gray-600">Fund:</span> {selectedFundName}</p>
                  <p><span className="font-semibold text-gray-600">Period:</span> {periodLabel}</p>
                  <p><span className="font-semibold text-gray-600">Metric:</span> {selectedMetricConfig.label}</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-blue-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
                  {selectedMetricConfig.label}
                </div>
              </div>
              <div className="relative h-[380px] rounded-lg border border-gray-100 bg-gradient-to-b from-white to-blue-50/30 p-4" onMouseLeave={() => setHoveredPoint(null)}>
                {chartPoints.length > 0 ? (
                  <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} aria-label="Fund performance over time chart">
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
                      <div className="flex min-w-56 justify-between gap-5"><span className="text-gray-500">{selectedMetricConfig.label}</span><span className={`font-semibold ${valueTone(hoveredPoint.metricValue)}`}>{formatMetricValue(hoveredPoint.metricValue, selectedMetricConfig.type)}</span></div>
                      <div className="flex justify-between gap-5"><span className="text-gray-500">Portfolio Value</span><span className="font-semibold text-gray-900">{formatCurrency(hoveredPoint.portfolioValue)}</span></div>
                      <div className="flex justify-between gap-5"><span className="text-gray-500">Daily P&L</span><span className={`font-semibold ${valueTone(hoveredPoint.dailyPnL)}`}>{formatCurrency(hoveredPoint.dailyPnL)}</span></div>
                      <div className="flex justify-between gap-5"><span className="text-gray-500">Fund Return</span><span className={`font-semibold ${valueTone(hoveredPoint.fundReturn)}`}>{formatPercent(hoveredPoint.fundReturn)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Selected period</p>
              <h2 className="mt-2 text-lg font-bold text-gray-900">Performance Summary</h2>
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

          <div className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,3fr)_minmax(0,7fr)]">
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">Performance Statistics</h2>
              <div className="mt-5 divide-y divide-gray-100">
                {[
                  { label: 'Best Day', value: statistics.bestDay ? `${statistics.bestDay.date} · ${formatCurrency(statistics.bestDay.dailyPnL)}` : 'No data', tone: 'text-green-600' },
                  { label: 'Worst Day', value: statistics.worstDay ? `${statistics.worstDay.date} · ${formatCurrency(statistics.worstDay.dailyPnL)}` : 'No data', tone: 'text-red-600' },
                  { label: 'Average Daily P&L', value: formatCurrency(statistics.averageDailyPnL), tone: valueTone(statistics.averageDailyPnL) },
                  { label: 'Average Daily Return', value: formatPercent(statistics.averageDailyReturn), tone: valueTone(statistics.averageDailyReturn) },
                  { label: 'Positive Days', value: statistics.positiveDays },
                  { label: 'Negative Days', value: statistics.negativeDays },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0">
                    <span className="text-gray-500">{row.label}</span>
                    <span className={`text-right font-semibold ${row.tone || 'text-gray-900'}`}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Rolling Returns</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Period</th>
                    <th className="px-4 py-3 text-right">Return %</th>
                    <th className="px-4 py-3 text-right">Total P&L</th>
                    <th className="px-4 py-3 text-right">Ending Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rollingReturns.map(row => (
                    <tr key={row.period} className="border-b border-gray-100 transition last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-900">{row.period}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${valueTone(row.returnPercent)}`}>{formatPercent(row.returnPercent)}</td>
                      <td className={`px-4 py-4 text-right font-semibold ${valueTone(row.totalPnL)}`}>{formatCurrency(row.totalPnL)}</td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-900">{formatCurrency(row.endingValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Daily Performance</h2>
            <table className="w-full table-fixed text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                <tr>
                  <th className="w-[13%] px-3 py-3 text-left">Date</th>
                  <th className="px-3 py-3 text-right">Beginning Value</th>
                  <th className="px-3 py-3 text-right">Daily P&L</th>
                  <th className="px-3 py-3 text-right">Daily Return %</th>
                  <th className="px-3 py-3 text-right">Ending Value</th>
                  <th className="px-3 py-3 text-right">Cumulative P&L</th>
                  <th className="px-3 py-3 text-right">Cumulative Return %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
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
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-400">No daily performance data for this date range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
