-- 3.4 correction: risk is specified by the INVESTOR (InvestorFundPreference),
-- not declared by the fund. funds."riskLevel" was a wrong reading of the
-- requirement and is now unused by the application.
--
-- ⚠ APPLY ONLY AFTER THIS BRANCH IS MERGED. The column is still selected by
-- lib/queries.ts on `integration`, so dropping it against the shared database
-- while teammates are running older code makes their fund pages throw.
-- Nothing in this branch reads or writes the column, so the app is correct
-- either way — this migration only tidies the schema up.
ALTER TABLE "funds" DROP COLUMN "riskLevel";
