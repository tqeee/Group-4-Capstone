import { listUsers } from './actions'
import UsersClient from './UsersClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const result = await listUsers()

  return <UsersClient users={result.users ?? []} loadError={result.error ?? null} />
}
