import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { normalizeRole, requiredRoleForPath, ROLE_HOME } from '@/lib/auth/roles'
import { RECOVERY_COOKIE } from '@/lib/auth/recovery'
import {
  IDLE_COOKIE,
  IDLE_TIMEOUT_MS,
  idleCookieOptions,
  idleMillisFrom,
} from '@/lib/auth/idle'
import { siteOriginFromHeaders } from '@/lib/site-url'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  // getClaims() also verifies the JWT signature; its `aal` claim is the
  // session's current assurance level.
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  // Authorization data (role, password flag, MFA factors) must come from the
  // Auth server via getUser(), never from cookie storage — reading the user
  // off the stored session is spoofable and triggers the supabase-js
  // "could be insecure" warning. This also drops sessions of deleted users.
  let user: User | null = null
  if (claims) {
    const { data: userData } = await supabase.auth.getUser()
    user = userData?.user ?? null
  }

  // GoTrue bans only block new token grants — an already-issued session keeps
  // validating until it expires. Enforce the ban here so disabling an account
  // cuts off its live sessions on their next request.
  const bannedUntil = (user as (User & { banned_until?: string }) | null)?.banned_until
  if (bannedUntil && new Date(bannedUntil) > new Date()) {
    user = null
  }

  const { pathname } = request.nextUrl
  const isApiRoute = pathname.startsWith('/api/')

  // Never build a redirect from `request.nextUrl` — behind a reverse proxy that
  // forwards to an internal port (Azure App Service uses 8080), it carries the
  // server's internal origin/port, not the public one. The shared helper is
  // env-first (NEXT_PUBLIC_SITE_URL, which must be set in production) and
  // falls back to the forwarded/host headers otherwise.
  const siteOrigin = siteOriginFromHeaders(request.headers, request.nextUrl.origin)

  // `search` defaults to carrying the current query string across the redirect
  // (so e.g. ?search= survives a role bounce); pass it explicitly to replace it.
  const redirectTo = (to: string, search?: string) => {
    const url = new URL(to, siteOrigin)
    url.search = search ?? request.nextUrl.search
    const response = NextResponse.redirect(url)
    // getClaims()/getUser() above may have refreshed the session; those cookies
    // live on supabaseResponse, and a fresh redirect response would drop them.
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    return response
  }

  // Routes that can be reached without being signed in. Exact-or-segment
  // matching so a prefix can't accidentally expose similarly named routes.
  const publicRoutes = ['/login', '/forgot-password', '/auth', '/debug-users']
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (!user && !isPublicRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    // No user: send them to the login page.
    return redirectTo('/login')
  }

  if (user) {
    // Idle timeout (§3.1). Enforced here rather than by Supabase's own
    // "Inactivity timeout" setting, which is Pro-only and lazily applied — see
    // lib/auth/idle.ts. This is the control; the client countdown is only the
    // warning UI over it, so a closed lid or a replayed cookie still expires.
    if (idleMillisFrom(request.cookies.get(IDLE_COOKIE)?.value) > IDLE_TIMEOUT_MS) {
      // scope 'local' revokes THIS session only — an idle desktop tab must not
      // sign the same user out of their phone.
      await supabase.auth.signOut({ scope: 'local' })

      if (isApiRoute) {
        return NextResponse.json({ error: 'Session expired' }, { status: 401 })
      }
      const response = redirectTo('/login', '?timeout=1')
      response.cookies.delete(IDLE_COOKIE)
      return response
    }

    // Stamp the clock forward. Done before the gates below so the redirects
    // they issue carry the fresh timestamp too.
    supabaseResponse.cookies.set(
      IDLE_COOKIE,
      String(Date.now()),
      idleCookieOptions(siteOrigin.startsWith('https://'))
    )

    const role = normalizeRole(user.app_metadata?.role)
    const mustChangePassword = user.app_metadata?.must_change_password === true

    // Accounts with a verified authenticator must complete the TOTP challenge
    // (AAL2) before anything else — including /mfa/setup and password change.
    // A verified factor means the session can (and must) reach AAL2.
    const hasVerifiedFactor =
      user.factors?.some((factor) => factor.status === 'verified') ?? false
    const needsMfaChallenge = hasVerifiedFactor && claims?.aal !== 'aal2'

    // ...with one exception: a password-recovery link produces an AAL1 session,
    // so this gate would bounce the user to /mfa and they could never reach the
    // page the reset email invited them to. /auth/confirm marks that session;
    // honour it for /change-password ONLY. Everything else still demands AAL2,
    // so the TOTP challenge simply moves to the redirect after the new password
    // is set — the factor is never skipped, only deferred.
    const completingRecovery =
      request.cookies.get(RECOVERY_COOKIE)?.value === '1' && pathname === '/change-password'

    if (needsMfaChallenge && pathname !== '/mfa' && !completingRecovery) {
      return redirectTo('/mfa')
    }

    // Admin-created accounts must set their own password before doing anything else.
    if (mustChangePassword && pathname !== '/change-password') {
      return redirectTo('/change-password')
    }

    if (pathname === '/login' || pathname === '/') {
      // Already signed in: skip the login page and the landing page.
      return redirectTo(ROLE_HOME[role])
    }

    // Role-gated sections: send users visiting another role's pages back to
    // their own dashboard; API routes get a 403 instead of an HTML redirect.
    const requiredRole = requiredRoleForPath(pathname)
    if (requiredRole && requiredRole !== role) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      return redirectTo(ROLE_HOME[role])
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}