import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth, getInvestorOverview } from '@/lib/queries'
import FundsClient from './FundsClient'

export default async function FundsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null
  const overview = investor ? await getInvestorOverview(investor.id) : null

  return (
    <FundsClient
      funds={overview?.allocation ?? []}
      grossDeposits={overview?.grossDeposits ?? 0}
      inceptionDate={overview?.inceptionDate ?? null}
      asOf={overview?.asOf ?? null}
    />
  )
}
