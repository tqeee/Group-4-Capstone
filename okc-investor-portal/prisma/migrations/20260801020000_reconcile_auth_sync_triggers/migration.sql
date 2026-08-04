-- Reconciliation migration (second of its kind — see
-- 20260721120000_reconcile_direct_db_edits for the first).
--
-- A teammate added the auth -> profile sync directly to the shared Supabase
-- project (dashboard / SQL editor) without a migration, so these objects lived
-- ONLY in that one database: a fresh rebuild from migrations would silently
-- lack auto-provisioning, and nobody reading the repo would know they exist.
-- This captures them so the migration history matches reality.
--
-- WHAT THIS SOLVES
-- auth.users (managed by Supabase/GoTrue) and public.investors (managed by
-- Prisma) are linked only by investors."authUserId" — a convention with no FK
-- constraint. Accounts created outside the app's own invite flow used to get a
-- login with no portal profile: the user could sign in, but every investor page
-- resolved to "no profile" and no deposit could be attached to them. These
-- triggers close that gap at the database level, so it works however the
-- account is created — app invite flow, Supabase dashboard, or admin API.
--
-- BEHAVIOUR
--   INSERT/UPDATE on auth.users -> upsert the matching investors row.
--     * keyed on email, so recreating a deleted account REATTACHES it to its
--       original profile (and all its financial history) instead of duplicating
--     * app_metadata.role is authoritative and always refreshed
--     * name only overwritten when the auth metadata actually supplies one
--     * onboardingDate seeded from the real auth created_at
--   DELETE on auth.users -> null the link, keeping the profile and its ledger
--     history intact rather than leaving a dangling "authUserId".
--
-- Both functions swallow their own errors by design: a failure here must never
-- block auth user creation, which would lock the team out of making accounts.
-- Failures surface as warnings in the Postgres logs.
--
-- Written idempotently (CREATE OR REPLACE / DROP IF EXISTS) so it is safe both
-- on the shared project, where these objects already exist, and on a fresh
-- rebuild where they do not.

-- Maps the app's role string (lowercase kebab-case in app_metadata) onto the
-- Role enum. Defined first — sync_investor_from_auth_user() calls it.
CREATE OR REPLACE FUNCTION public.role_from_auth_metadata(raw text)
RETURNS public."Role"
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE upper(replace(coalesce(nullif(trim(raw), ''), 'investor'), '-', '_'))
    WHEN 'ADMIN'             THEN 'ADMIN'
    WHEN 'OPERATIONS'        THEN 'OPERATIONS'
    WHEN 'PORTFOLIO_MANAGER' THEN 'PORTFOLIO_MANAGER'
    ELSE 'INVESTOR'
  END::public."Role"
$fn$;

CREATE OR REPLACE FUNCTION public.sync_investor_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  v_email := lower(coalesce(NEW.email, ''));
  IF v_email = '' THEN
    RETURN NEW;
  END IF;

  v_name := nullif(trim(coalesce(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  )), '');

  INSERT INTO public.investors (id, "authUserId", email, name, role, "onboardingDate")
  VALUES (
    gen_random_uuid()::text,
    NEW.id::text,
    v_email,
    coalesce(v_name, split_part(v_email, '@', 1)),
    public.role_from_auth_metadata(NEW.raw_app_meta_data->>'role'),
    coalesce(NEW.created_at, now())
  )
  ON CONFLICT (email) DO UPDATE
    SET "authUserId" = EXCLUDED."authUserId",
        role         = EXCLUDED.role,
        name         = coalesce(v_name, investors.name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'sync_investor_from_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.unlink_investor_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
BEGIN
  UPDATE public.investors
     SET "authUserId" = NULL
   WHERE "authUserId" = OLD.id::text;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'unlink_investor_from_auth_user failed for %: %', OLD.id, SQLERRM;
  RETURN OLD;
END;
$fn$;

DROP TRIGGER IF EXISTS on_auth_user_synced ON auth.users;
CREATE TRIGGER on_auth_user_synced
  AFTER INSERT OR UPDATE OF email, raw_app_meta_data, raw_user_meta_data
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_investor_from_auth_user();

DROP TRIGGER IF EXISTS on_auth_user_unlinked ON auth.users;
CREATE TRIGGER on_auth_user_unlinked
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.unlink_investor_from_auth_user();
