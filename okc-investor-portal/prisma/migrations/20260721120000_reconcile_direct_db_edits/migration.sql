-- Reconciliation migration.
--
-- A teammate made these schema changes DIRECTLY on the shared Supabase project
-- (via the dashboard / SQL editor, without a Prisma migration), so the live DB
-- drifted from the migration history. This migration captures those changes so
-- that:
--   (a) the migration history matches reality and `prisma migrate dev` no longer
--       detects drift (which would otherwise offer to RESET / wipe the DB), and
--   (b) a fresh database rebuilt from migrations reaches the same final state.
--
-- On the shared project this migration is recorded as ALREADY APPLIED via
--   `prisma migrate resolve --applied 20260721120000_reconcile_direct_db_edits`
-- so it never executes there. The statements are written as RENAMEs (rather than
-- Prisma's default drop+create) so that they (i) reproduce the live DB exactly,
-- including the original `deals_*` constraint/index names, and (ii) preserve data
-- if ever replayed onto a populated database. (The `flows` column drop below is
-- inherently destructive, but on a fresh rebuild migrations run before seeding,
-- so no data is lost.)

-- 5.4 broker deals: table renamed `deals` -> `investment_transactions`.
-- RENAME keeps the rows and the existing deals_pkey / deals_fundId_time_idx /
-- deals_fundId_fkey / deals_batchId_fkey names, matching the live shared DB.
ALTER TABLE "deals" RENAME TO "investment_transactions";

-- Section 8.1 per-investor daily ledger: `pnlShare` renamed to `pnl`, and the
-- per-day `flows` column removed.
ALTER TABLE "investor_daily_ledger" RENAME COLUMN "pnlShare" TO "pnl";
ALTER TABLE "investor_daily_ledger" DROP COLUMN "flows";

-- Section 8.2 / 3.5 analytics columns added to the fund-level daily record
-- (both nullable, matching the live column types: unconstrained numeric / int).
ALTER TABLE "fund_daily_nav"
  ADD COLUMN "daily_return_pct" numeric,
  ADD COLUMN "trade_count" integer;
