import { getFundTotals, getFundDailySeries } from '@/lib/queries'
import FundsClient from './FundsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OpsFundsPage() {
  const funds = await getFundTotals()

  // Daily series per fund powers the performance chart in the fund detail
  // modal. Loaded up front (same as the Portfolio Manager performance page)
  // so opening a fund is instant and needs no client fetch.
  const seriesEntries = await Promise.all(
    funds.map(async fund => [fund.id, await getFundDailySeries(fund.id)] as const)
  )
  const seriesByFund = Object.fromEntries(seriesEntries)

  return <FundsClient funds={funds} seriesByFund={seriesByFund} />
}
