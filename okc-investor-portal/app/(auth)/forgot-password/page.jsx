import ForgotPasswordClient from './ForgotPasswordClient';

// Server wrapper so the page can read the ?error= flag set by /auth/confirm
// when a reset link is invalid or expired.
export default async function ForgotPasswordPage({ searchParams }) {
  const params = await searchParams;
  const error = params?.error;
  return (
    <ForgotPasswordClient
      linkError={error === 'link' || error === 'expired'}
      expired={error === 'expired'}
    />
  );
}
