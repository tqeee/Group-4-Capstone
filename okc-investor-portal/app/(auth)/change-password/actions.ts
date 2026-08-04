'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSiteOrigin } from '@/lib/site-url'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import {
  RECOVERY_COOKIE,
  RESET_TOKEN_COOKIE,
  recoveryCookieOptions,
} from '@/lib/auth/recovery'
import { lookupResetLink } from '@/lib/auth/reset-link'
import { firstPasswordProblem } from '@/lib/auth/password'
import { audit } from '@/lib/audit'

// `needsMfa` tells the client to drop back to the TOTP challenge: the session
// lost (or never had) AAL2, which Supabase requires to change the password of
// an MFA-enabled account.
export type ChangePasswordState = { error: string; needsMfa?: boolean } | undefined

const LINK_EXPIRED = 'That reset link has expired. Request a new one to continue.'
const LINK_INVALID = 'That reset link is no longer valid. Request a new one to continue.'

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')

  if (typeof password !== 'string') {
    return { error: 'Password is required.' }
  }

  // Validate everything we can BEFORE redeeming anything. In the recovery flow
  // the verifyOtp() below permanently spends the emailed link, so a password
  // the rules would reject has to cost the user a retry — never their link.
  // These checks mirror Supabase's own policy (lib/auth/password.ts); the one
  // rule we cannot pre-empt is its leaked-password list.
  const problem = firstPasswordProblem(password)
  if (problem) {
    return { error: problem }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const cookieStore = await cookies()
  const { data: userData } = await supabase.auth.getUser()
  let user = userData?.user ?? null

  // ── Recovery mode ────────────────────────────────────────────────────────
  // No session, because opening the reset link no longer creates one: the
  // token is held unspent in a cookie so the link keeps working until it is
  // actually used. This is that moment — the password is valid and about to be
  // set, so redeeming the token here means it dies with the change it made.
  if (!user) {
    const tokenHash = cookieStore.get(RESET_TOKEN_COOKIE)?.value
    const link = await lookupResetLink(tokenHash)

    if (link.status !== 'valid') {
      return { error: link.status === 'expired' ? LINK_EXPIRED : LINK_INVALID }
    }

    // Checked against the link's own account before spending it, for the same
    // reason as above. The equivalent check for an ordinary signed-in change
    // is below.
    if (password.toLowerCase().includes(link.email.toLowerCase())) {
      return { error: 'Password must not contain your email address.' }
    }

    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      type: 'recovery',
      token_hash: tokenHash!,
    })

    if (verifyError || !verified.user) {
      await audit('AUTH_LINK_REJECTED', {
        detail: `recovery: ${verifyError?.message ?? 'no user returned'}`,
        success: false,
      })
      return { error: LINK_INVALID }
    }

    await audit('AUTH_LINK_VERIFIED', { actor: verified.user.email ?? null, detail: 'recovery' })
    user = verified.user

    // The session just minted is AAL1. If this account has an authenticator the
    // proxy's TOTP gate would bounce the very next request to /mfa — including
    // the re-render after an MFA retry — so grant the same narrow, one-page
    // exemption /auth/confirm used to. It is cleared once the password is set.
    const origin = await getSiteOrigin()
    cookieStore.set(RECOVERY_COOKIE, '1', recoveryCookieOptions(origin.startsWith('https://')))
  }

  if (!user) {
    redirect('/login')
  }

  if (user.email && password.toLowerCase().includes(user.email.toLowerCase())) {
    return { error: 'Password must not contain your email address.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    // Supabase rejects a password change on an MFA-enabled account unless the
    // session is AAL2 (401 insufficient_aal). A recovery link only ever
    // produces AAL1, so the client drops back to a TOTP challenge and the user
    // submits again. Never surface the raw "AAL2 session is required..."
    // string; it means nothing to an investor.
    if (updateError.code === 'insufficient_aal' || updateError.status === 401) {
      return {
        error: 'Please re-enter the code from your authenticator app to confirm this change.',
        needsMfa: true,
      }
    }

    return {
      error:
        updateError.code === 'same_password'
          ? 'Your new password must be different from the current one.'
          : updateError.message,
    }
  }

  // Security safeguard: a password change invalidates every other session
  // (stolen or forgotten logins elsewhere), keeping only this one.
  await supabase.auth.signOut({ scope: 'others' })

  // Clear the first-login flag for invited users. This lives in app_metadata
  // so only the service-role client can change it; spread the existing
  // metadata because the update is a shallow merge and we must keep the role
  // claim intact.
  if (user.app_metadata?.must_change_password === true) {
    const admin = createAdminClient()
    const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...user.app_metadata,
        must_change_password: false,
      },
    })

    if (metadataError) {
      return { error: 'Password updated, but finishing setup failed. Please try again.' }
    }

    // Mint a fresh access token so the proxy sees the cleared flag immediately.
    await supabase.auth.refreshSession()
  }

  await audit('PASSWORD_CHANGED', { actor: user.email ?? null })

  // Both grants are spent. The recovery exemption goes so the TOTP gate applies
  // again on the very next request, and the reset token goes because the link
  // it came from is now redeemed — condition (b) of "reusable until used".
  cookieStore.delete(RECOVERY_COOKIE)
  cookieStore.delete(RESET_TOKEN_COOKIE)

  revalidatePath('/', 'layout')
  redirect(ROLE_HOME[normalizeRole(user.app_metadata?.role)])
}
