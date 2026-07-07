'use server'

import { randomInt } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRole } from '@/lib/auth/guards'
import { normalizeRole, ROLES, type Role } from '@/lib/auth/roles'
import { sendCredentialsEmail } from '@/lib/email'
import { getSiteOrigin } from '@/lib/site-url'
import { prisma } from '@/lib/db'
import { audit } from '@/lib/audit'

const DB_ROLE = { investor: 'INVESTOR', operations: 'OPERATIONS', admin: 'ADMIN' } as const

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
    return { status: 'error', message: 'Please enter the user’s full name.' }
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

export type PortalUser = {
  id: string
  email: string
  name: string | null
  role: Role
  status: 'Active' | 'Invited' | 'Disabled'
  createdAt: string
  lastSignInAt: string | null
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

  // Join in portal profile names (dataset 5.1).
  const profiles = await prisma.investor.findMany({ select: { email: true, name: true } })
  const nameByEmail = new Map(profiles.map((p) => [p.email, p.name]))

  return {
    users: data.users.map((user) => ({
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
    })),
  }
}
