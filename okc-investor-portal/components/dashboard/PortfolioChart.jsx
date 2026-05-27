'use client';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export default function PortfolioChart({ data }) {
  // fallback to empty if no data passed
  const chartData = data || [];

  const config = {
    labels: chartData.map(d => d.date),
    datasets: [
      {
        data: chartData.map(d => d.value),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: '#ef4444',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) =>
            ` SGD ${ctx.parsed.y.toLocaleString('en-SG', {
              minimumFractionDigits: 2,
            })}`,
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
          callback: (value) => `$${(value / 1000).toFixed(0)}K`,
        },
      },
    },
  };

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