import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RESET_TOKEN_COOKIE } from '@/lib/auth/recovery';
import { lookupResetLink } from '@/lib/auth/reset-link';
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
  const user = userData?.user ?? null;

  // Reset mode: arrived from an email link whose token is deliberately still
  // unspent, so there is no session yet. The account is identified from the
  // token itself, and re-checked on every render — a cookie that has aged out
  // of its window stops working here, not just at the next submit.
  if (!user) {
    const tokenHash = (await cookies()).get(RESET_TOKEN_COOKIE)?.value;
    const link = await lookupResetLink(tokenHash);

    if (link.status !== 'valid') {
      redirect(`/forgot-password?error=${link.status === 'expired' ? 'expired' : 'link'}`);
    }

    // The TOTP challenge can't run yet — it needs a session, and the session
    // only exists once the token is redeemed. So an MFA account is challenged
    // after its first submit instead; changePassword() returns needsMfa and the
    // client drops back to the challenge. See actions.ts.
    return <ChangePasswordClient needsMfa={false} accountEmail={link.email} />;
  }

  const hasVerifiedFactor =
    user.factors?.some(factor => factor.status === 'verified') ?? false;
  const needsMfa = hasVerifiedFactor && claimsData?.claims?.aal !== 'aal2';

  return <ChangePasswordClient needsMfa={needsMfa} accountEmail={user.email ?? null} />;
}
