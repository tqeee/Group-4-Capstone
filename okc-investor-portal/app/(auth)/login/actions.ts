'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

export type LoginState = { error: string } | undefined

// Account security safeguard (§3.1): after this many failed attempts within
// the window, further attempts for that email are refused — on top of
// Supabase's own per-IP rate limiting.
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_WINDOW_MINUTES = 15

async function isLockedOut(email: string): Promise<boolean> {
  try {
    const failures = await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        actorEmail: email,
        createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000) },
      },
    })
    return failures >= LOCKOUT_THRESHOLD
  } catch {
    // If the audit store is unreachable, fail open: Supabase still rate
    // limits, and a DB outage must not lock every user out of the portal.
    return false
  }
}

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

  if (await isLockedOut(email)) {
    await audit('LOGIN_LOCKED', {
      actor: email,
      detail: `Blocked: ${LOCKOUT_THRESHOLD}+ failed attempts within ${LOCKOUT_WINDOW_MINUTES} minutes`,
      success: false,
    })
    return {
      error: `Too many failed attempts. Try again in ${LOCKOUT_WINDOW_MINUTES} minutes or reset your password.`,
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

  await audit('LOGIN_SUCCESS', {
    actor: email,
    detail: hasVerifiedFactor ? 'Password verified; TOTP challenge pending' : undefined,
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

export async function signout() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  await supabase.auth.signOut()
  await audit('LOGOUT', { actor: data?.claims?.email ?? null })

  revalidatePath('/', 'layout')
  redirect('/login')
}
