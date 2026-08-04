-- Auto-provision a public.investors profile whenever a Supabase auth user is
-- created, so the two never drift apart again.
--
-- WHY: auth.users (managed by Supabase/GoTrue) and public.investors (managed by
-- Prisma) are linked only by investors."authUserId" — a convention enforced in
-- application code, with no FK constraint. Accounts created outside the app's
-- own invite flow (e.g. directly in the Supabase dashboard) therefore got a
-- login with no portal profile: the user could sign in, but every investor page
-- resolved to "no profile" and no deposit could be attached to them.
--
-- This trigger closes that gap at the database level, so it works no matter how
-- the account is created — app invite flow, dashboard, or admin API.
--
-- NOTES
--  * investors.id has no DB default (Prisma generates cuid() client-side), so
--    the trigger supplies gen_random_uuid()::text. Mixed id formats are fine —
--    the column is TEXT and nothing parses its shape.
--  * ON CONFLICT (email) re-links an EXISTING profile instead of creating a
--    duplicate. This is what recovers orphaned rows: recreating a deleted
--    account reattaches it to its original profile and all its financial
--    history, rather than stranding it.
--  * `name` is deliberately NOT overwritten on conflict — an existing profile's
--    name may be meaningful; only the link and the role are refreshed.
--  * app_metadata.role is authoritative (server-controlled); the investors.role
--    column mirrors it for dataset 5.1 reporting.
--  * The body is wrapped in an exception handler on purpose: a failure here must
--    never block auth user creation, which would lock the team out of making
--    accounts. Failures surface as a warning in the Postgres logs instead.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role "Role";
  v_name text;
BEGIN
  -- Phone-only / email-less accounts have nothing to key a profile on.
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    RETURN NEW;
  END IF;

  -- The app stores lowercase kebab-case roles in app_metadata; the DB enum is
  -- UPPER_SNAKE. Anything unrecognised falls back to INVESTOR.
  v_role := CASE lower(coalesce(NEW.raw_app_meta_data->>'role', 'investor'))
    WHEN 'operations'        THEN 'OPERATIONS'
    WHEN 'admin'             THEN 'ADMIN'
    WHEN 'portfolio-manager' THEN 'PORTFOLIO_MANAGER'
    ELSE 'INVESTOR'
  END::"Role";

  v_name := nullif(btrim(coalesce(NEW.raw_user_meta_data->>'name', '')), '');
  IF v_name IS NULL THEN
    v_name := split_part(NEW.email, '@', 1);
  END IF;

  INSERT INTO public.investors (id, "authUserId", email, name, role)
  VALUES (gen_random_uuid()::text, NEW.id::text, lower(NEW.email), v_name, v_role)
  ON CONFLICT (email) DO UPDATE
    SET "authUserId" = EXCLUDED."authUserId",
        role         = EXCLUDED.role;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_auth_user failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
