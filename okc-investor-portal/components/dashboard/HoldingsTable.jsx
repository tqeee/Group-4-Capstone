const holdings = [
  {
    fund: 'OKC Global Equity Opportunities',
    tag: 'Long-only · Developed mkts',
    marketValue: '$819,016',
    dayPnl: '+$3,446',
    dayPct: '+0.42%',
    mtd: '+1.2%',
    ytd: '+8.92%',
    inception: '+18.4%',
    share: '63.8%',
    positive: true,
  },
  {
    fund: 'OKC Investment Grade Fixed Income',
    tag: 'IG credit · Duration 4.2y',
    marketValue: '$320,279',
    dayPnl: '-$256',
    dayPct: '-0.08%',
    mtd: '+0.3%',
    ytd: '+3.24%',
    inception: '+9.1%',
    share: '24.9%',
    positive: false,
  },
  {
    fund: 'OKC Asia Balanced',
    tag: 'Multi-asset · APAC focus',
    marketValue: '$145,197',
    dayPnl: '+$305',
    dayPct: '+0.21%',
    mtd: '+0.8%',
    ytd: '+5.12%',
    inception: '+12.6%',
    share: '11.3%',
    positive: true,
  },
];

const headers = ['FUND', 'MARKET VALUE', 'DAY P&L', 'MTD', 'YTD', 'SINCE INCEPTION', 'SHARE'];

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
              <td className="py-4 pr-6 text-sm font-semibold text-gray-900">{h.marketValue}</td>
              <td className={`py-4 pr-6 text-sm font-medium ${h.positive ? 'text-green-600' : 'text-red-500'}`}>
                <p>{h.dayPnl}</p>
                <p className="text-xs">{h.dayPct}</p>
              </td>
              <td className="py-4 pr-6 text-sm text-gray-600">{h.mtd}</td>
              <td className={`py-4 pr-6 text-sm font-medium ${h.ytd.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                {h.ytd}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium ${h.inception.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                {h.inception}
              </td>
              <td className="py-4 text-sm text-gray-600">{h.share}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}