'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { createClient } from '@/lib/supabase/client';
import { logMfaEvent } from '@/app/(auth)/mfa/actions';
import { changePassword } from './actions';

// Supabase refuses updateUser({ password }) with 401 insufficient_aal when the
// account has a verified authenticator and the session is only AAL1 — which is
// exactly what a password-recovery link produces. So when the server tells us
// the session still needs a second factor, the password form is gated behind a
// TOTP challenge that elevates this session to AAL2 first.
//
// The challenge runs browser-to-Supabase directly (same as /mfa); only the
// audit trail goes through the server.
export default function ChangePasswordClient({ needsMfa }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, isPending] = useActionState(changePassword, undefined);

  const [mfaCleared, setMfaCleared] = useState(!needsMfa);
  const [code, setCode] = useState('');
  const [mfaError, setMfaError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  // If the session loses AAL2 between the challenge and the submit (expiry, or
  // a stale tab), the action says so and we drop back to the challenge.
  // Adjusted during render rather than in an effect, per the pattern used in
  // UsersClient — see https://react.dev/learn/you-might-not-need-an-effect.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.needsMfa) setMfaCleared(false);
  }

  async function verify(e) {
    e.preventDefault();
    if (code.length < 6) return;
    setVerifying(true);
    setMfaError(null);

    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.find(f => f.status === 'verified');
    if (listError || !totp) {
      setMfaError('No authenticator is enrolled on this account. Please sign in again.');
      setVerifying(false);
      return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: totp.id, code });
    if (error) {
      await logMfaEvent('MFA_VERIFY_FAILED', error.message);
      setMfaError('That code was not accepted. Check your authenticator app and try again.');
      setCode('');
      setVerifying(false);
      return;
    }

    await logMfaEvent('MFA_VERIFIED');
    setMfaCleared(true);
    setVerifying(false);
    // Re-run the server component so it re-reads the now-AAL2 session.
    router.refresh();
  }

  return (
    <main className="flex min-h-screen">

      <AuthBrandPanel />

      {/* RIGHT PANEL */}
      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-[clamp(2rem,5vw,6rem)]">
        <div className="w-full max-w-xl">

          {!mfaCleared ? (
            <>
              <h2 className="mb-[clamp(0.5rem,1vw,1rem)] text-[clamp(1.75rem,3vw,3rem)] font-bold leading-tight text-[#071437]">
                Verify it&apos;s you
              </h2>

              <p className="mb-[clamp(2rem,3vw,3.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-[#6b7894]">
                This account is protected by two-factor authentication. Enter the
                6-digit code from your authenticator app to continue to setting a
                new password.
              </p>

              <form onSubmit={verify}>
                <label htmlFor="code" className="auth-label">
                  Authentication code
                </label>
                <input
                  id="code"
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="auth-input mb-[clamp(1.5rem,2.5vw,2.5rem)] text-center tracking-[0.4em]"
                />

                {mfaError && (
                  <p className="auth-status-message status-error mb-[clamp(1rem,1.5vw,1.5rem)]">
                    {mfaError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifying || code.length < 6}
                  className="auth-button-primary"
                >
                  {verifying ? 'Verifying…' : 'Verify and continue'}
                </button>
              </form>

              <p className="mt-[clamp(2rem,3vw,3rem)] text-center text-[clamp(0.875rem,0.95vw,1.125rem)] leading-relaxed text-[#7c8aa5]">
                Lost your authenticator? Contact your portal administrator to have
                it reset.
              </p>
            </>
          ) : (
            <>
              <h2 className="mb-[clamp(0.5rem,1vw,1rem)] text-[clamp(1.75rem,3vw,3rem)] font-bold leading-tight text-[#071437]">
                Set a new password
              </h2>

              <p className="mb-[clamp(2rem,3vw,3.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-[#6b7894]">
                Choose a new password to secure your account before continuing.
                Any other signed-in sessions will be logged out.
              </p>

              <form action={formAction}>

                {/* New password */}
                <div className="mb-[clamp(1.25rem,2vw,2rem)]">
                  <label htmlFor="password" className="auth-label">
                    New password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Enter your new password"
                    className="auth-input"
                  />
                </div>

                {/* Confirm password */}
                <div className="mb-[clamp(1.5rem,2.5vw,2.5rem)]">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    placeholder="Re-enter your new password"
                    className="auth-input"
                  />
                </div>

                {/* Error message */}
                {state?.error && (
                  <p className="auth-status-message status-error mb-[clamp(1rem,1.5vw,1.5rem)]">
                    {state.error}
                  </p>
                )}

                <button type="submit" disabled={isPending} className="auth-button-primary">
                  {isPending ? 'Saving…' : 'Save password and continue'}
                </button>

              </form>

              <p className="mt-[clamp(2rem,3vw,3rem)] text-center text-[clamp(0.875rem,0.95vw,1.125rem)] leading-relaxed text-[#7c8aa5]">
                You&apos;ll be taken to your dashboard once your password is updated.
              </p>
            </>
          )}

        </div>
      </section>
    </main>
  );
}
