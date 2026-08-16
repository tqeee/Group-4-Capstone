'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import StatCard from '@/components/dashboard/StatCard';
import PortfolioChart from '@/components/dashboard/PortfolioChart';
import HoldingsTable from '@/components/dashboard/HoldingsTable';
import PerformanceSection from './PerformanceSection';
import ActivitySection from './ActivitySection';
import { fmtDate, fmtMoney, fmtPct, fmtMonth, fmtTime } from '@/lib/format';

const FILTERS = ['1W', '1M', '3M', 'YTD', '1Y', 'All'];
const DONUT_COLORS = ['#2563eb', '#60a5fa', '#bfdbfe', '#1e40af'];
const DOT_CLASSES = ['bg-blue-600', 'bg-blue-400', 'bg-blue-200', 'bg-blue-800'];

export default function InvestorDashboard({ name, overview, availableFunds = [], reports, activity = [] }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const searchParams = useSearchParams();
  const searchQuery = (searchParams.get('search') || '').toLowerCase().trim();

  const hasData = overview?.hasData;

  const filteredAllocation = useMemo(() => {
    const allocation = overview?.allocation ?? [];
    if (!searchQuery) return allocation;
    return allocation.filter(fund => fund.name.toLowerCase().includes(searchQuery));
  }, [overview, searchQuery]);

  const filteredChartData = useMemo(() => {
    if (!hasData) return [];
    const series = overview.series;
    const latest = new Date(overview.asOf).getTime();
    const DAY = 24 * 60 * 60 * 1000;
    const cutoffs = {
      '1W': latest - 7 * DAY,
      '1M': latest - 30 * DAY,
      '3M': latest - 90 * DAY,
      YTD: Date.UTC(new Date(overview.asOf).getUTCFullYear(), 0, 1),
      '1Y': latest - 365 * DAY,
      All: 0,
    };
    return series
      .filter(d => new Date(d.date).getTime() >= cutoffs[activeFilter])
      .map(d => ({ date: fmtDate(d.date).slice(0, -5), value: d.value }));
  }, [overview, hasData, activeFilter]);

  // Newly onboarded investor: nothing to chart yet, so make the first action
  // obvious instead of showing an empty portfolio.
  if (!hasData) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-gray-500 text-sm mb-1">Welcome, <b>{name}</b>!</p>
          <h1 className="page-title">Let&apos;s get started</h1>
          <p className="page-subtitle mt-1">
            Choose a fund below and submit a deposit request. Once operations confirm your
            transfer, your portfolio and performance will appear here.
          </p>
        </div>

        {availableFunds.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {availableFunds.map(fund => (
                <div key={fund.id} className="card p-5 flex flex-col justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{fund.name}</p>
                    {fund.strategy && <p className="text-xs text-gray-400 mt-1.5">{fund.strategy}</p>}
                  </div>
                  <Link
                    href={`/request-transaction?fundId=${fund.id}`}
                    className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
                  >
                    Deposit into this fund
                  </Link>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <p className="section-label mb-2">WHAT HAPPENS NEXT</p>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm text-gray-600">
                <li>Submit a deposit request, and set your risk tolerance for that fund.</li>
                <li>Operations review it and email you the bank transfer details.</li>
                <li>You make the transfer and submit its reference.</li>
                <li>Once operations confirm receipt, your holding goes live here.</li>
              </ol>
            </div>
          </>
        ) : (
          <div className="card p-12 text-center text-sm text-gray-400">
            No funds are open for investment at the moment. Please check back shortly.
          </div>
        )}
      </div>
    );
  }

  const asOfLabel = fmtDate(overview.asOf);
  const stats = [
    {
      label: 'TOTAL PORTFOLIO VALUE',
      value: fmtMoney(overview.totalValue),
      sub: `${fmtMoney(overview.dayPnl, { sign: true })} today`,
      positive: overview.dayPnl >= 0,
    },
    {
      label: `DAY P&L · ${asOfLabel.toUpperCase()}`,
      value: fmtMoney(overview.dayPnl, { sign: true }),
      sub: fmtPct(overview.dayPct),
      positive: overview.dayPnl >= 0,
    },
    {
      label: `${fmtMonth(overview.asOf).toUpperCase()} MTD`,
      value: fmtMoney(overview.mtdPnl, { sign: true }),
      sub: `${fmtPct(overview.mtdPct)} MTD`,
      positive: overview.mtdPnl >= 0,
    },
    {
      label: `SINCE INCEPTION · ${fmtDate(overview.inceptionDate).toUpperCase()}`,
      value: fmtPct(overview.inceptionPct),
      sub: fmtMoney(overview.inceptionPnl, { sign: true }),
      positive: overview.inceptionPnl >= 0,
    },
  ];

  const holdings = filteredAllocation.map(fund => ({
    fund: fund.name,
    tag: fund.strategy ?? fund.code,
    marketValue: fmtMoney(fund.value, { currency: `${fund.currency} ` }),
    dayPnl: fmtMoney(fund.dayPnl, { sign: true }),
    dayPct: '',
    positive: fund.dayPnl >= 0,
    mtd: fmtMoney(fund.mtdPnl, { sign: true }),
    inception: fmtMoney(fund.inceptionPnl, { sign: true }),
    ytd: fmtMoney(fund.ytdPnl, { sign: true }),
  }));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <p className="text-gray-500 text-sm mb-1">Welcome back, <b>{name}</b>!</p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="page-title">Portfolio Summary</h1>
          <span className="self-start sm:self-auto text-xs text-green-600 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
            NAV as of {asOfLabel} · {fmtTime(overview.asOfComputedAt)}
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      {/* Chart + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-6">
          <p className="section-label mb-1">PORTFOLIO VALUE</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {fmtMoney(overview.totalValue, { currency: 'SGD ' })}
              </span>
              <span
                className={`font-medium text-sm whitespace-nowrap ${
                  overview.inceptionPct >= 0 ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {fmtPct(overview.inceptionPct)} since inception
              </span>
            </div>

            <div className="flex gap-1 overflow-x-auto pb-1 max-w-full sm:overflow-visible">
              {FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition shrink-0 ${
                    activeFilter === f
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <PortfolioChart data={filteredChartData} />
        </div>

        {/* Allocation donut */}
        <div className="card p-6 flex flex-col h-full">
          <p className="section-label mb-4">ALLOCATION ACROSS FUNDS</p>
          <div className="flex flex-col items-center flex-1 justify-center">
            <div className="relative w-36 h-36 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                {filteredAllocation.map((fund, i) => {
                  const pct = fund.pctOfPortfolio;
                  const offset = 100 -
                    filteredAllocation.slice(0, i).reduce((sum, f) => sum + f.pctOfPortfolio, 0);
                  return (
                    <circle
                      key={fund.fundId}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                      strokeWidth="4"
                      strokeDasharray={`${pct} ${100 - pct}`}
                      strokeDashoffset={offset}
                    />
                  );
                })}
              </svg>
              <div className="absolute text-center">
                <p className="text-xs text-gray-400">TOTAL</p>
                <p className="text-lg font-bold text-gray-900">
                  {filteredAllocation.length > 0
                    ? `$${Math.round(overview.totalValue / 1000)}K`
                    : '$0'}
                </p>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              {filteredAllocation.map((fund, i) => (
                <div key={fund.fundId} className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${DOT_CLASSES[i % DOT_CLASSES.length]} shrink-0`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">{fund.name}</p>
                      <p className="text-sm text-gray-400">
                        {fmtMoney(fund.value, { currency: `${fund.currency} ` })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {fund.pctOfPortfolio.toFixed(0)}%
                  </span>
                </div>
              ))}
              {filteredAllocation.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No matching asset allocations</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <p className="section-label mb-1">YOUR FUND{overview.allocation.length > 1 ? 'S' : ''}</p>
            <h2 className="text-lg font-bold text-gray-900">Holdings & returns</h2>
          </div>
          <div className="flex gap-3">
            <Link
              href="/documents"
              className="border border-gray-200 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 whitespace-nowrap"
            >
              Download statement
            </Link>
            <Link
              href="/request-transaction"
              className="bg-blue-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-800 whitespace-nowrap"
            >
              Request transaction
            </Link>
          </div>
        </div>
        <HoldingsTable
          data={holdings}
          footer={{
            deposits: `${fmtMoney(overview.grossDeposits)} total deposits`,
            since: `In the fund since ${fmtDate(overview.inceptionDate)}`,
            fees:
              overview.inceptionManagementFee > 0
                ? `${fmtMoney(overview.inceptionManagementFee)} in management fees since inception`
                : null,
          }}
        />
      </div>

      {/* Performance (formerly the standalone /reports page — see CLAUDE.md Done #37) */}
      <PerformanceSection overview={overview} reports={reports} />

      {/* Activity (formerly the standalone /activity page — see CLAUDE.md Done #37) */}
      <ActivitySection items={activity} />
    </div>
  );
}
