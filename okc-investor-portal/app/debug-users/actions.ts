'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'
import { normalizeRole } from '@/lib/auth/roles'
import type { Prisma } from '@/generated/prisma/client'

// Nothing in this file writes an AuditLog row. That is deliberate: this page
// exists to clean up after testing, and logging the cleanup would be the main
// thing generating rows to clean up.

export type ActionState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

export type CreateUserState = ActionState
export type DeleteAllUsersState = ActionState

const PRODUCTION_REFUSAL = {
  status: 'error' as const,
  message: 'This debug tool is disabled in production.',
}

function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function adminOrError() {
  try {
    return { admin: createAdminClient(), error: null as null | string }
  } catch (err) {
    return {
      admin: null,
      error: err instanceof Error ? err.message : 'Failed to create admin client.',
    }
  }
}

// ---------------------------------------------------------------- listing

export type DebugAccount = {
  key: string
  email: string
  name: string | null
  role: string
  authUserId: string | null
  investorId: string | null
  isCurrentUser: boolean
  lastSignInAt: string | null
  counts: { flows: number; ledger: number; preferences: number }
}

export type DebugSnapshot = {
  projectRef: string
  currentEmail: string | null
  accounts: DebugAccount[]
  logs: { total: number; login: number; user: number; flow: number; olderThan24h: number }
}

// The two sides are joined on EMAIL, not authUserId, because that is what the
// on_auth_user_synced trigger keys on — and because a profile whose login was
// deleted has authUserId NULL but keeps its email, which is exactly the row
// this page needs to show.
export async function getDebugSnapshot(): Promise<DebugSnapshot | { error: string }> {
  if (isProduction()) return { error: PRODUCTION_REFUSAL.message }

  const { admin, error } = adminOrError()
  if (!admin) return { error: error! }

  let currentEmail: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getClaims()
    currentEmail = (data?.claims?.email as string | undefined) ?? null
  } catch {
    // Not being signed in is normal here — the page is reachable signed out.
  }

  const authUsers: { id: string; email: string; role: string; lastSignInAt: string | null }[] = []
  for (let page = 1; ; page++) {
    const { data, error: listError } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (listError) return { error: `Failed to list users: ${listError.message}` }
    if (data.users.length === 0) break
    for (const u of data.users) {
      authUsers.push({
        id: u.id,
        email: (u.email ?? '').toLowerCase(),
        role: normalizeRole(u.app_metadata?.role),
        lastSignInAt: u.last_sign_in_at ?? null,
      })
    }
    if (data.users.length < 200) break
  }

  const [profiles, flowCounts, ledgerCounts, prefCounts, logStats] = await Promise.all([
    prisma.investor.findMany({
      select: { id: true, email: true, name: true, role: true, authUserId: true },
    }),
    prisma.fundFlow.groupBy({ by: ['investorId'], _count: { _all: true } }),
    prisma.investorDailyLedger.groupBy({ by: ['investorId'], _count: { _all: true } }),
    prisma.investorFundPreference.groupBy({ by: ['investorId'], _count: { _all: true } }),
    auditLogStats(),
  ])

  const countFor = (
    rows: { investorId: string; _count: { _all: number } }[],
    investorId: string | null
  ) => (investorId ? (rows.find(r => r.investorId === investorId)?._count._all ?? 0) : 0)

  const byEmail = new Map<string, DebugAccount>()

  for (const u of authUsers) {
    byEmail.set(u.email, {
      key: u.email,
      email: u.email,
      name: null,
      role: u.role,
      authUserId: u.id,
      investorId: null,
      isCurrentUser: currentEmail?.toLowerCase() === u.email,
      lastSignInAt: u.lastSignInAt,
      counts: { flows: 0, ledger: 0, preferences: 0 },
    })
  }

  for (const p of profiles) {
    const email = p.email.toLowerCase()
    const existing = byEmail.get(email)
    const counts = {
      flows: countFor(flowCounts, p.id),
      ledger: countFor(ledgerCounts, p.id),
      preferences: countFor(prefCounts, p.id),
    }
    if (existing) {
      existing.name = p.name
      existing.investorId = p.id
      existing.counts = counts
    } else {
      byEmail.set(email, {
        key: email,
        email,
        name: p.name,
        role: p.role.toLowerCase().replace('_', '-'),
        authUserId: null,
        investorId: p.id,
        isCurrentUser: false,
        lastSignInAt: null,
        counts,
      })
    }
  }

  const accounts = [...byEmail.values()].sort((a, b) => a.email.localeCompare(b.email))
  const projectRef =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, '').split('.')[0] ?? 'unknown'

  return { projectRef, currentEmail, accounts, logs: logStats }
}

async function auditLogStats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const [total, login, user, flow, olderThan24h] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { action: { startsWith: 'LOGIN' } } }),
    prisma.auditLog.count({ where: { action: { startsWith: 'USER' } } }),
    prisma.auditLog.count({ where: { action: { startsWith: 'FLOW' } } }),
    prisma.auditLog.count({ where: { createdAt: { lt: since } } }),
  ])
  return { total, login, user, flow, olderThan24h }
}

// ---------------------------------------------------------------- create

export async function createDebugUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  if (isProduction()) return PRODUCTION_REFUSAL

  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || !email) {
    return { status: 'error', message: 'Email is required.' }
  }
  if (typeof password !== 'string' || password.length < 6) {
    return { status: 'error', message: 'Password must be at least 6 characters.' }
  }

  const { admin, error } = adminOrError()
  if (!admin) return { status: 'error', message: error! }

  const role = normalizeRole(formData.get('role'))
  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  })
  if (createError) return { status: 'error', message: createError.message }

  revalidatePath('/debug-users')
  return { status: 'success', message: `Created ${role} user ${data.user?.email} (${data.user?.id})` }
}

