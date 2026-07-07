import { createClient } from '@/lib/supabase/server'
import { getInvestorByAuth, getInvestorActivity } from '@/lib/queries'
import ActivityClient from './ActivityClient'

export default async function ActivityPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null
  const items = investor ? await getInvestorActivity(investor.id) : []

  return <ActivityClient items={items} />
}
