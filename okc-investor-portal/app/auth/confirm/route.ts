import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site-url'
import {
  RECOVERY_COOKIE,
  RESET_TOKEN_COOKIE,
  recoveryCookieOptions,
} from '@/lib/auth/recovery'
import { lookupResetLink } from '@/lib/auth/reset-link'
import { IDLE_COOKIE } from '@/lib/auth/idle'
import { audit } from '@/lib/audit'

// Supabase auth email links (recovery, invite, email change) carry a SINGLE-USE
// token. Email security scanners — notably Microsoft 365 / Outlook "Safe Links"
// — fetch every link in an email to check it, and a plain GET that verifies the
// token would let the scanner CONSUME it before the human clicks, leaving the
// real user with "Email link is invalid or has expired".
//
// So GET does NOT verify: it renders a tiny interstitial with a Continue button.
// Scanners fetch the page but don't press buttons, so the token survives. The
// token is only spent on the POST below, triggered by a real click.
//
// RECOVERY links go further and are not spent here at all. Verifying a token is
// irreversible, so doing it on arrival meant merely OPENING the email burned
// the link: close the tab, click it again, and a perfectly valid reset read as
// "invalid or has expired". Instead the token is checked against the database
// (lookupResetLink — a read, not a redemption), stashed in a cookie, and only
// redeemed by changePassword() at the moment a new password is accepted. Until
// then the same link keeps working, on this device or any other, for as long as
// RESET_LINK_MAX_AGE_MS allows.

