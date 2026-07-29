import { getFundTotals, getFundDailySeries, getFlowsForReview, getAuditLogs } from '@/lib/queries';
import { fmtDate, fmtTime } from '@/lib/format';
import PortfolioManagerDashboardClient from './PortfolioManagerDashboardClient';

// Reads live portal data on every request.
export const dynamic = 'force-dynamic';

export default async function PortfolioManagerDashboardPage() {
  const [funds, flows, logs] = await Promise.all([
    getFundTotals(),
    getFlowsForReview(),
    getAuditLogs(8),
  ]);

  const seriesEntries = await Promise.all(
    funds.map(async fund => [fund.id, await getFundDailySeries(fund.id)])
  );
  const seriesByFund = Object.fromEntries(seriesEntries);

  const pendingActions = [
    {
      label: 'Deposit Requests Pending',
      count: flows.filter(f => f.status === 'Pending' && f.type === 'Deposit').length,
    },
    {
      label: 'Withdrawal Requests Pending',
      count: flows.filter(f => f.status === 'Pending' && f.type === 'Withdrawal').length,
    },
  ];

  const recentActivity = logs.slice(0, 5).map(l => ({
    label: l.detail ? `${l.action}: ${l.detail}` : l.action,
    time: `${fmtDate(l.createdAt)} · ${fmtTime(l.createdAt)}`,
  }));

  return (
    <PortfolioManagerDashboardClient
      funds={funds}
      seriesByFund={seriesByFund}
      pendingActions={pendingActions}
      recentActivity={recentActivity}
    />
  );
}
