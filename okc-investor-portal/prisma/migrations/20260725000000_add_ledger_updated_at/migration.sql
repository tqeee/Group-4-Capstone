-- Adds a real "last computed at" timestamp to the two ledger tables, replacing
-- the hardcoded "19:00 SGT" placeholder previously shown in the UI.
--
-- DEFAULT CURRENT_TIMESTAMP satisfies existing rows and the NOT NULL
-- constraint immediately; Prisma's @updatedAt then manages the value from the
-- client on every future create/update (rebuildFundLedger deletes and
-- recreates these rows on every rebuild, so existing values here are
-- immediately superseded on the next rebuild of any fund).
ALTER TABLE "fund_daily_nav" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "investor_daily_ledger" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
