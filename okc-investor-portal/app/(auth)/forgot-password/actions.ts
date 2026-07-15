'use server'

import { createClient } from '@/lib/supabase/server'
import { getSiteOrigin } from '@/lib/site-url'
import { audit } from '@/lib/audit'

export type ForgotPasswordState = { message: string; error?: boolean } | undefined

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email')

  if (typeof email !== 'string' || !email.includes('@')) {
    return { message: 'Please enter your email address.', error: true }
  }

  const origin = await getSiteOrigin()

  // The email link goes through /auth/confirm, which exchanges the token for
  // a session and forwards to the change-password page.
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${origin}/auth/confirm?next=/change-password`,
  })
  await audit('PASSWORD_RESET_REQUESTED', { actor: email.trim().toLowerCase() })

  // Keep the message generic so we don't reveal whether the email exists.
  return { message: "If an account exists for that email, we've sent a reset link." }
}
