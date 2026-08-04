-- Management fee is split into a rate HISTORY (this migration) rather than a
-- single current value in portal_settings, and its dollar amount is now
-- persisted as its own column instead of only being netted invisibly into
-- pnl. Both changes were requested by the industry partner: a fee-rate
-- change must apply going forward only (rebuildFundLedger replays a fund's
-- entire history on every deposit/withdrawal/import, so a single current
-- rate would restate every past day), and investors should be able to see
-- the fee as an explicit line item separate from trading P&L.

-- CreateTable
CREATE TABLE "management_fee_rates" (
    "id" TEXT NOT NULL,
    "annualPct" DECIMAL(6,3) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "management_fee_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "management_fee_rates_effectiveFrom_key" ON "management_fee_rates"("effectiveFrom");

ALTER TABLE "public"."management_fee_rates" ENABLE ROW LEVEL SECURITY;

-- AlterTable: fee amount as its own column, alongside the existing pnl
-- (which continues to already have the fee netted into it, so
-- closingBalance = openingBalance + pnl + netFlows is unchanged).
ALTER TABLE "fund_daily_nav" ADD COLUMN "managementFee" DECIMAL(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "investor_daily_ledger" ADD COLUMN "managementFee" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Seed one history row from whatever rate is configured today (falling back
-- to 1% if the setting was never touched), effective from an early-enough
-- date to cover every fund's existing history. This is deliberately a
-- continuity seed, not a policy decision: it preserves today's already-
-- computed numbers under the old flat-rate design for one last rebuild,
-- and every rate change an admin makes AFTER this migration is what actually
-- gets the new going-forward-only behaviour.
INSERT INTO "management_fee_rates" ("id", "annualPct", "effectiveFrom", "createdBy")
SELECT
    'seed-initial-fee-rate',
    COALESCE((SELECT "value" FROM "portal_settings" WHERE "key" = 'managementFee')::numeric, 1),
    DATE '2000-01-01',
    'migration'
ON CONFLICT ("effectiveFrom") DO NOTHING;