// ---------------------------------------------------------------- delete

// Two modes, posted by whichever submit button was clicked:
//   login — remove the Supabase auth user only. The on_auth_user_unlinked
//           trigger sets investors.authUserId = NULL rather than deleting, so
//           all financial history survives and recreating the same email
//           re-adopts it (on_auth_user_synced upserts keyed on email).
//   purge — the above plus every row the profile owns, deleted in FK-safe
//           order. No onDelete: Cascade exists anywhere in the schema, so the
//           order here is load-bearing.
export async function deleteAccounts(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (isProduction()) return PRODUCTION_REFUSAL

  const mode = formData.get('mode')
  if (mode !== 'login' && mode !== 'purge') {
    return { status: 'error', message: 'Invalid delete mode.' }
  }

  const selected = formData.getAll('selected').filter((v): v is string => typeof v === 'string')
  if (selected.length === 0) {
    return { status: 'error', message: 'Select at least one account.' }
  }

  const snapshot = await getDebugSnapshot()
  if ('error' in snapshot) return { status: 'error', message: snapshot.error }

  const targets = snapshot.accounts.filter(a => selected.includes(a.key))
  if (targets.length === 0) {
    return { status: 'error', message: 'None of the selected accounts still exist.' }
  }

  const protectedTargets = targets.filter(a => a.isCurrentUser)
  if (protectedTargets.length > 0) {
    return {
      status: 'error',
      message: `Refusing to delete ${protectedTargets[0].email} — you are signed in as it. Sign out first, or delete it from another account.`,
    }
  }

  const { admin, error } = adminOrError()
  if (!admin) return { status: 'error', message: error! }

  let loginsDeleted = 0
  let profilesDeleted = 0
  let rowsDeleted = 0
  const affectedFunds = new Set<string>()
  const failures: string[] = []

  for (const account of targets) {
    try {
      if (mode === 'purge' && account.investorId) {
        const investorId = account.investorId

        const [flowFunds, ledgerFunds] = await Promise.all([
          prisma.fundFlow.findMany({
            where: { investorId },
            select: { fundId: true },
            distinct: ['fundId'],
          }),
          prisma.investorDailyLedger.findMany({
            where: { investorId },
            select: { fundId: true },
            distinct: ['fundId'],
          }),
        ])
        for (const f of [...flowFunds, ...ledgerFunds]) affectedFunds.add(f.fundId)

        // One transaction so a mid-way FK failure leaves the account intact
        // rather than half-deleted.
        const [prefs, ledger, flows] = await prisma.$transaction([
          prisma.investorFundPreference.deleteMany({ where: { investorId } }),
          prisma.investorDailyLedger.deleteMany({ where: { investorId } }),
          prisma.fundFlow.deleteMany({ where: { investorId } }),
          prisma.investor.delete({ where: { id: investorId } }),
        ])
        rowsDeleted += prefs.count + ledger.count + flows.count
        profilesDeleted++
      }

      // Auth user last: if the purge above throws, the login still works and
      // the account is recoverable rather than stranded.
      if (account.authUserId) {
        const { error: deleteError } = await admin.auth.admin.deleteUser(account.authUserId)
        if (deleteError) {
          failures.push(`${account.email}: ${deleteError.message}`)
          continue
        }
        loginsDeleted++
      }
    } catch (err) {
      failures.push(`${account.email}: ${err instanceof Error ? err.message : 'unknown error'}`)
    }
  }

  revalidatePath('/debug-users')

  const parts: string[] = []
  if (loginsDeleted) parts.push(`${loginsDeleted} login(s)`)
  if (profilesDeleted) parts.push(`${profilesDeleted} profile(s)`)
  if (rowsDeleted) parts.push(`${rowsDeleted} financial row(s)`)
  let message = parts.length ? `Deleted ${parts.join(', ')}.` : 'Nothing was deleted.'

  if (affectedFunds.size > 0) {
    message += ` ${affectedFunds.size} fund(s) had rows removed — run "npx tsx scripts/rebuild-ledgers.ts" so the remaining investors' shares are recomputed.`
  }
  if (failures.length > 0) {
    return { status: 'error', message: `${message} ${failures.length} failed: ${failures.join('; ')}` }
  }
  return { status: 'success', message }
}

// ---------------------------------------------------------------- logs

export async function clearAuditLogs(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  if (isProduction()) return PRODUCTION_REFUSAL

  const scope = formData.get('scope')
  if (typeof scope !== 'string') {
    return { status: 'error', message: 'Invalid scope.' }
  }

  let where: Prisma.AuditLogWhereInput | undefined
  let label: string

  switch (scope) {
    case 'all':
      where = undefined
      label = 'all audit log rows'
      break
    case 'LOGIN':
    case 'USER':
    case 'FLOW':
      where = { action: { startsWith: scope } }
      label = `${scope}* rows`
      break
    case 'older24h':
      where = { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      label = 'rows older than 24h'
      break
    default:
      return { status: 'error', message: `Unknown scope "${scope}".` }
  }

  try {
    const { count } = await prisma.auditLog.deleteMany(where ? { where } : undefined)
    revalidatePath('/debug-users')
    return { status: 'success', message: `Cleared ${count} ${label}.` }
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to clear audit logs.',
    }
  }
}
