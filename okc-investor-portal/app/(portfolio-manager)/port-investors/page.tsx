import { listInvestorsForPortfolioManager } from './actions'
import PortInvestorsClient from './PortInvestorsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function PortfolioManagerInvestorsPage() {
  const result = await listInvestorsForPortfolioManager()

  return <PortInvestorsClient investors={result.investors ?? []} loadError={result.error ?? null} />
}
