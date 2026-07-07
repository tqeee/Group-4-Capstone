import { listUsers } from './actions';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const result = await listUsers();

  return <UsersClient users={result.users ?? []} loadError={result.error ?? null} />;
}
