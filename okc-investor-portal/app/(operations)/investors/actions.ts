'use server'
 
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { normalizeRole, type Role } from '@/lib/auth/roles'
import { prisma } from '@/lib/db'
import { getInvestorsDirectory } from '@/lib/queries'
 
export type OperationsAccount = {
  id: string
  email: string
  name: string | null
  role: Role
  status: 'Active' | 'Invited' | 'Disabled'
  createdAt: string
  lastSignInAt: string | null
  // Ledger-derived profile fields (only meaningful for role === 'investor'),
  // joined in from the same read model Admin's Users page and PM's Investors
  // page both use (lib/queries.ts#getInvestorsDirectory) — powers the "View
  // Profile" panel + Portfolio Value column.
  investorId: string | null
  onboardingDate: string | null
  portfolioValue: number | null
}
 
function accountStatus(user: {
  banned_until?: string
  app_metadata: { must_change_password?: boolean } & Record<string, unknown>
}): OperationsAccount['status'] {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return 'Disabled'
  }
  return user.app_metadata?.must_change_password === true ? 'Invited' : 'Active'
}
 
// Read-only account directory for Operations — same shape/layout as Admin's
// Users page (all roles, filterable, portfolio value + View Profile), but
// with no management actions (no invite, no disable, no 2FA reset). Those
// stay Admin-only; this is view access, self-contained under (operations).
export async function listAccountsForOperations(): Promise<
  { accounts: OperationsAccount[]; error?: never } | { accounts?: never; error: string }
> {
  const auth = await requireRole('operations')
  if (!auth.ok) {
    return { error: auth.message }
  }
 
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to create admin client.' }
  }
 
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
 
  if (error) {
    return { error: error.message }
  }
 
  const [profiles, investorDirectory] = await Promise.all([
    prisma.investor.findMany({ select: { email: true, name: true } }),
    getInvestorsDirectory(),
  ])
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.name]))
  const investorByEmail = new Map(investorDirectory.map((i) => [i.email.toLowerCase(), i]))
 
  return {
    accounts: data.users.map((user) => {
      const investorRow = investorByEmail.get(user.email?.toLowerCase() ?? '')
      return {
        id: user.id,
        email: user.email ?? '(no email)',
        name:
          nameByEmail.get(user.email?.toLowerCase() ?? '') ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        role: normalizeRole(user.app_metadata?.role),
        status: accountStatus(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        investorId: investorRow?.id ?? null,
        onboardingDate: investorRow?.onboardingDate ?? null,
        portfolioValue: investorRow?.portfolioValue ?? null,
      }
    }),
  }
}