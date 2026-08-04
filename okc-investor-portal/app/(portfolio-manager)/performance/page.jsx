import { getFundTotals, getFundDailySeries } from '@/lib/queries';
import PerformanceClient from './PerformanceClient';

// Reads live portal data on every request.
export const dynamic = 'force-dynamic';

export default async function PerformancePage() {
  const funds = await getFundTotals();

  const seriesEntries = await Promise.all(
    funds.map(async fund => [fund.id, await getFundDailySeries(fund.id)])
  );
  const seriesByFund = Object.fromEntries(seriesEntries);

  return <PerformanceClient funds={funds} seriesByFund={seriesByFund} />;
}
