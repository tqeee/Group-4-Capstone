import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { normalizeRole, requiredRoleForPath, ROLE_HOME } from '@/lib/auth/roles'

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
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = normalizeRole(user.app_metadata?.role)
    const mustChangePassword = user.app_metadata?.must_change_password === true

    // Accounts with a verified authenticator must complete the TOTP challenge
    // (AAL2) before anything else — including /mfa/setup and password change.
    // A verified factor means the session can (and must) reach AAL2.
    const hasVerifiedFactor =
      user.factors?.some((factor) => factor.status === 'verified') ?? false
    const needsMfaChallenge = hasVerifiedFactor && claims?.aal !== 'aal2'
    if (needsMfaChallenge && pathname !== '/mfa') {
      const url = request.nextUrl.clone()
      url.pathname = '/mfa'
      return NextResponse.redirect(url)
    }

    // Admin-created accounts must set their own password before doing anything else.
    if (mustChangePassword && pathname !== '/change-password') {
      const url = request.nextUrl.clone()
      url.pathname = '/change-password'
      return NextResponse.redirect(url)
    }

    if (pathname === '/login' || pathname === '/') {
      // Already signed in: skip the login page and the landing page.
      const url = request.nextUrl.clone()
      url.pathname = ROLE_HOME[role]
      return NextResponse.redirect(url)
    }

    // Role-gated sections: send users visiting another role's pages back to
    // their own dashboard; API routes get a 403 instead of an HTML redirect.
    const requiredRole = requiredRoleForPath(pathname)
    if (requiredRole && requiredRole !== role) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const url = request.nextUrl.clone()
      url.pathname = ROLE_HOME[role]
      return NextResponse.redirect(url)
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