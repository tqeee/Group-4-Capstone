import { notFound } from 'next/navigation';
import DebugUsersClient from './DebugUsersClient';
import { getDebugSnapshot } from './actions';

// Dev-only tool: the server actions already refuse to run in production, but
// the page itself should not exist there either.
export const dynamic = 'force-dynamic';

export default async function DebugUsersPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const snapshot = await getDebugSnapshot();
  const failed = 'error' in snapshot;

  return (
    <DebugUsersClient
      snapshot={failed ? null : snapshot}
      error={failed ? snapshot.error : null}
    />
  );
}
