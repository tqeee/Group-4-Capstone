'use server'
 
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { normalizeRole } from '@/lib/auth/roles'
import { prisma } from '@/lib/db'
import { getInvestorsDirectory } from '@/lib/queries'
 
export type PortfolioManagerInvestor = {
  id: string
  email: string
  name: string | null
  role: ReturnType<typeof normalizeRole>
  status: 'Active' | 'Invited' | 'Disabled'
  createdAt: string
  lastSignInAt: string | null
  // Ledger-derived profile fields, joined in from the same read model
  // Operations' Investors directory uses (lib/queries.ts#getInvestorsDirectory)
  // — powers the "View Profile" panel + Portfolio Value column.
  investorId: string | null
  onboardingDate: string | null
  portfolioValue: number | null
}
 
function userStatus(user: {
  banned_until?: string | null
  email_confirmed_at?: string | null
  last_sign_in_at?: string | null
}): 'Active' | 'Invited' | 'Disabled' {
  if (user.banned_until) return 'Disabled'
  if (!user.last_sign_in_at) return 'Invited'
  return 'Active'
}
 
// Read-only investor directory for Portfolio Manager. Self-contained under
// (portfolio-manager) — does not depend on or modify anything in (admin).
export async function listInvestorsForPortfolioManager(): Promise<
  { investors: PortfolioManagerInvestor[]; error?: never } | { investors?: never; error: string }
> {
  const auth = await requireRole('portfolio-manager')
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
 
  // Join in portal profile names (dataset 5.1), and the full investor
  // directory (id/onboarding/portfolio value) for the View Profile panel.
  const [profiles, investorDirectory] = await Promise.all([
    prisma.investor.findMany({ select: { email: true, name: true } }),
    getInvestorsDirectory(),
  ])
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.name]))
  const investorByEmail = new Map(investorDirectory.map((i) => [i.email.toLowerCase(), i]))
 
  const investors = data.users
    .map((user) => {
      const investorRow = investorByEmail.get(user.email?.toLowerCase() ?? '')
      return {
        id: user.id,
        email: user.email ?? '(no email)',
        name:
          nameByEmail.get(user.email?.toLowerCase() ?? '') ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        role: normalizeRole(user.app_metadata?.role),
        status: userStatus(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        investorId: investorRow?.id ?? null,
        onboardingDate: investorRow?.onboardingDate ?? null,
        portfolioValue: investorRow?.portfolioValue ?? null,
      }
    })
    // PM only needs visibility into investor accounts, not internal staff.
    .filter((u) => u.role === 'investor')
 
  return { investors }
}