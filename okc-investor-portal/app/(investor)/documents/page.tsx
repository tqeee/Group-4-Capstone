import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth, getStatementMonths } from '@/lib/queries'
import { fmtMonth } from '@/lib/format'

// Monthly account statements generated live from the investor's daily ledger.
export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null
  const months = investor ? await getStatementMonths(investor.id) : []

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-title">Documents</h1>
        <p className="page-subtitle">
          Monthly account statements generated from your daily ledger.
        </p>
      </div>

      <p className="section-label uppercase mb-3">Monthly Statements</p>

      {months.length === 0 ? (
        <div className="card p-12 text-center text-sm text-gray-400">
          No statements yet — your first statement is generated after the fund&apos;s first
          trading day.
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {months.map(monthIso => {
            const month = monthIso.slice(0, 7) // YYYY-MM
            return (
              <div
                key={month}
                className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition gap-4"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {fmtMonth(monthIso)} — Account Statement
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Daily P&L, deposits/withdrawals, closing values and fund share for{' '}
                      {fmtMonth(monthIso)}.
                    </p>
                    <p className="text-xs font-medium text-gray-400 mt-1">CSV · generated on demand</p>
                  </div>
                </div>

                <a
                  href={`/api/statements/${month}`}
                  download
                  className="flex items-center justify-center gap-2 text-sm px-4 py-2 rounded-lg transition w-full sm:w-auto flex-shrink-0 border border-gray-200 text-gray-600 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span className="whitespace-nowrap">Download</span>
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
