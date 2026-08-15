// Pure, dependency-free financial calculations shared by both server code
// (lib/ledger.ts, lib/queries.ts) and client components (portfolioPerformance.js).
// This file must never import anything server-only (like Prisma) — that's
// the whole point of pulling it out on its own, so client components can
// import it directly instead of duplicating the formula.
 
// Section 8.2 (ii): fund return = daily % returns compounded over the period,
// where daily % return = daily PNL / total assets at beginning of day.
export function compoundReturn(
  days: { openingBalance: number; pnl: number }[]
): number {
  let factor = 1
  for (const day of days) {
    if (day.openingBalance > 0) factor *= 1 + day.pnl / day.openingBalance
  }
  return factor - 1
}