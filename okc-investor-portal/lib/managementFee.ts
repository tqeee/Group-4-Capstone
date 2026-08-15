import { prisma } from '@/lib/db'

// Fallback used only if the one-time migration seed row is ever missing —
// should not happen in practice (see the management_fee_rate_history
// migration), but keeps rebuildFundLedger from crashing on an empty history.
const DEFAULT_ANNUAL_PCT = 1

export type FeeRatePeriod = { effectiveFrom: Date; annualPct: number }

// Full rate history, oldest first, for lib/ledger.ts to replay against —
// each day's fee uses whichever rate was in effect ON that day, not
// whatever is configured now. See the schema comment on ManagementFeeRate
// for why this can't be a single current value.
export async function getManagementFeeRateHistory(): Promise<FeeRatePeriod[]> {
  const rows = await prisma.managementFeeRate.findMany({ orderBy: { effectiveFrom: 'asc' } })
  return rows.map(r => ({ effectiveFrom: r.effectiveFrom, annualPct: Number(r.annualPct) }))
}

// The rate to show on the admin settings page — the one that governs today.
export async function getCurrentManagementFeeRate(): Promise<number> {
  const latest = await prisma.managementFeeRate.findFirst({ orderBy: { effectiveFrom: 'desc' } })
  return latest ? Number(latest.annualPct) : DEFAULT_ANNUAL_PCT
}

function utcToday(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Starts a new rate period from today. Every day before today keeps
// whatever rate was already recorded for it — this function only ever
// affects today onward, per the industry partner's answer that a rate
// change should not recalculate past periods. Re-setting the rate again
// later today replaces today's not-yet-accrued period rather than stacking
// another one.
export async function setManagementFeeRate(annualPct: number, createdBy: string): Promise<void> {
  const effectiveFrom = utcToday()
  await prisma.managementFeeRate.upsert({
    where: { effectiveFrom },
    update: { annualPct, createdBy },
    create: { effectiveFrom, annualPct, createdBy },
  })
}
