import { getInvestorsDirectory } from '@/lib/queries'
import InvestorsClient from './InvestorsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function InvestorsPage() {
  const investors = await getInvestorsDirectory()

  return <InvestorsClient investors={investors.filter(i => i.role === 'INVESTOR')} />
}
