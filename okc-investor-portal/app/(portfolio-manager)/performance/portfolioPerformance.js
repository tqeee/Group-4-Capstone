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

  const performanceRows = transactions.map((transaction, index) => {
    const beginningValue = index === 0 ? transaction.beginningValue : nextBeginningValue;
    const dailyPnL = transaction.dailyPnL;
    const deposits = transaction.deposits || 0;
    const withdrawals = transaction.withdrawals || 0;
    const endingValue = calculateEndingValue(beginningValue, dailyPnL);
    const dailyReturn = calculateDailyReturn(beginningValue, dailyPnL);

    cumulativePnL += dailyPnL;
    netDeposits += deposits;
    netWithdrawals += withdrawals;
    nextBeginningValue = endingValue + deposits - withdrawals;

    return {
      date: transaction.date,
      beginningValue,
      dailyPnL,
      dailyReturn,
      endingValue,
      cumulativePnL,
      cumulativeReturn: calculateDailyReturn(initialCapital, cumulativePnL),
    };
  });

  const portfolioValue = initialCapital + cumulativePnL + netDeposits - netWithdrawals;
  const todayPnL = performanceRows[performanceRows.length - 1].dailyPnL;
  const totalPnL = cumulativePnL;
  const fundReturn = ((portfolioValue / initialCapital) - 1) * 100;
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
    todayPnL,
    totalPnL,
    fundReturn,
    bestDay,
    worstDay,
    performanceRows,
    chartData,
  };
}