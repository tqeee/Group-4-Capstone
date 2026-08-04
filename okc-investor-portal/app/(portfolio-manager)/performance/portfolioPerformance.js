import { compoundReturn } from '@/lib/finance';
 
export function calculateEndingValue(beginningValue, dailyPnL) {
  return beginningValue + dailyPnL;
}
 
export function calculateDailyReturn(beginningValue, dailyPnL) {
  if (!beginningValue) return 0;
 
  return (dailyPnL / beginningValue) * 100;
}
 
export function calculatePortfolioPerformance(transactions) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      portfolioValue: 0,
      todayPnL: 0,
      totalPnL: 0,
      fundReturn: 0,
      bestDay: null,
      worstDay: null,
      performanceRows: [],
      chartData: [],
    };
  }
 
  const initialCapital = transactions[0].beginningValue;
  let nextBeginningValue = initialCapital;
  let cumulativePnL = 0;
  let netDeposits = 0;
  let netWithdrawals = 0;
  let cumulativeFactor = 1; // running compounded-return factor
 
  const performanceRows = transactions.map((transaction, index) => {
    const beginningValue = index === 0 ? transaction.beginningValue : nextBeginningValue;
    const dailyPnL = transaction.dailyPnL;
    const deposits = transaction.deposits || 0;
    const withdrawals = transaction.withdrawals || 0;
    // Ending value must reflect this same day's deposits/withdrawals too —
    // not just beginning + P&L — otherwise a deposit day shows an
    // artificially low ending value (the deposit only shows up starting
    // the *next* day). Matches lib/ledger.ts's closingValue = opening +
    // pnlShare + flow.
    const endingValue = calculateEndingValue(beginningValue, dailyPnL) + deposits - withdrawals;
    const dailyReturn = calculateDailyReturn(beginningValue, dailyPnL);
 
    cumulativePnL += dailyPnL;
    netDeposits += deposits;
    netWithdrawals += withdrawals;
    nextBeginningValue = endingValue;
 
    // Compound this day's return into the running factor (skip $0-opening
    // days, same guard as compoundReturn above).
    if (beginningValue > 0) cumulativeFactor *= 1 + dailyPnL / beginningValue;
    const cumulativeReturn = (cumulativeFactor - 1) * 100;
 
    return {
      date: transaction.date,
      beginningValue,
      dailyPnL,
      dailyReturn,
      endingValue,
      cumulativePnL,
      cumulativeReturn,
    };
  });
 
  const portfolioValue = initialCapital + cumulativePnL + netDeposits - netWithdrawals;
  const todayPnL = performanceRows[performanceRows.length - 1].dailyPnL;
  const totalPnL = cumulativePnL;
 
  // Fund return, properly compounded (Appendix 8.2 ii) — not a simple
  // (end/start - 1) ratio, which distorts whenever the fund had both up and
  // down days rather than one smooth move.
  const fundReturn =
    compoundReturn(performanceRows.map(row => ({ openingBalance: row.beginningValue, pnl: row.dailyPnL }))) * 100;
 
  const bestDay = performanceRows.reduce((best, row) => (row.dailyPnL > best.dailyPnL ? row : best), performanceRows[0]);
  const worstDay = performanceRows.reduce((worst, row) => (row.dailyPnL < worst.dailyPnL ? row : worst), performanceRows[0]);
  const chartData = performanceRows.map(row => ({
    date: row.date,
    portfolioValue: row.endingValue,
    dailyPnL: row.dailyPnL,
    cumulativePnL: row.cumulativePnL,
    dailyReturn: row.dailyReturn,
    fundReturn: row.cumulativeReturn,
  }));
 
  return {
    portfolioValue,
    todayPnL,
    totalPnL,
    fundReturn,
    bestDay,
    worstDay,
    performanceRows,
    chartData,
  };
}