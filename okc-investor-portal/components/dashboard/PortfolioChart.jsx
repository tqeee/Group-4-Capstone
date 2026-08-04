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
import { fmtMoney, fmtPct } from '@/lib/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const UP = '#16a34a';
const UP_FILL = 'rgba(22, 163, 74, 0.08)';
const DOWN = '#ef4444';
const DOWN_FILL = 'rgba(239, 68, 68, 0.08)';

export default function PortfolioChart({ data, currency = 'SGD ' }) {
  const chartData = useMemo(() => data || [], [data]);

  // Colour by how the period actually went, rather than always red.
  const rising = chartData.length > 1
    ? chartData[chartData.length - 1].value >= chartData[0].value
    : true;

  const config = useMemo(() => ({
    labels: chartData.map(d => d.date),
    datasets: [
      {
        label: 'Portfolio value',
        data: chartData.map(d => d.value),
        borderColor: rising ? UP : DOWN,
        backgroundColor: rising ? UP_FILL : DOWN_FILL,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: rising ? UP : DOWN,
        pointHoverBorderWidth: 3,
      },
    ],
  }), [chartData, rising]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    // Set on `interaction`, not just the tooltip: with pointRadius 0 the points
    // are invisible, and Chart.js's default (nearest + intersect) only fires
    // when the cursor is exactly over one — so the tooltip almost never showed.
    // index + intersect:false picks the nearest x position anywhere on the plot.
    interaction: { mode: 'index', intersect: false, axis: 'x' },
    plugins: {
      legend: { display: false },
      tooltip: {
        displayColors: false,
        padding: 10,
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        callbacks: {
          title: items => items[0]?.label ?? '',
          label: ctx => `Value: ${fmtMoney(ctx.parsed.y, { currency })}`,
          // Day-on-day movement, so hovering answers "what changed?" and not
          // only "what is it worth?".
          afterLabel: ctx => {
            const i = ctx.dataIndex;
            if (i === 0) return undefined;
            const prev = chartData[i - 1]?.value;
            if (typeof prev !== 'number') return undefined;
            const delta = ctx.parsed.y - prev;
            const pct = prev !== 0 ? (delta / prev) * 100 : 0;
            return `Change: ${fmtMoney(delta, { currency, sign: true })} (${fmtPct(pct)})`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: '#f3f4f6' },
        ticks: {
          color: '#9ca3af',
          font: { size: 11 },
          callback: value =>
            Math.abs(value) >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`,
        },
      },
    },
  }), [chartData, currency]);

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
