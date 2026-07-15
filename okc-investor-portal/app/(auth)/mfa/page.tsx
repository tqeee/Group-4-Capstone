'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/(auth)/login/actions';
import { logMfaEvent } from './actions';

// TOTP challenge shown after password sign-in when the account has an
// enrolled authenticator. On success the session is upgraded to AAL2 and the
// proxy lets the user through to their dashboard.
export default function MfaChallengePage() {
  const supabase = useMemo(() => createClient(), []);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [noFactor, setNoFactor] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data, error }) => {
      const totp = data?.totp?.find(f => f.status === 'verified');
      if (error || !totp) setNoFactor(true);
      else setFactorId(totp.id);
    });
  }, [supabase]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId || code.length < 6) return;
    setVerifying(true);
    setError(null);

    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) {
      await logMfaEvent('MFA_VERIFY_FAILED', error.message);
      setError('That code was not accepted. Check your authenticator app and try again.');
      setCode('');
      setVerifying(false);
      return;
    }

    await logMfaEvent('MFA_VERIFIED');
    // Full navigation so the proxy re-reads the upgraded (AAL2) session and
    // routes to the correct role home.
    window.location.assign('/');
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-6">
      <section className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-10 shadow-xl">
        <div className="mb-8 flex items-end gap-3">
          <span className="text-4xl font-extrabold tracking-tight text-black">OKC</span>
          <span className="pb-1 text-lg font-light tracking-[0.4em] text-blue-500">PARTNERS</span>
        </div>

        {noFactor ? (
          <>
            <h1 className="mb-3 text-2xl font-bold text-slate-900">Two-factor authentication</h1>
            <p className="mb-8 text-sm leading-relaxed text-slate-500">
              Your account doesn&apos;t have an authenticator app enrolled yet. Set one up to
              protect your account, or continue to your dashboard.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/mfa/setup" className="auth-button-primary block text-center">
                Set up authenticator
              </Link>
              <Link
                href="/"
                className="block rounded-2xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Continue without MFA
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-2xl font-bold text-slate-900">Enter verification code</h1>
            <p className="mb-8 text-sm leading-relaxed text-slate-500">
              Open your authenticator app and enter the 6-digit code for your OKC Capital
              account.
            </p>

            <form onSubmit={verify}>
              <input
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="mb-4 w-full rounded-2xl border border-slate-300 px-6 py-4 text-center text-3xl font-semibold tracking-[0.5em] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
              />

              {error && (
                <p className="auth-status-message status-error mb-4">{error}</p>
              )}

              <button
                type="submit"
                disabled={verifying || !factorId || code.length < 6}
                className="auth-button-primary"
              >
                {verifying ? 'Verifying…' : 'Verify and continue'}
              </button>
            </form>
          </>
        )}

        <form action={signout} className="mt-8 text-center">
          <button type="submit" className="text-sm font-medium text-[#1f6bff] hover:underline">
            Sign out and use a different account
          </button>
        </form>
      </section>
    </main>
  );
}
