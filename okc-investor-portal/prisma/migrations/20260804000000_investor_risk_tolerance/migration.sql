-- 3.4: per-investor, per-fund risk tolerance.
--
-- The investor states how aggressively a fund may invest THEIR money. It is a
-- standing instruction for that (investor, fund) pair — someone who tops up
-- twice keeps one tolerance for the fund — so it gets its own table rather
-- than living on a single request. fund_flows also carries a nullable snapshot
-- of what was chosen on each request, so operations reviewing a deposit see
-- what the investor asked for at the time even if they change it later.

CREATE TYPE "RiskTolerance" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE');

CREATE TABLE "investor_fund_preferences" (
    "id" TEXT NOT NULL,
    "investorId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "riskTolerance" "RiskTolerance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "investor_fund_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investor_fund_preferences_investorId_fundId_key"
    ON "investor_fund_preferences"("investorId", "fundId");

CREATE INDEX "investor_fund_preferences_fundId_idx"
    ON "investor_fund_preferences"("fundId");

ALTER TABLE "investor_fund_preferences"
    ADD CONSTRAINT "investor_fund_preferences_investorId_fkey"
    FOREIGN KEY ("investorId") REFERENCES "investors"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "investor_fund_preferences"
    ADD CONSTRAINT "investor_fund_preferences_fundId_fkey"
    FOREIGN KEY ("fundId") REFERENCES "funds"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Snapshot of the tolerance selected on an individual request.
ALTER TABLE "fund_flows" ADD COLUMN "riskTolerance" "RiskTolerance";

-- RLS: every table in this schema has row level security ON with deliberately
-- ZERO policies (see 20260714000000_enable_rls). The app reaches Postgres as
-- the table owner through Prisma, which RLS does not restrict; the point is to
-- keep the anon/authenticated PostgREST roles from reading it over Supabase's
-- auto-generated REST API. A new table without this line is publicly readable.
ALTER TABLE "investor_fund_preferences" ENABLE ROW LEVEL SECURITY;
