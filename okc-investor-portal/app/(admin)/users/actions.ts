'use server'
 
import { randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { normalizeRole, ROLES, type Role } from '@/lib/auth/roles'
import {
  getLockoutState,
  lockedOutEmails,
  LOCKOUT_CLEARED_ACTION,
} from '@/lib/auth/lockout'
import { sendCredentialsEmail } from '@/lib/email'
import { getSiteOrigin } from '@/lib/site-url'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'
import { getInvestorsDirectory } from '@/lib/queries'
 
const DB_ROLE = {
  investor: 'INVESTOR',
  operations: 'OPERATIONS',
  admin: 'ADMIN',
  'portfolio-manager': 'PORTFOLIO_MANAGER',
} as const
 
export type InviteUserState =
  | { status: 'success'; message: string }
  // Account was created but the email couldn't be sent; surface the
  // credentials so the admin can pass them on manually.
  | { status: 'warning'; message: string; credentials: { email: string; password: string } }
  | { status: 'error'; message: string }
  | undefined
 
// Unambiguous charset (no 0/O, 1/l/I) so hand-typed temporary passwords work.
const PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
 
function generateTemporaryPassword(length = 14): string {
  let password = ''
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARSET[randomInt(PASSWORD_CHARSET.length)]
  }
  return password
}
 
export async function inviteUser(
  _prevState: InviteUserState,
  formData: FormData
): Promise<InviteUserState> {
  const auth = await requireRole('admin')
  if (!auth.ok) {
    return { status: 'error', message: auth.message }
  }
 
  const email = formData.get('email')
  const roleInput = formData.get('role')
  const name = formData.get('name')
 
  if (typeof email !== 'string' || !email.includes('@')) {
    return { status: 'error', message: 'Please enter a valid email address.' }
  }
 
  if (typeof name !== 'string' || name.trim().length < 2) {
    return { status: 'error', message: 'Please enter the user\'s full name.' }
  }
 
  if (typeof roleInput !== 'string' || !ROLES.includes(roleInput as Role)) {
    return { status: 'error', message: 'Please choose a valid role.' }
  }
  const role = roleInput as Role
 
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to create admin client.',
    }
  }
 
  const password = generateTemporaryPassword()
 
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, must_change_password: true },
    user_metadata: { name: name.trim() },
  })
 
  if (createError) {
    return {
      status: 'error',
      message:
        createError.code === 'email_exists'
          ? 'A user with this email already exists.'
          : createError.message,
    }
  }
 
  // Portal profile (dataset 5.1): invitation-based onboarding record.
  await prisma.investor.upsert({
    where: { email: email.toLowerCase() },
    update: { authUserId: created.user?.id, name: name.trim(), role: DB_ROLE[role] },
    create: {
      email: email.toLowerCase(),
      name: name.trim(),
      role: DB_ROLE[role],
      authUserId: created.user?.id,
    },
  })
 
  await audit('USER_INVITED', {
    actor: auth.email,
    detail: `${name.trim()} <${email}> as ${role}`,
  })
 
  revalidatePath('/users')
 
  const loginUrl = `${await getSiteOrigin()}/login`
 
  const emailResult = await sendCredentialsEmail({ to: email, password, loginUrl })
 
  if (!emailResult.sent) {
    return {
      status: 'warning',
      message: `Account created, but the email could not be sent: ${emailResult.reason} Share these credentials with the user securely.`,
      credentials: { email, password },
    }
  }
 
  return {
    status: 'success',
    message: `Account created. Credentials were emailed to ${email}.`,
  }
}
 
export type SetUserStatusState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined
 
// Disable (ban) or re-enable an account. Banning blocks new sign-ins; live
// sessions are cut off by the proxy, which checks `banned_until` on every
// request (GoTrue itself keeps validating already-issued tokens).
export async function setUserStatus(
  _prevState: SetUserStatusState,
  formData: FormData
): Promise<SetUserStatusState> {
  const auth = await requireRole('admin')
  if (!auth.ok) {
    return { status: 'error', message: auth.message }
  }
 
  const userId = formData.get('userId')
  const disable = formData.get('disable') === 'true'
 
  if (typeof userId !== 'string' || !userId) {
    return { status: 'error', message: 'Missing user id.' }
  }
 
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to create admin client.',
    }
  }
 
  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId)
  if (lookupError || !target.user) {
    return { status: 'error', message: 'User not found.' }
  }
 
  if (target.user.email?.toLowerCase() === auth.email.toLowerCase()) {
    return { status: 'error', message: 'You cannot disable your own account.' }
  }
 
  const { error } = await admin.auth.admin.updateUserById(userId, {
    // GoTrue has no permanent flag — a far-future ban is the standard way.
    ban_duration: disable ? '87600h' : 'none',
  })
 
  if (error) {
    return { status: 'error', message: error.message }
  }
 
  await audit(disable ? 'USER_DISABLED' : 'USER_ENABLED', {
    actor: auth.email,
    detail: target.user.email ?? userId,
  })
 
  revalidatePath('/users')
  return {
    status: 'success',
    message: `${target.user.email ?? 'User'} has been ${disable ? 'disabled' : 're-enabled'}.`,
  }
}
 
