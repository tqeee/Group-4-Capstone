'use client';
import { useState } from 'react';

const funds = [
  {
    code: 'GE',
    name: 'OKC Global Equity Opportunities',
    tag: 'Long-only · Developed mkts',
    value: '$819,016',
    dayPnl: '+$3,446',
    dayPct: '+0.42%',
    ytd: '+8.92%',
    inception: '+18.4%',
    share: '63.8%',
    risk: 'High',
    color: 'bg-blue-600',
    positive: true,
  },
  {
    code: 'FI',
    name: 'OKC Investment Grade Fixed Income',
    tag: 'IG credit · Duration 4.2y',
    value: '$320,279',
    dayPnl: '-$256',
    dayPct: '-0.08%',
    ytd: '+3.24%',
    inception: '+9.1%',
    share: '24.9%',
    risk: 'Low',
    color: 'bg-blue-400',
    positive: false,
  },
  {
    code: 'AB',
    name: 'OKC Asia Balanced',
    tag: 'Multi-asset · APAC focus',
    value: '$145,197',
    dayPnl: '+$305',
    dayPct: '+0.21%',
    ytd: '+5.12%',
    inception: '+12.6%',
    share: '11.3%',
    risk: 'Medium',
    color: 'bg-blue-300',
    positive: true,
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
        <p className="text-gray-400 text-sm mt-1">Your current fund allocations and performance.</p>
      </div>

      {/* Fund Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {funds.map((fund, i) => (
          <div
            key={i}
            onClick={() => setSelected(selected === i ? null : i)}
            className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition ${
              selected === i ? 'border-blue-400' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Fund icon + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${fund.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                {fund.code}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 leading-tight">{fund.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{fund.tag}</p>
              </div>
            </div>

            {/* Value */}
            <p className="text-2xl font-bold text-gray-900 mb-1">{fund.value}</p>
            <p className={`text-sm font-medium mb-4 ${fund.positive ? 'text-green-600' : 'text-red-500'}`}>
              {fund.dayPnl} ({fund.dayPct}) today
            </p>

            {/* Stats row */}
            <div className="flex justify-between text-xs text-gray-500 border-t border-gray-100 pt-4">
              <div>
                <p className="text-gray-400 mb-0.5">YTD</p>
                <p className="font-semibold text-green-600">{fund.ytd}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Since inception</p>
                <p className="font-semibold text-green-600">{fund.inception}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Your share</p>
                <p className="font-semibold text-gray-700">{fund.share}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Risk</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${riskStyle[fund.risk]}`}>
                  {fund.risk}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded detail panel — shows when a card is clicked */}
      {selected !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{funds[selected].name}</h2>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Market Value', value: funds[selected].value },
              { label: 'Day P&L', value: `${funds[selected].dayPnl} (${funds[selected].dayPct})` },
              { label: 'Year to Date', value: funds[selected].ytd },
              { label: 'Since Inception', value: funds[selected].inception },
            ].map((item, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}