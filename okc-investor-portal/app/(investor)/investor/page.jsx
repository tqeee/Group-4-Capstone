import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getInvestorByAuth, getInvestorOverview } from '@/lib/queries';
import InvestorDashboard from './InvestorDashboard';

// The dashboard reads the URL search query via useSearchParams (a client-only
// hook), so the client part renders inside Suspense.
export default async function InvestorPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null;
  const overview = investor ? await getInvestorOverview(investor.id) : null;

  return (
    <Suspense>
      <InvestorDashboard
        name={investor?.name ?? claims?.email ?? 'there'}
        overview={overview}
      />
    </Suspense>
  );
}