export type ResetUserMfaState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined
 
// Clear a user's enrolled authenticator(s).
//
// This is the account-recovery escape hatch for a user who has lost their
// authenticator device. Supabase refuses to change the password of an
// MFA-enabled account from an AAL1 session, and a password-recovery email only
// ever produces AAL1 — so without their device the user cannot self-serve at
// all. Supabase ships no backup/recovery codes, so an administrator clearing
// the factor is the only way back in.
//
// Deliberately does NOT touch the password: this restores the user's ability to
// complete a normal reset, it doesn't hand anyone an account. After this the
// user signs in with their password alone and re-enrols at /mfa/setup.
export async function resetUserMfa(
  _prevState: ResetUserMfaState,
  formData: FormData
): Promise<ResetUserMfaState> {
  const auth = await requireRole('admin')
  if (!auth.ok) {
    return { status: 'error', message: auth.message }
  }
 
  const userId = formData.get('userId')
  if (typeof userId !== 'string' || !userId) {
    return { status: 'error', message: 'Missing user id.' }
  }
 
  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to create admin client.',
    }
  }
 
  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId)
  if (lookupError || !target.user) {
    return { status: 'error', message: 'User not found.' }
  }
 
  // admin.mfa is marked experimental in supabase-js but is verified working
  // against this project (list + delete round-tripped on a throwaway user).
  const { data: listed, error: listError } = await admin.auth.admin.mfa.listFactors({ userId })
  if (listError) {
    return { status: 'error', message: `Could not read the user's factors: ${listError.message}` }
  }
 
  if (listed.factors.length === 0) {
    return {
      status: 'error',
      message: `${target.user.email ?? 'This user'} has no authenticator enrolled.`,
    }
  }
 
  for (const factor of listed.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id })
    if (error) {
      return { status: 'error', message: `Could not remove the authenticator: ${error.message}` }
    }
  }
 
  await audit('USER_MFA_RESET', {
    actor: auth.email,
    detail: `${target.user.email ?? userId} (${listed.factors.length} factor(s) removed)`,
  })
 
  revalidatePath('/users')
  return {
    status: 'success',
    message: `Two-factor authentication cleared for ${target.user.email ?? 'user'}. They can sign in with their password and re-enrol.`,
  }
}
 
export type UnlockUserState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

