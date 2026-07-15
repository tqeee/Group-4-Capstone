'use server'

import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'

// Audit hook for MFA events that happen client-side (the TOTP exchange runs
// directly between the browser and Supabase, so the server only logs them).
const ALLOWED = new Set([
  'MFA_VERIFIED',
  'MFA_VERIFY_FAILED',
  'MFA_ENROLLED',
  'MFA_UNENROLLED',
])

export async function logMfaEvent(action: string, detail?: string) {
  if (!ALLOWED.has(action)) return
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  await audit(action, {
    actor: data?.claims?.email ?? null,
    detail,
    success: !action.endsWith('_FAILED'),
  })
}
