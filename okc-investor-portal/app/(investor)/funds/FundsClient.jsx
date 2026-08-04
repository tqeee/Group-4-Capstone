'use client';
import { useState } from 'react';
import Link from 'next/link';
import { fmtDate, fmtMoney } from '@/lib/format';
import { RISK_TOLERANCE_STYLE, riskToleranceLabel } from '@/lib/riskTolerance';

// What's on offer. Deliberately minimal — name and strategy only — so an
// investor comparing funds isn't shown other people's money. Funds carry no
// risk rating of their own: risk is the investor's own instruction, chosen
// per fund on the deposit form (§3.4).
function AvailableFunds({ funds, heading, subheading }) {
  if (funds.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-gray-900">{heading}</h2>
        {subheading && <p className="text-sm text-gray-400 mt-0.5">{subheading}</p>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
        {funds.map(fund => (
          <div key={fund.id} className="card p-5 flex flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900 leading-snug">{fund.name}</p>
              {fund.strategy && (
                <p className="text-xs text-gray-400 mt-1.5">{fund.strategy}</p>
              )}
            </div>
            <Link
              href={`/request-transaction?fundId=${fund.id}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Deposit
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

// No `= []` defaults on the props: this is a .jsx file, so TypeScript infers
// the prop types from the parameter list, and an empty-array default is
// inferred as never[] — which then rejects the real data from page.tsx.
export default function FundsClient({ funds, availableFunds, riskByFund, grossDeposits, inceptionDate, asOf }) {
  const [selected, setSelected] = useState(null);

  const held = funds ?? [];
  const available = availableFunds ?? [];
  const risk = riskByFund ?? {};
  const heldIds = new Set(held.map(f => f.fundId));
  const notHeld = available.filter(f => !heldIds.has(f.id));

  // No holdings yet — this is the investor's starting point, so lead with what
  // they can actually do rather than an empty state.
  if (held.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="page-title">Funds</h1>
          <p className="page-subtitle">Choose a fund to make your first deposit.</p>
        </div>
        <AvailableFunds
          funds={available}
          heading="Available funds"
          subheading="Your holdings appear here once your first deposit is processed."
        />
        {available.length === 0 && (
          <div className="card p-12 text-center text-sm text-gray-400">
            No funds are open for investment at the moment.
          </div>
        )}
      </div>
    );
  }

  const current = selected !== null ? held[selected] : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Funds</h1>
        <p className="page-subtitle">
          Your current fund allocations and performance{asOf ? ` · NAV as of ${fmtDate(asOf)}` : ''}.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Your funds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
          {held.map((fund, i) => (
            <div
              key={fund.fundId}
              onClick={() => setSelected(selected === i ? null : i)}
              className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition ${
                selected === i ? 'border-blue-400' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {fund.code}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{fund.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fund.strategy}</p>
                </div>
              </div>

              <p className="text-2xl font-bold text-gray-900 mb-1">{fmtMoney(fund.value)}</p>

              <p className="text-sm mb-4">
                <span className={`font-semibold ${fund.dayPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtMoney(fund.dayPnl, { sign: true })}
                </span>{' '}
                <span className="text-gray-400 font-normal">today</span>
              </p>

              <div className="flex justify-between items-start text-xs border-t border-gray-100 pt-4 gap-2">
                <div className="flex flex-col gap-1 min-w-[50px]">
                  <p className="text-gray-400 whitespace-nowrap">MTD</p>
                  <p className={`font-semibold ${fund.mtdPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtMoney(fund.mtdPnl, { sign: true })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 min-w-[90px]">
                  <p className="text-gray-400 whitespace-nowrap">Since inception</p>
                  <p className={`font-semibold ${fund.inceptionPnl >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtMoney(fund.inceptionPnl, { sign: true })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <p className="text-gray-400 whitespace-nowrap">Your tolerance</p>
                  <span
                    className={`text-xs font-medium w-fit px-2 py-0.5 rounded-full ${
                      RISK_TOLERANCE_STYLE[risk[fund.fundId]] ?? 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {riskToleranceLabel(risk[fund.fundId])}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {current && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{current.name}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{current.strategy}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-sm">
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Market Value', value: fmtMoney(current.value), red: false },
              { label: 'Day P&L', value: fmtMoney(current.dayPnl, { sign: true }), red: current.dayPnl < 0 },
              { label: 'MTD', value: fmtMoney(current.mtdPnl, { sign: true }), red: current.mtdPnl < 0 },
              { label: 'Since Inception', value: fmtMoney(current.inceptionPnl, { sign: true }), red: current.inceptionPnl < 0 },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className={`text-lg font-bold ${item.red ? 'text-red-500' : 'text-gray-900'}`}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            {[
              { label: 'Total Deposits', value: fmtMoney(grossDeposits) },
              { label: 'In the fund since', value: fmtDate(inceptionDate) },
              { label: 'Currency', value: current.currency },
              { label: 'Strategy', value: current.strategy ?? '—' },
              { label: 'Your risk tolerance', value: riskToleranceLabel(risk[current.fundId]) },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p className={`text-sm font-semibold ${String(item.value).startsWith('-') ? 'text-red-500' : 'text-gray-900'}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <AvailableFunds
        funds={notHeld}
        heading="Other funds available"
        subheading="Funds you haven't invested in yet."
      />
    </div>
  );
}
