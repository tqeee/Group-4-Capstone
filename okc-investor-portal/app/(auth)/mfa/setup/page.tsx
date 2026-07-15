'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { logMfaEvent } from '../actions';

type Enrolling = { factorId: string; qr: string; secret: string };

// Enroll (or remove) an authenticator app for the signed-in user. Users who
// already have a verified factor reach this page at AAL2 (the proxy enforces
// the challenge), which is what Supabase requires for unenrolling.
export default function MfaSetupPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const verified = data?.totp?.find(f => f.status === 'verified');
      setVerifiedFactorId(verified?.id ?? null);
      setLoading(false);
    });
  }, [supabase]);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    // Clear any half-finished (unverified) enrollments first.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === 'totp' && f.status === 'unverified') {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Authenticator app',
    });
    if (error || !data) {
      setError(error?.message ?? 'Could not start enrollment.');
    } else {
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    }
    setBusy(false);
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling || code.length < 6) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrolling.factorId,
      code,
    });
    if (error) {
      setError('That code was not accepted. Scan the QR code again and retry.');
      setCode('');
      setBusy(false);
      return;
    }
    await logMfaEvent('MFA_ENROLLED');
    setDone(true);
    setBusy(false);
  }

  async function disable() {
    if (!verifiedFactorId) return;
    if (!window.confirm('Remove two-factor authentication from your account?')) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId });
    if (error) setError(error.message);
    else {
      await logMfaEvent('MFA_UNENROLLED');
      setVerifiedFactorId(null);
    }
    setBusy(false);
  }

  const qrSrc = enrolling
    ? enrolling.qr.startsWith('data:')
      ? enrolling.qr
      : `data:image/svg+xml;utf8,${encodeURIComponent(enrolling.qr)}`
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-6 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-10 shadow-xl">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">Two-factor authentication</h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-500">
          Protect your account with 6-digit codes from an authenticator app such as Google
          Authenticator, Microsoft Authenticator, or Authy.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : done ? (
          <div>
            <p className="auth-status-message status-success mb-6">
              Two-factor authentication is now enabled. You&apos;ll be asked for a code every
              time you sign in.
            </p>
            <Link href="/" className="auth-button-primary block text-center">
              Continue to dashboard
            </Link>
          </div>
        ) : verifiedFactorId ? (
          <div>
            <p className="auth-status-message status-success mb-6">
              Two-factor authentication is <b>enabled</b> on this account.
            </p>
            {error && <p className="auth-status-message status-error mb-4">{error}</p>}
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="auth-button-primary block text-center"
              >
                Back to dashboard
              </Link>
              <button
                onClick={disable}
                disabled={busy}
                className="rounded-2xl border border-red-200 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
              >
                {busy ? 'Removing…' : 'Remove authenticator'}
              </button>
            </div>
          </div>
        ) : enrolling ? (
          <form onSubmit={confirmEnroll}>
            <ol className="mb-6 list-decimal space-y-2 pl-5 text-sm text-slate-600">
              <li>Scan this QR code with your authenticator app.</li>
              <li>Enter the 6-digit code the app shows to confirm.</li>
            </ol>
            <div className="mb-4 flex justify-center rounded-2xl border border-gray-100 bg-white p-4">
              {/* Supabase returns the QR as an SVG data URI, not an uploaded asset. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc!} alt="Authenticator enrollment QR code" className="h-44 w-44" />
            </div>
            <p className="mb-6 text-center text-xs text-slate-400">
              Can&apos;t scan? Enter this key manually:{' '}
              <code className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-slate-600">
                {enrolling.secret}
              </code>
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="mb-4 w-full rounded-2xl border border-slate-300 px-6 py-3 text-center text-2xl font-semibold tracking-[0.5em] text-slate-900 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            />
            {error && <p className="auth-status-message status-error mb-4">{error}</p>}
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="auth-button-primary"
            >
              {busy ? 'Confirming…' : 'Confirm and enable'}
            </button>
          </form>
        ) : (
          <div>
            {error && <p className="auth-status-message status-error mb-4">{error}</p>}
            <div className="flex flex-col gap-3">
              <button onClick={startEnroll} disabled={busy} className="auth-button-primary">
                {busy ? 'Preparing…' : 'Set up authenticator app'}
              </button>
              <Link
                href="/"
                className="block rounded-2xl border border-gray-200 py-3 text-center text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                Not now
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
