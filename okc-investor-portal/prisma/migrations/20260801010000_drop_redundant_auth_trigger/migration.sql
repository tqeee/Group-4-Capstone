-- Reverts 20260801000000_auth_user_profile_trigger.
--
-- That migration added an on_auth_user_created trigger to auto-provision a
-- public.investors profile for every new auth user. It turned out the shared
-- database ALREADY had equivalent (and better) triggers, added directly by a
-- teammate and not captured in this migration history:
--
--   on_auth_user_synced   AFTER INSERT OR UPDATE OF email, raw_app_meta_data,
--                         raw_user_meta_data  -> sync_investor_from_auth_user()
--   on_auth_user_unlinked AFTER DELETE        -> unlink_investor_from_auth_user()
--
-- Theirs is a strict superset: it also fires on UPDATE (so role/name/email
-- changes propagate), preserves the real auth created_at as onboardingDate,
-- reads full_name as well as name, and nulls "authUserId" on delete instead of
-- leaving a dangling reference.
--
-- Keeping both meant every auth-user insert ran the same upsert twice, so this
-- drops the redundant one. The teammate's triggers are deliberately left alone
-- and remain the single source of truth for auth -> profile provisioning.
--
-- NOTE: those two triggers still live only in the database, not in this
-- migration history — a fresh rebuild from migrations would not have them.
-- Capturing them belongs in a separate reconciliation migration.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
