import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getInvestorByAuth, getInvestorFlows } from '@/lib/queries'
import { getSettings } from '@/lib/settings'
import RequestTransactionClient from './RequestTransactionClient'

export default async function RequestTransactionPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null

  const [flows, funds, settings, preferences] = await Promise.all([
    investor ? getInvestorFlows(investor.id) : Promise.resolve([]),
    prisma.fund.findMany({
      select: { id: true, name: true, currency: true },
      orderBy: [{ inceptionDate: 'asc' }, { code: 'asc' }],
    }),
    getSettings(),
    investor
      ? prisma.investorFundPreference.findMany({
          where: { investorId: investor.id },
          select: { fundId: true, riskTolerance: true },
        })
      : Promise.resolve([]),
  ])

  // fundId -> the investor's standing tolerance, so the form can prefill it.
  const riskByFund = Object.fromEntries(preferences.map(p => [p.fundId, p.riskTolerance]))

  return (
    <RequestTransactionClient
      requests={flows}
      funds={funds}
      riskByFund={riskByFund}
      minDeposit={Number(settings.minDeposit)}
      minWithdrawal={Number(settings.minWithdrawal)}
    />
  )
}
