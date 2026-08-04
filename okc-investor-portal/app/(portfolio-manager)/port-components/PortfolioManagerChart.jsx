'use client';
import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
 
// PM-only fork of components/dashboard/PortfolioChart.jsx — kept separate
// (rather than editing the shared component) so this section's P&L-based
// coloring doesn't change behavior on the Investor dashboard, which also
// uses the shared component and is outside Portfolio Manager's scope.
 
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);
 
const UP_COLOR = '#16a34a';
const UP_FILL = 'rgba(22, 163, 74, 0.08)';
const DOWN_COLOR = '#ef4444';
const DOWN_FILL = 'rgba(239, 68, 68, 0.08)';
 
// Whether a given point represents an "up" day. Uses `pnl` (that day's
// trading P&L only) rather than the raw `value` — a deposit/withdrawal can
// move `value` up or down with zero actual gain or loss, so coloring off the
// raw value would conflate cash flow with performance. Falls back to a
// simple value-over-value comparison if a caller hasn't passed `pnl`.
const isUpDay = (chartData, index) => {
  const point = chartData[index];
  if (typeof point?.pnl === 'number') return point.pnl >= 0;
  if (index === 0) return true;
  return point.value >= chartData[index - 1].value;
};
 
// valueType controls axis/tooltip formatting: 'currency' (default, matches
// original behavior exactly) or 'percent' (used by Performance's Fund
// Return % metric).
//
// onHoverPoint (optional): if provided, disables Chart.js's own built-in
// tooltip rendering and instead calls onHoverPoint(index, x, y) on every
// hover/move — (index=null, 0, 0) on mouse-leave. x/y are in the same pixel
// coordinate space as the chart's own canvas, so a caller positioning its
// own custom tooltip absolutely within the same wrapper div can use them
// directly. This lets Performance keep its existing rich, multi-field,
// custom-colored tooltip while still getting Chart.js's real animated
// redraw — instead of choosing one or the other.
export default function PortfolioManagerChart({ data, valueType = 'currency', onHoverPoint }) {
  const chartData = data || [];
 
  const formatValue = (value) =>
    valueType === 'percent'
      ? `${value.toFixed(1)}%`
      : `$${(value / 1000).toFixed(0)}K`;
 
  const config = useMemo(() => ({
    labels: chartData.map(d => d.date),
    datasets: [
      {
        data: chartData.map(d => d.value),
        borderColor: DOWN_COLOR,
        backgroundColor: DOWN_FILL,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: (ctx) => (isUpDay(chartData, ctx.dataIndex) ? UP_COLOR : DOWN_COLOR),
        // Segment styling colors each stretch of the line by the day it
        // leads into (p1), so the line flips green/red at every up/down day
        // instead of being one flat color end to end.
        segment: {
          borderColor: (ctx) => (isUpDay(chartData, ctx.p1DataIndex) ? UP_COLOR : DOWN_COLOR),
          backgroundColor: (ctx) => (isUpDay(chartData, ctx.p1DataIndex) ? UP_FILL : DOWN_FILL),
        },
      },
    ],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [JSON.stringify(chartData)]);
 
  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: onHoverPoint
        ? {
            enabled: false,
            mode: 'index',
            intersect: false,
            external: (context) => {
              const tooltipModel = context.tooltip;
              if (!tooltipModel || tooltipModel.opacity === 0) {
                onHoverPoint(null, 0, 0);
                return;
              }
              const index = tooltipModel.dataPoints?.[0]?.dataIndex ?? null;
              onHoverPoint(index, tooltipModel.caretX, tooltipModel.caretY);
            },
          }
        : {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (ctx) =>
                valueType === 'percent'
                  ? ` ${ctx.parsed.y.toFixed(2)}%`
                  : ` SGD ${ctx.parsed.y.toLocaleString('en-SG', { minimumFractionDigits: 2 })}`,
            },
          },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          callback: (value) => formatValue(value),
        },
      },
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [valueType, onHoverPoint]);
 
  if (chartData.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-gray-300 text-sm">
        No data for this period
      </div>
    );
  }
 
  return (
    <div style={{ height: '220px' }}>
      <Line data={config} options={options} />
    </div>
  );
}