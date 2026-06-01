'use client';
import { useState } from 'react';

const funds = [
  {
    code: 'XAU',
    name: 'OKC XAUUSD Fund',
    tag: 'Gold (XAU/USD) · Active trading strategy',
    value: '$34,061.15',
    dayPnl: '-$1.20',
    dayPct: '-0.00%',
    mtd: '-$9,381.31',
    ytd: '-31.88%',
    inception: '-$15,938.85',
    inceptionPct: '-31.88%',
    share: '100%',
    risk: 'High',
    color: 'bg-blue-600',
    positive: false,
  },
];

const riskStyle = {
  High: 'bg-red-50 text-red-500',
  Medium: 'bg-yellow-50 text-yellow-600',
  Low: 'bg-green-50 text-green-600',
};

export default function FundsPage() {
  const [selected, setSelected] = useState(null);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Funds</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your current fund allocations and performance.
        </p>
      </div>

      {/* Fund Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6 max-w-7xl">
        {funds.map((fund, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition ${
              selected === i
                ? 'border-blue-400'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Fund icon + name */}
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 ${fund.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
              >
                {fund.code}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {fund.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{fund.tag}</p>
              </div>
            </div>

            {/* Value */}
            <p className="text-2xl font-bold text-gray-900 mb-1">{fund.value}</p>
            
            {/* Fixed & Styled "today" line */}
            <p className="text-sm mb-4">
              <span className={`font-semibold ${fund.positive ? 'text-green-600' : 'text-red-500'}`}>
                {fund.dayPnl}
              </span>{' '}
              <span className={`${fund.positive ? 'text-green-600' : 'text-red-500'}`}>
                ({fund.dayPct})
              </span>{' '}
              <span className="text-gray-400 font-normal">today</span>
            </p>

            {/* Stats row */}
            <div className="flex justify-between items-start text-xs border-t border-gray-100 pt-4 gap-2">
              <div className="flex flex-col gap-1 min-w-[50px]">
                <p className="text-gray-400 whitespace-nowrap">MTD</p>
                <p className="font-semibold text-red-500">{fund.mtd}</p>
              </div>
              <div className="flex flex-col gap-1 min-w-[90px]">
                <p className="text-gray-400 whitespace-nowrap">Since inception</p>
                <p className="font-semibold text-red-500">{fund.inceptionPct}</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-gray-400 whitespace-nowrap">Your share</p>
                <p className="font-semibold text-gray-700">{fund.share}</p>
              </div>
              <div className="flex flex-col gap-1 items-end">
                <p className="text-gray-400 whitespace-nowrap">Risk</p>
                <span
                  className={`text-xs font-medium w-fit px-2 py-0.5 rounded-full ${riskStyle[fund.risk]}`}
                >
                  {fund.risk}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded detail panel */}
      {selected !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {funds[selected].name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {funds[selected].tag}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Close ✕
            </button>
          </div>

          {/* Detail stat grid */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { 
                label: 'Market Value', 
                value: funds[selected].value, 
                isDayPnl: false, 
                red: false 
              },
              {
                label: 'Day P&L',
                value: funds[selected].dayPnl,
                pct: funds[selected].dayPct,
                isDayPnl: true,
                red: !funds[selected].positive,
              },
              { 
                label: 'April MTD', 
                value: funds[selected].mtd, 
                isDayPnl: false, 
                red: true 
              },
              { 
                label: 'Since Inception', 
                value: funds[selected].inceptionPct, 
                isDayPnl: false, 
                red: true 
              },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                {item.isDayPnl ? (
                  <p className="text-lg font-bold text-gray-900 flex items-baseline gap-1.5">
                    {item.value}
                    <span className={`text-sm font-normal ${item.red ? 'text-red-500' : 'text-green-600'}`}>
                      ({item.pct})
                    </span>
                  </p>
                ) : (
                  <p
                    className={`text-lg font-bold ${
                      item.red ? 'text-red-500' : 'text-gray-900'
                    }`}
                  >
                    {item.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Extra fund info */}
          <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
            {[
              { label: 'Initial Deposit', value: '$50,000.00' },
              { label: 'Inception Date', value: '17 Mar 2026' },
              { label: 'Total Closed Trades', value: '282 positions' },
              { label: 'Total P&L (SGD)', value: '-$15,938.85' },
              { label: 'Instrument', value: 'XAUUSD (Gold / USD)' },
              { label: 'Strategy', value: 'Expert Advisor · Auto trading' },
            ].map((item, i) => (
              <div key={i} className="flex flex-col gap-0.5">
                <p className="text-xs text-gray-400">{item.label}</p>
                <p
                  className={`text-sm font-semibold ${
                    item.value.startsWith('-') ? 'text-red-500' : 'text-gray-900'
                  }`}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}