'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeRole } from '@/lib/auth/roles'

export type CreateUserState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

export async function createDebugUser(
  _prevState: CreateUserState,
  formData: FormData
): Promise<CreateUserState> {
  if (process.env.NODE_ENV === 'production') {
    return { status: 'error', message: 'This debug tool is disabled in production.' }
  }

  const email = formData.get('email')
  const password = formData.get('password')

  if (typeof email !== 'string' || !email) {
    return { status: 'error', message: 'Email is required.' }
  }

  if (typeof password !== 'string' || password.length < 6) {
    return { status: 'error', message: 'Password must be at least 6 characters.' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Failed to create admin client.' }
  }

  const role = normalizeRole(formData.get('role'))

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role },
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  return { status: 'success', message: `Created ${role} user ${data.user?.email} (${data.user?.id})` }
}

export type DeleteAllUsersState =
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }
  | undefined

export async function deleteAllUsers(
  _prevState: DeleteAllUsersState
): Promise<DeleteAllUsersState> {
  if (process.env.NODE_ENV === 'production') {
    return { status: 'error', message: 'This debug tool is disabled in production.' }
  }

  let admin
  try {
    admin = createAdminClient()
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Failed to create admin client.' }
  }

  let deleted = 0
  const failures: string[] = []

  // Page through every user, deleting as we go, until a page comes back empty.
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })

    if (error) {
      return { status: 'error', message: `Failed to list users: ${error.message}` }
    }

    if (data.users.length === 0) break

    for (const user of data.users) {
      const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
      if (deleteError) {
        failures.push(`${user.email ?? user.id}: ${deleteError.message}`)
      } else {
        deleted++
      }
    }
  }

  if (failures.length > 0) {
    return {
      status: 'error',
      message: `Deleted ${deleted} user(s), but ${failures.length} failed: ${failures.join('; ')}`,
    }
  }

  return { status: 'success', message: `Deleted ${deleted} user(s).` }
}
