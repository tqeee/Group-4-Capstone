import LoginClient from './LoginClient';

// Server wrapper so the page can read the ?timeout=1 flag set when an idle
// session is ended — same shape as the forgot-password page's ?error= wrapper.
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <LoginClient timedOut={params?.timeout === '1'} />;
}
