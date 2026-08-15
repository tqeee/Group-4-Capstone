import { createClient } from '@/lib/supabase/server';
import { getFundTotals, getFundDailySeries, getFlowsForReview, getInvestorByAuth } from '@/lib/queries';
import { fmtDate, fmtTime } from '@/lib/format';
import PortfolioManagerDashboardClient from './PortfolioManagerDashboardClient';
 
// Reads live portal data on every request.
export const dynamic = 'force-dynamic';
 
export default async function PortfolioManagerDashboardPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const profile = claims?.sub ? await getInvestorByAuth(claims.sub, claims.email ?? null) : null;
 
  const [funds, flows] = await Promise.all([
    getFundTotals(),
    getFlowsForReview(),
  ]);
 
  const seriesEntries = await Promise.all(
    funds.map(async fund => [fund.id, await getFundDailySeries(fund.id)])
  );
  const seriesByFund = Object.fromEntries(seriesEntries);
 
  const isPending = f => f.status === 'Pending Transaction' || f.status === 'Pending Receipt';

  const pendingActions = [
    {
      label: 'Deposit Requests Pending',
      count: flows.filter(f => isPending(f) && f.type === 'Deposit').length,
    },
    {
      label: 'Withdrawal Requests Pending',
      count: flows.filter(f => isPending(f) && f.type === 'Withdrawal').length,
    },
  ];
 
  // Fund-relevant activity (deposits/withdrawals being requested or
  // processed) rather than system-wide login/logout/password-reset events —
  // those belong on Admin's Audit Logs page, not a fund overview a PM uses
  // day to day.
  const recentActivity = [...flows]
    .map(f => ({ ...f, eventDate: f.processedDate ?? f.requestDate }))
    .sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate))
    .slice(0, 5)
    .map(f => ({
      label: `${f.investorName} — ${f.type} ${f.status.toLowerCase()}`,
      time: `${fmtDate(f.eventDate)} · ${fmtTime(f.eventDate)}`,
    }));
 
  return (
    <PortfolioManagerDashboardClient
      name={profile?.name ?? 'Portfolio Manager'}
      funds={funds}
      seriesByFund={seriesByFund}
      pendingActions={pendingActions}
      recentActivity={recentActivity}
    />
  );
}