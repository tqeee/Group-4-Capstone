// Performance maths for the portfolio manager views (§3.5), driven by the
// fund's daily NAV series. The return figures follow §8.2 (ii): the daily %
// return is daily P&L / total assets at the beginning of the day, and a
// period's return is those daily returns compounded.
//
// This deliberately does NOT measure return as (ending value / starting value)
// - 1. Deposits and withdrawals change the ending value without the fund
// having earned anything, so that formula reports a fund which took a $500k
// deposit on a $100k base and made zero P&L as up 500%. Compounding the daily
// returns strips the timing of investor capital out, which is the whole point
// of the metric — and it is what lib/ledger.ts `compoundReturn` already does
// for the investor-facing pages, so the two agree.

export function calculateEndingValue(beginningValue, dailyPnL) {
  return beginningValue + dailyPnL;
}

export function calculateDailyReturn(beginningValue, dailyPnL) {
  // A day the fund opened with nothing (or negative, after a loss deeper than
  // its capital) has no meaningful base to measure against — 0 rather than a
  // divide-by-zero or a sign-flipped percentage.
  if (!(beginningValue > 0)) return 0;

  return (dailyPnL / beginningValue) * 100;
}

// Compounds a list of daily % returns into a single period % return.
export function compoundDailyReturns(dailyReturns) {
  return (dailyReturns.reduce((factor, r) => factor * (1 + r / 100), 1) - 1) * 100;
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
  let cumulativePnL = 0;
  let netDeposits = 0;
  let netWithdrawals = 0;
  // Running compounded factor, so each row can report the period-to-date
  // return without rescanning everything before it.
  let cumulativeFactor = 1;

  const performanceRows = transactions.map(transaction => {
    // The ledger guarantees each day opens exactly where the previous one
    // closed, so the stored beginning value is authoritative — no need to
    // re-derive it and risk drifting away from the persisted NAV.
    const beginningValue = transaction.beginningValue;
    const dailyPnL = transaction.dailyPnL;
    const deposits = transaction.deposits || 0;
    const withdrawals = transaction.withdrawals || 0;
    const endingValue = calculateEndingValue(beginningValue, dailyPnL);
    const dailyReturn = calculateDailyReturn(beginningValue, dailyPnL);

    cumulativePnL += dailyPnL;
    netDeposits += deposits;
    netWithdrawals += withdrawals;
    cumulativeFactor *= 1 + dailyReturn / 100;

    return {
      date: transaction.date,
      beginningValue,
      dailyPnL,
      dailyReturn,
      endingValue,
      cumulativePnL,
      cumulativeReturn: (cumulativeFactor - 1) * 100,
    };
  });

  const lastTransaction = transactions[transactions.length - 1];
  const portfolioValue =
    calculateEndingValue(lastTransaction.beginningValue, lastTransaction.dailyPnL) +
    (lastTransaction.deposits || 0) -
    (lastTransaction.withdrawals || 0);
  const todayPnL = performanceRows[performanceRows.length - 1].dailyPnL;
  const totalPnL = cumulativePnL;
  const fundReturn = performanceRows[performanceRows.length - 1].cumulativeReturn;
  const bestDay = performanceRows.reduce((best, row) => (row.dailyPnL > best.dailyPnL ? row : best), performanceRows[0]);
  const worstDay = performanceRows.reduce((worst, row) => (row.dailyPnL < worst.dailyPnL ? row : worst), performanceRows[0]);
  const chartData = performanceRows.map(row => ({
    date: row.date,
    portfolioValue: row.endingValue,
    dailyPnL: row.dailyPnL,
    cumulativePnL: row.cumulativePnL,
    dailyReturn: row.dailyReturn,
  }));

  return {
    portfolioValue,
    initialCapital,
    netContributions: netDeposits - netWithdrawals,
    todayPnL,
    totalPnL,
    fundReturn,
    bestDay,
    worstDay,
    performanceRows,
    chartData,
  };
}
