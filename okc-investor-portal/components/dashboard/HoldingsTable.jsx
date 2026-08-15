const headers = ['FUND', 'MARKET VALUE', 'DAY P&L', 'MTD', 'SINCE INCEPTION', 'YTD', 'FUND SHARE'];

export default function HoldingsTable({ data = [], footer = null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {headers.map(h => (
              <th key={h} className="text-left text-xs text-gray-400 font-medium pb-3 pr-6 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((h, i) => (
            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
              <td className="py-4 pr-6">
                <p className="text-sm font-semibold text-gray-900">{h.fund}</p>
                <p className="text-xs text-gray-400 mt-0.5">{h.tag}</p>
              </td>
              <td className="py-4 pr-6 text-sm font-semibold text-gray-900 whitespace-nowrap">
                {h.marketValue}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium whitespace-nowrap ${h.positive ? 'text-green-600' : 'text-red-500'}`}>
                <p>{h.dayPnl}</p>
                {h.dayPct && <p className="text-xs">{h.dayPct}</p>}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium whitespace-nowrap ${h.mtd.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>
                {h.mtd}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium whitespace-nowrap ${h.inception.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>
                {h.inception}
              </td>
              <td className={`py-4 pr-6 text-sm font-medium whitespace-nowrap ${h.ytd.startsWith('-') ? 'text-red-500' : 'text-green-600'}`}>
                {h.ytd}
              </td>
              <td className="py-4 text-sm text-gray-600 whitespace-nowrap">{h.share}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">No matching holdings.</div>
      )}

      {footer && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-400">
          <div>
            <span className="font-medium text-gray-600">Deposits: </span>
            {footer.deposits}
          </div>
          <div>{footer.since}</div>
          {footer.fees && <div>{footer.fees}</div>}
        </div>
      )}
    </div>
  );
}
