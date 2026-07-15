import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth, getInvestorOverview, getInvestorReports } from '@/lib/queries'
import ReportsClient from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null
  const [overview, reports] = investor
    ? await Promise.all([getInvestorOverview(investor.id), getInvestorReports(investor.id)])
    : [null, null]

  return <ReportsClient overview={overview} reports={reports} />
}
