// Idle session timeout (§3.1 account security).
//
// Supabase's own "Inactivity timeout" setting would be the obvious home for
// this, but it is gated to Pro plans and its check only runs when a session is
// next REFRESHED — so the effective window is the configured timeout plus the
// JWT expiry (an hour by default). We enforce it in the proxy instead, which
// already authenticates every request, so the check runs on the actual request
// rather than on the next token refresh.
//
// Two layers, deliberately:
//   - the proxy is the control. It holds even if the tab is closed, JS is
//     disabled, or the session cookie is replayed from curl.
//   - the client countdown (components/dashboard/IdleTimeout.jsx) is UX only.
//     It warns before the axe falls so nobody loses a half-typed deposit form.

// Stamped by the proxy on every authenticated request; read back on the next
// one to measure the gap. Value is a millisecond epoch as a string.
export const IDLE_COOKIE = 'okc-last-activity'

// Total idle budget. Past this, the session is signed out server-side.
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000

// How much idle time passes before the warning modal appears — leaving
// IDLE_TIMEOUT_MS - IDLE_WARNING_MS (5 minutes) on the countdown.
export const IDLE_WARNING_MS = 5 * 60 * 1000

// The client pings /api/session/keepalive at most this often while the user is
// active. Without it, someone reading one long page for 10 minutes without
// navigating would look idle to the proxy and get signed out mid-read.
export const IDLE_HEARTBEAT_MS = 2 * 60 * 1000

export const IDLE_KEEPALIVE_PATH = '/api/session/keepalive'

// Far longer than the timeout on purpose. A missing cookie is treated as "start
// the clock now" (below), so if the browser dropped it at the 10-minute mark
// the timeout would silently never fire. Outliving the window keeps the cookie
// present to be judged stale.
export const IDLE_COOKIE_MAX_AGE = 24 * 60 * 60

export function idleCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isSecure,
    path: '/',
    maxAge: IDLE_COOKIE_MAX_AGE,
  }
}

// Milliseconds the session has been idle, from the cookie the proxy last
// stamped. A missing or malformed cookie returns 0 ("active"): failing closed
// would sign out every user on the first request after this feature ships, and
// on any browser that dropped the cookie. The threat this guards against — an
// unattended authenticated browser — always has the cookie present.
export function idleMillisFrom(cookieValue: string | undefined): number {
  const stamped = Number(cookieValue)
  if (!Number.isFinite(stamped) || stamped <= 0) return 0
  return Math.max(0, Date.now() - stamped)
}
