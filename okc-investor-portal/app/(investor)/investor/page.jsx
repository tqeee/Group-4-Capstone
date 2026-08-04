import { createClient } from '@/lib/supabase/server';
import {
  getAvailableFunds,
  getInvestorActivity,
  getInvestorByAuth,
  getInvestorOverview,
  getInvestorReports,
} from '@/lib/queries';
import InvestorDashboard from './InvestorDashboard';

// Reads live portal data on every request. Fetches everything the dashboard
// needs, including what used to be the separate /reports and /activity
// pages — see CLAUDE.md Done #37 for why they were folded in here.
export const dynamic = 'force-dynamic';

export default async function InvestorPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const investor = claims?.sub
    ? await getInvestorByAuth(claims.sub, claims.email ?? null)
    : null;
  const [overview, availableFunds, reports, activity] = await Promise.all([
    investor ? getInvestorOverview(investor.id) : null,
    getAvailableFunds(),
    investor ? getInvestorReports(investor.id) : null,
    investor ? getInvestorActivity(investor.id) : [],
  ]);

  return (
    <InvestorDashboard
      name={investor?.name ?? 'Investor'}
      overview={overview}
      availableFunds={availableFunds}
      reports={reports}
      activity={activity}
    />
  );
}
