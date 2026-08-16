'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { IDLE_COOKIE, IDLE_TIMEOUT_MS } from '@/lib/auth/idle'
import {
  getLockoutState,
  LOCKOUT_THRESHOLD,
  LOCKOUT_WINDOW_MINUTES,
} from '@/lib/auth/lockout'
import { claimActiveSession } from '@/lib/auth/session-guard'
import { audit } from '@/lib/audit'

export type LoginState = { error: string } | undefined

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailInput = formData.get('email')
  const password = formData.get('password')

  if (
    typeof emailInput !== 'string' ||
    typeof password !== 'string' ||
    !emailInput ||
    !password
  ) {
    return { error: 'Please enter your email and password.' }
  }

  // Normalise so lockout counting can't be dodged by re-casing the email.
  const email = emailInput.trim().toLowerCase()

  // Read before the sign-in attempt, so a success below knows how many
  // failures it is about to clear and can say so in the audit trail.
  const lockout = await getLockoutState(email)

  if (lockout.locked) {
    await audit('LOGIN_LOCKED', {
      actor: email,
      detail: `Blocked: ${lockout.failures} failed attempts (threshold ${LOCKOUT_THRESHOLD}) within ${LOCKOUT_WINDOW_MINUTES} minutes`,
      success: false,
    })
    return {
      error: `Too many failed attempts. Try again in ${LOCKOUT_WINDOW_MINUTES} minutes, or ask an administrator to unlock your account.`,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    await audit('LOGIN_FAILED', { actor: email, detail: error.message, success: false })
    if (error.code === 'user_banned') {
      return { error: 'This account has been disabled. Contact your administrator.' }
    }
    // Keep the message generic so we don't reveal whether the email exists.
    return { error: 'Invalid email or password.' }
  }

  // A new session starts a new idle clock. This POST reached the proxy with no
  // session yet, so the proxy's stamp (which only runs for an authenticated
  // request) was skipped — leaving whatever the PREVIOUS session on this
  // browser wrote. If that timestamp is over the idle budget, the very first
  // page after signing in would be judged idle and bounce straight back to
  // /login?timeout=1. Clearing is enough: a missing cookie is treated as
  // "start the clock now", so the next request stamps it fresh.
  ;(await cookies()).delete(IDLE_COOKIE)

  // Refresh server components so they pick up the new session.
  revalidatePath('/', 'layout')

  // Route by data authenticated against the Auth server (getUser), never by
  // the session read back from cookie storage (spoofable, and supabase-js
  // warns on it).
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user ?? data.user

  // Users with a verified authenticator must pass the TOTP challenge before
  // the session reaches AAL2 (password sign-in only grants AAL1); the proxy
  // blocks everything else until then.
  const hasVerifiedFactor =
    user?.factors?.some((factor) => factor.status === 'verified') ?? false

  // Claim this as the account's one allowed session (§3.1 — no two people
  // signed in on the same login at once) before any redirect, so whichever
  // page loads next already sees a consistent marker. Safe to do before the
  // MFA challenge: challengeAndVerify elevates THIS session's AAL, it doesn't
  // mint a new one, so the session_id claimed here stays valid through it.
  if (user) {
    await claimActiveSession(supabase, user.id, user.app_metadata)
  }

  // This row is itself the lockout reset: getLockoutState() only counts
  // failures recorded after the latest LOGIN_SUCCESS, so proving the password
  // wipes the run of typos that preceded it without deleting the trail.
  //
  // Written on password verification even when a TOTP challenge is still
  // pending — deliberately, because the counter exists to stop password
  // guessing, and whoever got this far already has the password. The
  // authenticator is what stands between them and the portal from here.
  const successDetail = [
    hasVerifiedFactor ? 'Password verified; TOTP challenge pending' : null,
    lockout.failures > 0
      ? `Cleared ${lockout.failures} failed attempt${lockout.failures === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean)

  await audit('LOGIN_SUCCESS', {
    actor: email,
    detail: successDetail.length > 0 ? successDetail.join(' · ') : undefined,
  })

  if (hasVerifiedFactor) {
    redirect('/mfa')
  }

  // Admin-created accounts must set their own password on first login.
  const appMetadata = user?.app_metadata
  if (appMetadata?.must_change_password === true) {
    redirect('/change-password')
  }

  redirect(ROLE_HOME[normalizeRole(appMetadata?.role)])
}

// Shared by both sign-out paths below. Not exported — in a 'use server' file
// every export becomes a callable server action, and this takes a caller-
// supplied detail string that has no business being reachable from the client.
async function endSession(detail?: string) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  await supabase.auth.signOut()
  await audit('LOGOUT', { actor: data?.claims?.email ?? null, detail })

  // Otherwise a stale timestamp from the previous session decides the idle
  // clock for the next person to sign in on this browser.
  ;(await cookies()).delete(IDLE_COOKIE)

  revalidatePath('/', 'layout')
}

export async function signout() {
  await endSession()
  redirect('/login')
}

// Called by the client idle countdown when it runs out. Separate from signout()
// rather than a parameter on it, because signout() is used as a form action and
// would receive FormData as its first argument.
export async function signoutIdle() {
  await endSession(
    `Signed out automatically after ${IDLE_TIMEOUT_MS / 60000} minutes of inactivity`
  )
  redirect('/login?timeout=1')
}