function safeNext(raw: string | null | undefined): string {
  const v = raw ?? '/change-password'
  // Only same-origin relative paths — prevents open redirects via ?next=.
  // Backslashes are rejected too: browsers normalise '/\evil.com' to '//evil.com',
  // which would otherwise slip past the '//' check as a protocol-relative URL.
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\')
    ? v
    : '/change-password'
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const tokenHash = sp.get('token_hash') ?? ''
  const type = sp.get('type') ?? ''
  const code = sp.get('code') ?? ''
  const next = safeNext(sp.get('next'))

  // No usable token (stray visit, or the link's own error fragment).
  if (!(tokenHash && type) && !code) {
    const origin = await getSiteOrigin()
    return NextResponse.redirect(new URL('/forgot-password?error=link', origin), 303)
  }

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Reset your password &middot; OKC</title>
<style>
  /* This page is a standalone HTML document served by a route handler, so it
     gets neither globals.css nor Tailwind. The rules below are hand-ported from
     the portal's own tokens so it matches /mfa, which is the very next page in
     this flow: .mfa-card, .mfa-button-primary, the #fbfcff auth background and
     the Arial stack globals.css sets on body. Keep the two in step.
     Colours are declared twice — hex first, then the exact Tailwind v4 oklch —
     so an older in-app email browser still gets the right shade. */
  :root { color-scheme: light; }   /* the portal is light-only, see globals.css */
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; padding: 2.5rem 1rem;
    display: flex; align-items: center; justify-content: center;
    font-family: Arial, Helvetica, sans-serif;
    background: #fbfcff;
    color: #0f172a; color: oklch(20.8% 0.042 265.755);          /* slate-900 */
  }
  .card {                                                        /* = .mfa-card */
    width: 100%; max-width: 24rem; padding: 1.5rem;
    background: #fff;
    border: 1px solid #e5e7eb;
    border: 1px solid oklch(92.8% 0.006 264.531);                /* gray-200 */
    border-radius: 1rem;                                         /* rounded-2xl */
    box-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);
  }
  @media (min-width: 640px) { .card { padding: 1.75rem; } }      /* sm:p-7 */
  .brand {
    margin: 0 0 1.25rem; font-size: 1.25rem; font-weight: 800;
    letter-spacing: -0.025em; color: #000;
  }
  h1 { margin: 0 0 0.375rem; font-size: 1.125rem; font-weight: 600; }
  .lede {
    margin: 0 0 1.5rem; font-size: 0.875rem; line-height: 1.625;
    color: #64748b; color: oklch(55.4% 0.046 257.417);           /* slate-500 */
  }
  button {                                             /* = .mfa-button-primary */
    display: block; width: 100%; padding: 0.625rem 0;
    border: 0; border-radius: 0.75rem;                           /* rounded-xl */
    background: #1554ff;
    font-family: inherit; font-size: 0.875rem; font-weight: 600; color: #fff;
    cursor: pointer; transition: background-color .15s ease;
  }
  button:hover { background: #0047ff; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/auth/confirm">
    <p class="brand">OKC</p>
    <h1>Reset your password</h1>
    <p class="lede">For your security, confirm you requested this password reset. Click below to continue.</p>
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}">
    <input type="hidden" name="type" value="${escapeHtml(type)}">
    <input type="hidden" name="code" value="${escapeHtml(code)}">
    <input type="hidden" name="next" value="${escapeHtml(next)}">
    <button type="submit">Continue</button>
  </form>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  })
}

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const tokenHash = String(form.get('token_hash') ?? '')
  const type = String(form.get('type') ?? '') as EmailOtpType | ''
  const code = String(form.get('code') ?? '')
  const next = safeNext(String(form.get('next') ?? ''))

  // Build redirects from the configured site origin, NOT request.url — behind a
  // reverse proxy (Azure App Service serves on internal localhost:8080) the
  // request host would otherwise leak into the Location header. Use 303 so the
  // browser issues a GET to the destination after this POST.
  const origin = await getSiteOrigin()
  const secure = origin.startsWith('https://')
  const fail = (reason: 'link' | 'expired' = 'link') =>
    NextResponse.redirect(new URL(`/forgot-password?error=${reason}`, origin), 303)

  // Recovery links land on /change-password, but that session is AAL1 and the
  // proxy's TOTP gate would bounce it to /mfa first. Mark it so the proxy lets
  // this one page through — see lib/auth/recovery.ts.
  const ok = (isRecovery: boolean) => {
    const response = NextResponse.redirect(new URL(next, origin), 303)
    // Verifying a link mints a NEW session (possibly for a different user), so
    // the previous session's idle timestamp must not carry over — otherwise a
    // stale one sends the user straight back out. Same reasoning as the login
    // action; a missing cookie just restarts the clock. path: '/' must match
    // how the cookie was set (idleCookieOptions) or the delete silently
    // no-ops, leaving the stale timestamp in place.
    response.cookies.delete({ name: IDLE_COOKIE, path: '/' })
    if (isRecovery) {
      response.cookies.set(RECOVERY_COOKIE, '1', recoveryCookieOptions(secure))
    }
    return response
  }

  const supabase = await createClient()

  // ── Password recovery: check the token, don't redeem it ──────────────────
  if (tokenHash && type === 'recovery') {
    const link = await lookupResetLink(tokenHash)

    if (link.status === 'valid') {
      await audit('AUTH_LINK_OPENED', { actor: link.email, detail: 'recovery' })

      // Pinned to /change-password: the cookie below exempts that one path and
      // nothing else, so honouring an arbitrary ?next= here would land the
      // visitor on a page the proxy immediately bounces to /login.
      const target = next.startsWith('/change-password') ? next : '/change-password'
      const response = NextResponse.redirect(new URL(target, origin), 303)
      // Same reasoning as ok(): whoever arrives here is starting a fresh
      // authentication, so a previous session's idle timestamp must not send
      // them straight back out. A missing cookie just restarts the clock.
      // path: '/' must match how the cookie was set (idleCookieOptions) or
      // the delete silently no-ops, leaving the stale timestamp in place.
      response.cookies.delete({ name: IDLE_COOKIE, path: '/' })
      response.cookies.set(RESET_TOKEN_COOKIE, tokenHash, recoveryCookieOptions(secure))
      return response
    }

    // The token is gone. If this browser is already mid-reset — it holds the
    // recovery grant and a live session — the link did its job and was spent by
    // an earlier attempt on this same flow, so let them carry on rather than
    // showing "invalid". changePassword() deletes that cookie on success, so a
    // COMPLETED reset can never be resumed this way.
    if (request.cookies.get(RECOVERY_COOKIE)?.value === '1') {
      const { data: resumed } = await supabase.auth.getUser()
      if (resumed?.user) {
        return NextResponse.redirect(new URL('/change-password', origin), 303)
      }
    }

    await audit('AUTH_LINK_REJECTED', { detail: `recovery: ${link.status}`, success: false })
    return fail(link.status === 'expired' ? 'expired' : 'link')
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: type })
      return ok(type === 'recovery')
    }
    await audit('AUTH_LINK_REJECTED', { detail: `${type}: ${error.message}`, success: false })
    return fail()
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: 'code' })
      // PKCE links don't carry the type, so infer it from where we're sending them.
      return ok(next.startsWith('/change-password'))
    }
    await audit('AUTH_LINK_REJECTED', { detail: `code: ${error.message}`, success: false })
    return fail()
  }

  return fail()
}
