import { listAccountsForOperations } from './actions'
import InvestorsClient from './InvestorsClient'
 
// Reads live portal data on every request.
export const dynamic = 'force-dynamic'
 
export default async function InvestorsPage() {
  const result = await listAccountsForOperations()
 
  return <InvestorsClient accounts={result.accounts ?? []} loadError={result.error ?? null} />
}