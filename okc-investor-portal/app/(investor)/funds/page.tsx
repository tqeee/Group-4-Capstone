import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { getAvailableFunds, getInvestorByAuth, getInvestorOverview } from '@/lib/queries'
import FundsClient from './FundsClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function FundsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null
  const [overview, availableFunds, preferences] = await Promise.all([
    investor ? getInvestorOverview(investor.id) : null,
    getAvailableFunds(),
    investor
      ? prisma.investorFundPreference.findMany({
          where: { investorId: investor.id },
          select: { fundId: true, riskTolerance: true },
        })
      : Promise.resolve([]),
  ])

  // 3.4: fundId -> the investor's standing tolerance for that fund.
  const riskByFund = Object.fromEntries(preferences.map(p => [p.fundId, p.riskTolerance]))

  return (
    <FundsClient
      funds={overview?.allocation ?? []}
      availableFunds={availableFunds}
      riskByFund={riskByFund}
      grossDeposits={overview?.grossDeposits ?? 0}
      inceptionDate={overview?.inceptionDate ?? null}
      asOf={overview?.asOf ?? null}
    />
  )
}
