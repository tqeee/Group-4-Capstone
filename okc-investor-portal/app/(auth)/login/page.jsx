import { cookies } from 'next/headers';
import { CONCURRENT_KICK_COOKIE } from '@/lib/auth/session-guard';
import LoginClient from './LoginClient';

// Server wrapper so the page can read the ?timeout=1 / ?concurrent=1 flags set
// when a session is ended by the proxy — same shape as the forgot-password
// page's ?error= wrapper.
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  // The query string can be lost when the redirect is hit during a Next.js
  // client-side navigation rather than a hard reload — see
  // CONCURRENT_KICK_COOKIE. Trust either signal.
  const signedInElsewhere =
    params?.concurrent === '1' || cookieStore.get(CONCURRENT_KICK_COOKIE)?.value === '1';
  return (
    <LoginClient
      timedOut={params?.timeout === '1'}
      signedInElsewhere={signedInElsewhere}
    />
  );
}
