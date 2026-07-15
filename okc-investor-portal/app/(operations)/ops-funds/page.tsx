import { getFundTotals } from '@/lib/queries'
import FundsClient from './FundsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OpsFundsPage() {
  const funds = await getFundTotals()

  return <FundsClient funds={funds} />
}
