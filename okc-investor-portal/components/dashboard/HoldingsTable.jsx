// Real data from dataset 5.4
const holdings = [
  {
    fund: 'OKC XAUUSD Fund',
    tag: 'Gold (XAU/USD) · Active trading strategy',
    marketValue: '$34,061.15',
    dayPnl: '-$1.20',
    dayPct: '-0.00%',
    mtd: '-$9,381.31',
    ytd: '-31.88%',
    inception: '-$15,938.85',
    share: '100%',
    positive: false,
  },
];

const headers = ['FUND', 'MARKET VALUE', 'DAY P&L', 'APR MTD', 'SINCE INCEPTION', 'TOTAL P&L', 'SHARE'];

export default function HoldingsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3 pr-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map((h, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
              <td className="py-4 pr-6">
                <p className="text-sm font-semibold text-gray-900">{h.fund}</p>
                <p className="text-xs text-gray-400 mt-0.5">{h.tag}</p>
              </td>
              <td className="py-4 pr-6 text-sm font-semibold text-gray-900">
                {h.marketValue}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium ${h.positive ? 'text-green-600' : 'text-red-500'}`}>
                <p>{h.dayPnl}</p>
                <p className="text-xs">{h.dayPct}</p>
              </td>
              <td className="py-4 pr-6 text-sm text-red-500 font-medium">
                {h.mtd}
              </td>
              <td className="py-4 pr-6 text-sm text-red-500 font-medium">
                {h.inception}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium ${h.ytd.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                {h.ytd}
              </td>
              <td className="py-4 text-sm text-gray-600">{h.share}</td>
            </tr>
          ))}
        </tbody>
        </table>

      {/* Footer info */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-400">
        <div>
          <span className="font-medium text-gray-600">Initial deposit: </span>
          $50,000.00 · 17 Mar 2026
        </div>
        <div>
          <span className="font-medium text-gray-600">Instrument: </span>
          XAUUSD (Gold / US Dollar)
        </div>
        <div>
          <span className="font-medium text-gray-600">Total trades: </span>
          282 closed positions
        </div>
      </div>
    </div>
  );
}