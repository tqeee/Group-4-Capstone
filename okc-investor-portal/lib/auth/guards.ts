import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeRole, ROLE_HOME, type Role } from '@/lib/auth/roles'

export type GuardResult =
  | { ok: true; email: string; role: Role }
  | { ok: false; message: string }

// Server-action guard: the proxy already gates page access by role, but every
// mutating action re-checks the caller's JWT so actions can't be invoked
// cross-role.
export async function requireRole(...allowed: Role[]): Promise<GuardResult> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.email) {
    return { ok: false, message: 'Your session has expired. Please sign in again.' }
  }
  const role = normalizeRole(claims.app_metadata?.role)
  if (!allowed.includes(role)) {
    return { ok: false, message: 'You do not have permission to perform this action.' }
  }
  return { ok: true, email: claims.email, role }
}

// Layout guard: the proxy is the primary gate, but each route group's server
// layout re-checks the signature-verified JWT claims so its pages can never
// render for the wrong role. Redirects instead of returning an error.
export async function requireRoleForPage(
  required: Role
): Promise<{ email: string | null; role: Role }> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims) {
    redirect('/login')
  }
  const role = normalizeRole(claims.app_metadata?.role)
  if (role !== required) {
    redirect(ROLE_HOME[role])
  }
  return { email: claims.email ?? null, role }
}
