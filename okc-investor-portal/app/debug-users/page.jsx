import { notFound } from 'next/navigation';
import DebugUsersClient from './DebugUsersClient';

// Dev-only tool: the server actions already refuse to run in production, but
// the page itself should not exist there either.
export default function DebugUsersPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DebugUsersClient />;
}
