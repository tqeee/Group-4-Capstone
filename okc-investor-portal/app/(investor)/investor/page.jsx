import { createClient } from '@/lib/supabase/server';
import { getAvailableFunds, getInvestorByAuth, getInvestorOverview } from '@/lib/queries';
import InvestorDashboard from './InvestorDashboard';

// Reads live portal data on every request.
export const dynamic = 'force-dynamic';

export default async function InvestorPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null;
  const [overview, availableFunds] = await Promise.all([
    investor ? getInvestorOverview(investor.id) : null,
    getAvailableFunds(),
  ]);

  return (
    <InvestorDashboard
      name={investor?.name ?? 'Investor'}
      overview={overview}
      availableFunds={availableFunds}
    />
  );
}
