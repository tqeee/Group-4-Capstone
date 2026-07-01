'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export type ForgotPasswordState = { message: string; error?: boolean } | undefined

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = formData.get('email')

  if (typeof email !== 'string' || !email) {
    return { message: 'Please enter your email address.', error: true }
  }

  const headersList = await headers()
  const protocol = headersList.get('x-forwarded-proto') ?? 'http'
  const origin = `${protocol}://${headersList.get('host')}`

  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/login`,
  })

  // Keep the message generic so we don't reveal whether the email exists.
  return { message: "If an account exists for that email, we've sent a reset link." }
}
