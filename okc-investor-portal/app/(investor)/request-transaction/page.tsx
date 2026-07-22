import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getInvestorByAuth, getInvestorFlows } from '@/lib/queries'
import { getFundLabels } from '@/lib/fundLabels'
import { getSettings } from '@/lib/settings'
import RequestTransactionClient from './RequestTransactionClient'

export default async function RequestTransactionPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null

  const [flows, rawFunds, labels, settings] = await Promise.all([
    investor ? getInvestorFlows(investor.id) : Promise.resolve([]),
    prisma.fund.findMany({ select: { id: true, name: true, currency: true } }),
    getFundLabels(),
    getSettings(),
  ])
  const funds = rawFunds.map(f => ({
    id: f.id,
    name: labels.get(f.id)?.name ?? 'Fund',
    currency: f.currency,
  }))

  return (
    <RequestTransactionClient
      requests={flows}
      funds={funds}
      minDeposit={Number(settings.minDeposit)}
      minWithdrawal={Number(settings.minWithdrawal)}
    />
  )
}