// Clear a sign-in lockout (see lib/auth/lockout.ts).
//
// Without this the only way out of a lockout is to wait for the window to
// roll, which means anyone who knows a user's email can keep that account
// locked indefinitely — five bad guesses every fifteen minutes, forever. This
// is the override for that, and for the ordinary case of a user who simply
// mistyped their password five times and cannot wait.
//
// It does NOT touch the password or the account's enabled state: it only
// resets the counter, so the user still has to sign in with credentials they
// know. Nothing is deleted either — the failures stay in the audit log and
// this writes its own rows on top (see below).
export async function unlockUserAccount(
  _prevState: UnlockUserState,
  formData: FormData
): Promise<UnlockUserState> {
  const auth = await requireRole('admin')
  if (!auth.ok) {
    return { status: 'error', message: auth.message }
  }

  const userId = formData.get('userId')
  if (typeof userId !== 'string' || !userId) {
    return { status: 'error', message: 'Missing user id.' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return {
      status: 'error',
      message: err instanceof Error ? err.message : 'Failed to create admin client.',
    }
  }

  // Resolve the email from the user id server-side rather than accepting one
  // posted by the client: the marker row written below is what unlocks an
  // account, so trusting a caller-supplied address would turn this into an
  // unlock-any-email primitive.
  const { data: target, error: lookupError } = await admin.auth.admin.getUserById(userId)
  if (lookupError || !target.user?.email) {
    return { status: 'error', message: 'User not found.' }
  }
  const email = target.user.email.toLowerCase()

  const { locked, failures } = await getLockoutState(email)
  if (!locked) {
    return { status: 'error', message: `${target.user.email} is not locked out.` }
  }

  // Two rows on purpose — these are two different facts, and each is the one
  // a different reader will search for:
  //  1. the login-state event, keyed on the ACCOUNT like LOGIN_FAILED /
  //     LOGIN_SUCCESS / LOGIN_LOCKED. This is also the marker getLockoutState()
  //     reads, so writing it IS the reset;
  //  2. the admin-action event, keyed on the ADMIN like USER_DISABLED /
  //     USER_MFA_RESET, so "what did this administrator do" stays answerable.
  await audit(LOCKOUT_CLEARED_ACTION, {
    actor: email,
    detail: `${failures} failed sign-in attempt(s) cleared by ${auth.email}`,
  })
  await audit('USER_UNLOCKED', {
    actor: auth.email,
    detail: `${target.user.email} (${failures} failed sign-in attempt(s))`,
  })

  revalidatePath('/users')
  return {
    status: 'success',
    message: `Sign-in lockout cleared for ${target.user.email}. They can try again now.`,
  }
}

export type PortalUser = {
  id: string
  email: string
  name: string | null
  role: Role
  status: 'Active' | 'Invited' | 'Disabled'
  createdAt: string
  lastSignInAt: string | null
  hasMfa: boolean
  // Sign-in lockout state (lib/auth/lockout.ts). Independent of `status`:
  // a locked account is still "Active" as far as Supabase is concerned —
  // it is our own login gate refusing it, not a GoTrue ban.
  lockedOut: boolean
  failedAttempts: number
  // Investor-profile fields (dataset 5.1 / ledger-derived) — only populated
  // for role === 'investor'. Powers the "View Profile" button + portfolio
  // value column, reusing the same read model as the Operations Investors
  // directory (lib/queries.ts#getInvestorsDirectory) rather than duplicating
  // the portfolio-value calculation here.
  investorId: string | null
  onboardingDate: string | null
  portfolioValue: number | null
}
 
function userStatus(user: {
  banned_until?: string
  app_metadata: { must_change_password?: boolean } & Record<string, unknown>
}): PortalUser['status'] {
  if (user.banned_until && new Date(user.banned_until) > new Date()) {
    return 'Disabled'
  }
  // Still on the temporary password until the first-login flag clears.
  return user.app_metadata?.must_change_password === true ? 'Invited' : 'Active'
}
 
export async function listUsers(): Promise<
  { users: PortalUser[]; error?: never } | { users?: never; error: string }
> {
  const auth = await requireRole('admin')
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
 
  // Join in portal profile names (dataset 5.1), and — separately — full
  // investor directory rows (id/onboarding/portfolio value) so the table can
  // offer the same "View Profile" panel Operations has, without duplicating
  // the portfolio-value calculation. getInvestorsDirectory() returns every
  // profile (not just role=investor), but only investor rows have a
  // meaningful non-zero portfolio value; the client only renders the button
  // for role === 'investor' regardless.
  //
  // Lockouts come along for the ride: one grouped query for every locked
  // email, so the table can show the state and offer "Unlock" per row.
  const [profiles, investorDirectory, lockouts] = await Promise.all([
    prisma.investor.findMany({ select: { email: true, name: true } }),
    getInvestorsDirectory(),
    lockedOutEmails(),
  ])
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.name]))
  const investorByEmail = new Map(investorDirectory.map((i) => [i.email.toLowerCase(), i]))
 
  // Which accounts have an authenticator, so the row can offer "Reset 2FA".
  // listUsers() does NOT return `factors`, and calling admin.mfa.listFactors
  // per user would be one request each — so read the GoTrue table directly in
  // a single query. Read-only, and tolerated failing: MFA state is a nice-to-
  // have on this page, not worth 500ing the whole user list over.
  let mfaUserIds = new Set<string>()
  try {
    const rows = await prisma.$queryRaw<{ user_id: string }[]>`
      SELECT DISTINCT user_id::text AS user_id FROM auth.mfa_factors WHERE status = 'verified'
    `
    mfaUserIds = new Set(rows.map((r) => r.user_id))
  } catch {
    // Leave every row without the reset affordance rather than break the page.
  }
 
  return {
    users: data.users.map((user) => {
      const emailKey = user.email?.toLowerCase() ?? ''
      const investorRow = investorByEmail.get(emailKey)
      return {
        id: user.id,
        email: user.email ?? '(no email)',
        name:
          nameByEmail.get(emailKey) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        role: normalizeRole(user.app_metadata?.role),
        status: userStatus(user),
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at ?? null,
        hasMfa: mfaUserIds.has(user.id),
        lockedOut: lockouts.has(emailKey),
        failedAttempts: lockouts.get(emailKey) ?? 0,
        investorId: investorRow?.id ?? null,
        onboardingDate: investorRow?.onboardingDate ?? null,
        portfolioValue: investorRow?.portfolioValue ?? null,
      }
    }),
  }
}
