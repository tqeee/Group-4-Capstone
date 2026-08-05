import type { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// A middleware redirect's query string can be lost when it's encountered
// during a Next.js client-side (soft) navigation — observed in testing: after
// being kicked via a sidebar Link click (as opposed to a hard reload), the
// browser lands on plain /login instead of /login?concurrent=1, so the login
// page never learns why it's there. A cookie set on the same redirect
// response survives regardless of how the client reconstructs the URL, since
// it travels with whatever request actually ends up rendering /login's
// content. Short-lived (10s) so it can't linger and show the banner on a
// later, unrelated visit to /login.
export const CONCURRENT_KICK_COOKIE = 'okc-concurrent-kick'

// Enforces "one active session per account" — no two people signed in on the
// same login at once. Every place that mints a brand-new session (password
// login, a redeemed recovery/invite/magic link, a PKCE code exchange) calls
// this right after succeeding. It stamps that session's own `session_id` — a
// standard Supabase JWT claim, present on every access token — onto the
// user's app_metadata as the single currently-allowed session.
//
// lib/supabase/proxy.ts compares each request's own session_id claim against
// this stored value on every request. A mismatch means a NEWER session has
// since superseded this one (someone signed in again, anywhere), so the
// proxy signs this session out itself and redirects with an explanation
// instead of leaving a phantom second session live until its JWT happens to
// expire naturally.
//
// Spreads the existing app_metadata before writing — updateUserById replaces
// the whole object, not just the key you pass (see the identical comment on
// the must_change_password clear in change-password/actions.ts) — and
// swallows its own errors, because a hiccup in this bookkeeping must never
// block a legitimate sign-in (same principle lib/audit.ts follows).
export async function claimActiveSession(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  existingAppMetadata: Record<string, unknown> | undefined
): Promise<void> {
  try {
    const { data } = await supabase.auth.getClaims()
    const sessionId = data?.claims?.session_id
    if (!sessionId) return

    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { ...existingAppMetadata, active_session_id: sessionId },
    })
  } catch (err) {
    console.error('claimActiveSession failed:', err)
  }
}
