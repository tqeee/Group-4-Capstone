import { createClient } from '@/lib/supabase/server';
import ChangePasswordClient from './ChangePasswordClient';

// Reads the live session on every request to decide whether a TOTP step is
// needed before the password form.
export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const supabase = await createClient();

  // Derive the MFA state from the Auth-server-verified user (factors) plus the
  // signature-verified claims (aal). Never mfa.getAuthenticatorAssuranceLevel()
  // server-side — it reads the stored session and trips the supabase-js
  // "could be insecure" warning.
  const [{ data: userData }, { data: claimsData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getClaims(),
  ]);

  const hasVerifiedFactor =
    userData?.user?.factors?.some(factor => factor.status === 'verified') ?? false;
  const needsMfa = hasVerifiedFactor && claimsData?.claims?.aal !== 'aal2';

  return <ChangePasswordClient needsMfa={needsMfa} />;
}
