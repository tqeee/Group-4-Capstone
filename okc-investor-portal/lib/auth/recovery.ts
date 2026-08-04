// Cookie contract for the password-recovery flow.
//
// Constants only, and deliberately free of any database import: this module is
// pulled in by proxy.ts, which runs on every single request. The lookup that
// backs RESET_TOKEN_COOKIE lives in ./reset-link.ts and is used only by the
// Node-runtime route handler, page and action that can afford a query.

// How long a password-reset email link stays usable, measured from the moment
// GoTrue sent it (auth.users.recovery_sent_at). Enforced by us in
// lib/auth/reset-link.ts, because the link is NOT spent by being opened any
// more — see app/auth/confirm/route.ts. Supabase's own "Email OTP expiration"
// setting is the backstop for anyone hitting GoTrue directly, and should be
// set to match (see CLAUDE.md → Remaining, Supabase dashboard config).
export const RESET_LINK_MAX_AGE_MS = 20 * 60 * 1000

// Holds the still-UNSPENT token_hash from a recovery link, so /change-password
// can identify the account and the action can spend the token at the moment
// the new password is actually set. Possession of this cookie grants nothing on
// its own: every read re-validates the token against the database.
export const RESET_TOKEN_COOKIE = 'okc-password-reset'

// Marks the window between spending a recovery token and landing somewhere
// else. A recovery session is AAL1, so for an account with a verified
// authenticator the proxy's TOTP gate would fire and redirect to /mfa — the
// user could never finish the reset the email invited them to. This cookie
// lets the proxy grant that ONE page (/change-password) for that one session.
//
// Deliberately narrow: it does not grant access to the rest of the app, so the
// user still completes the TOTP challenge on the redirect that follows the
// password change. Cleared as soon as the password is set.
export const RECOVERY_COOKIE = 'okc-password-recovery'

// Matches the link's own lifetime: the grant should not outlive the link that
// created it.
export const RECOVERY_COOKIE_MAX_AGE = RESET_LINK_MAX_AGE_MS / 1000

/** Shared options for both cookies — httpOnly, and https-only in production. */
export function recoveryCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: RECOVERY_COOKIE_MAX_AGE,
  }
}
