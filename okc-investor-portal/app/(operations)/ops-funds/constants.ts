// Shared between the create-fund action (validation) and the form (options).

// SGD only, deliberately. The ledger performs no FX conversion — §8.1 sums
// balances as plain numbers — so a fund denominated in another currency would
// be silently added to SGD totals on the ops and admin dashboards, producing a
// meaningless AUM figure. Supporting multiple currencies needs conversion
// (and a rate source) first; until then the form must not offer the choice.
export const FUND_CURRENCIES = ['SGD'] as const

// There is deliberately no fund-level risk level. Per §3.4 risk is specified
// by the INVESTOR, per fund, when they deposit (see lib/riskTolerance.ts) —
// a risk rating declared by the fund was a misreading of that requirement.
