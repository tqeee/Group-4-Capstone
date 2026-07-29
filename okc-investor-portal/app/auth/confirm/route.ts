import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site-url'
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
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background:#f8fafc; color:#0f172a; }
  .card { background:#fff; max-width:420px; width:calc(100% - 32px); padding:32px; border-radius:16px;
    box-shadow:0 10px 30px rgba(2,6,23,.08); border:1px solid #e2e8f0; text-align:center; }
  .brand { font-weight:700; letter-spacing:.03em; color:#2563eb; margin-bottom:16px; }
  h1 { font-size:20px; margin:0 0 8px; }
  p { color:#475569; font-size:14px; line-height:1.5; margin:0 0 24px; }
  button { width:100%; padding:12px 16px; font-size:15px; font-weight:600; color:#fff;
    background:#2563eb; border:0; border-radius:10px; cursor:pointer; }
  button:hover { background:#1d4ed8; }
  @media (prefers-color-scheme: dark){
    body{ background:#0f172a; color:#e2e8f0 } .card{ background:#1e293b; border-color:#334155 } p{ color:#94a3b8 }
  }
</style>
</head>
<body>
  <form class="card" method="POST" action="/auth/confirm">
    <div class="brand">OKC</div>
    <h1>Reset your password</h1>
    <p>For your security, confirm you requested this password reset. Click below to continue.</p>
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
  const ok = () => NextResponse.redirect(new URL(next, origin), 303)
  const fail = () => NextResponse.redirect(new URL('/forgot-password?error=link', origin), 303)

  const supabase = await createClient()

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: type })
      return ok()
    }
    await audit('AUTH_LINK_REJECTED', { detail: `${type}: ${error.message}`, success: false })
    return fail()
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: 'code' })
      return ok()
    }
    await audit('AUTH_LINK_REJECTED', { detail: `code: ${error.message}`, success: false })
    return fail()
  }

  return fail()
}
