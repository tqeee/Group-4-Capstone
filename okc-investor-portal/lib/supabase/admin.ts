import { createClient } from '@supabase/supabase-js'

// Uses the service-role key to call Supabase's Admin API (e.g. auth.admin.createUser).
// Never import this from a 'use client' file or expose the key via NEXT_PUBLIC_*.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env (Supabase dashboard > Project Settings > API) to use the admin client.'
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
