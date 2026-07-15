import { getFlowsForReview } from '@/lib/queries'
import { getSettings } from '@/lib/settings'
import OpsTransactionsClient from './OpsTransactionsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OpsTransactionsPage() {
  const [flows, settings] = await Promise.all([getFlowsForReview(), getSettings()])

  return (
    <OpsTransactionsClient
      flows={flows}
      largeThreshold={Number(settings.largeTransactionThreshold)}
    />
  )
}
