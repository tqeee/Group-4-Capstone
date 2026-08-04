'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeRole, ROLE_HOME } from '@/lib/auth/roles'
import { RECOVERY_COOKIE } from '@/lib/auth/recovery'
import { audit } from '@/lib/audit'

// `needsMfa` tells the client to drop back to the TOTP challenge: the session
// lost (or never had) AAL2, which Supabase requires to change the password of
// an MFA-enabled account.
export type ChangePasswordState = { error: string; needsMfa?: boolean } | undefined

const MIN_PASSWORD_LENGTH = 12

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const password = formData.get('password')
  const confirmPassword = formData.get('confirmPassword')

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` }
  }

  // bcrypt (used by Supabase Auth) only hashes the first 72 bytes.
  if (password.length > 72) {
    return { error: 'Password must be 72 characters or fewer.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  const supabase = await createClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    redirect('/login')
  }

  if (userData.user.email && password.toLowerCase().includes(userData.user.email.toLowerCase())) {
    return { error: 'Password must not contain your email address.' }
  }

  const { error: updateError } = await supabase.auth.updateUser({ password })

  if (updateError) {
    // Supabase rejects a password change on an MFA-enabled account unless the
    // session is AAL2 (401 insufficient_aal). A recovery link only ever
    // produces AAL1, so the page challenges for TOTP first — this is the
    // fallback for a session that lost AAL2 in between. Never surface the raw
    // "AAL2 session is required..." string; it means nothing to an investor.
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
  if (userData.user.app_metadata?.must_change_password === true) {
    const admin = createAdminClient()
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      userData.user.id,
      {
        app_metadata: {
          ...userData.user.app_metadata,
          must_change_password: false,
        },
      }
    )

    if (metadataError) {
      return { error: 'Password updated, but finishing setup failed. Please try again.' }
    }

    // Mint a fresh access token so the proxy sees the cleared flag immediately.
    await supabase.auth.refreshSession()
  }

  await audit('PASSWORD_CHANGED', { actor: userData.user.email ?? null })

  // The recovery exemption is spent — drop it so the TOTP gate applies again on
  // the very next request (see lib/auth/recovery.ts).
  ;(await cookies()).delete(RECOVERY_COOKIE)

  revalidatePath('/', 'layout')
  redirect(ROLE_HOME[normalizeRole(userData.user.app_metadata?.role)])
}
