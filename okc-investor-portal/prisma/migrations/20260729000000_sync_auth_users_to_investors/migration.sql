-- Keeps public.investors (dataset 5.1 profile) in step with auth.users.
--
-- Why a database trigger rather than application code: profiles drifted because
-- accounts get created and deleted straight from the Supabase dashboard and from
-- scripts, not only through /users. Anything that lives in a server action can
-- only cover the one path it sits on. A trigger covers every path.
--
-- Direction is deliberately one-way: auth.users is authoritative (the role claim
-- the proxy trusts lives in app_metadata), and public.investors mirrors it.

-- Supabase app_metadata stores roles lowercase and sometimes kebab-case
-- ('portfolio-manager'); the DB enum is UPPER_SNAKE. Unknown values fall back to
-- INVESTOR, matching normalizeRole() in lib/auth/roles.ts.
CREATE OR REPLACE FUNCTION public.role_from_auth_metadata(raw text)
RETURNS "public"."Role"
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE upper(replace(coalesce(nullif(trim(raw), ''), 'investor'), '-', '_'))
    WHEN 'ADMIN'             THEN 'ADMIN'
    WHEN 'OPERATIONS'        THEN 'OPERATIONS'
    WHEN 'PORTFOLIO_MANAGER' THEN 'PORTFOLIO_MANAGER'
    ELSE 'INVESTOR'
  END::"public"."Role"
$$;

-- INSERT/UPDATE: create or adopt the profile for this auth user.
CREATE OR REPLACE FUNCTION public.sync_investor_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_name  text;
BEGIN
  v_email := lower(coalesce(NEW.email, ''));
  IF v_email = '' THEN
    RETURN NEW;  -- phone-only or pending account: nothing to key a profile on
  END IF;

  v_name := nullif(trim(coalesce(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    ''
  )), '');

  -- Email is the stable business key: re-creating a deleted account re-adopts
  -- its old profile (and therefore its fund flows and ledger history).
  -- id has no DB default (Prisma generates cuid() client-side), so supply one.
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
        -- Never blank out a curated name with a derived one.
        name         = coalesce(v_name, investors.name);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- A failing trigger on auth.users would block sign-up and admin user
  -- creation outright. Mirroring is never worth breaking authentication.
  RAISE WARNING 'sync_investor_from_auth_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- DELETE: unlink, never delete.
CREATE OR REPLACE FUNCTION public.unlink_investor_from_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- The profile owns fund_flows and investor_daily_ledger rows. Deleting it
  -- would either fail on those foreign keys or destroy financial history, so
  -- removing a login only detaches it. The profile stays for §5.1 reporting.
  UPDATE public.investors
     SET "authUserId" = NULL
   WHERE "authUserId" = OLD.id::text;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'unlink_investor_from_auth_user failed for %: %', OLD.id, SQLERRM;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_synced ON auth.users;
CREATE TRIGGER on_auth_user_synced
  AFTER INSERT OR UPDATE OF email, raw_app_meta_data, raw_user_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_investor_from_auth_user();

-- Bans live in banned_until, which is intentionally not in the UPDATE column
-- list above: disabling an account must not touch the profile.
DROP TRIGGER IF EXISTS on_auth_user_unlinked ON auth.users;
CREATE TRIGGER on_auth_user_unlinked
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.unlink_investor_from_auth_user();

-- ---------------------------------------------------------------------------
-- Backfill the drift that accumulated before the triggers existed.
-- ---------------------------------------------------------------------------

-- Stale links: authUserId pointing at an auth user that no longer exists.
UPDATE public.investors i
   SET "authUserId" = NULL
 WHERE i."authUserId" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id::text = i."authUserId");

-- Auth users with no profile, and linked profiles whose role has drifted.
INSERT INTO public.investors (id, "authUserId", email, name, role, "onboardingDate")
SELECT gen_random_uuid()::text,
       u.id::text,
       lower(u.email),
       coalesce(nullif(trim(u.raw_user_meta_data->>'name'), ''), split_part(lower(u.email), '@', 1)),
       public.role_from_auth_metadata(u.raw_app_meta_data->>'role'),
       coalesce(u.created_at, now())
  FROM auth.users u
 WHERE u.email IS NOT NULL
ON CONFLICT (email) DO UPDATE
  SET "authUserId" = EXCLUDED."authUserId",
      role         = EXCLUDED.role;
