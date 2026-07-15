-- Enable Row Level Security on every table. The app never uses Supabase's
-- auto-generated REST API (all access goes through Prisma as the table owner,
-- which RLS does not restrict), so no policies are defined: with RLS on and
-- zero policies, the anon/authenticated PostgREST roles can neither read nor
-- write any row.
ALTER TABLE "public"."investors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."funds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fund_flows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."deals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."fund_daily_nav" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."investor_daily_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."portal_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
