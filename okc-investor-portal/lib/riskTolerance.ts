// 3.4: the risk tolerance an investor sets per fund — how aggressively that
// fund may invest THEIR money. This is the investor's instruction, not a
// property of the fund (funds no longer carry a risk level of their own).
// Shared by the investor form (options), the submit action (validation) and
// every read surface (labels/colours), so the three can't drift apart.

// Listed high -> low, which is the order the options are rendered in.
// NB: the Postgres enum declares them low -> high (that is the order the
// values were renamed in); enum member order is not display order, so the two
// are deliberately independent.
export const RISK_TOLERANCES = ['HIGH', 'MODERATE', 'LOW'] as const
export type RiskToleranceValue = (typeof RISK_TOLERANCES)[number]

export const DEFAULT_RISK_TOLERANCE: RiskToleranceValue = 'MODERATE'

export const RISK_TOLERANCE_LABEL: Record<RiskToleranceValue, string> = {
  HIGH: 'High',
  MODERATE: 'Moderate',
  LOW: 'Low',
}

// Shown under each option so the choice means something to the investor
// rather than being three unexplained words.
export const RISK_TOLERANCE_DESCRIPTION: Record<RiskToleranceValue, string> = {
  HIGH: 'Pursue higher returns and accept larger swings in value.',
  MODERATE: 'A middle course between protecting capital and pursuing returns.',
  LOW: 'Prioritise protecting your capital. Smaller positions, tighter limits.',
}

// Traffic-light colour coding: red = high risk, amber = moderate, green = low.
export const RISK_TOLERANCE_STYLE: Record<RiskToleranceValue, string> = {
  HIGH: 'bg-red-50 text-red-600',
  MODERATE: 'bg-amber-50 text-amber-600',
  LOW: 'bg-green-50 text-green-600',
}

export function isRiskTolerance(value: unknown): value is RiskToleranceValue {
  return typeof value === 'string' && RISK_TOLERANCES.includes(value as RiskToleranceValue)
}

export function riskToleranceLabel(value: string | null | undefined): string {
  return isRiskTolerance(value) ? RISK_TOLERANCE_LABEL[value] : '—'
}
