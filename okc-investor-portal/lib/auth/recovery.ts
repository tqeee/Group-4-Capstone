// Marks the short window between verifying a password-recovery email link and
// actually setting the new password.
//
// A recovery link produces an AAL1 session. For an account with a verified
// authenticator the proxy's TOTP gate fires first and redirects to /mfa, so the
// user can never reach the page the reset link invited them to. This cookie
// lets the proxy grant that ONE page (/change-password) for that one session.
//
// Deliberately narrow: it does not grant access to the rest of the app, so a
// user still completes the TOTP challenge on the redirect that follows the
// password change. The cookie is cleared as soon as the password is set.
export const RECOVERY_COOKIE = 'okc-password-recovery'

// Long enough to pick a password, short enough that a stale cookie on a shared
// machine isn't a standing exemption.
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60
