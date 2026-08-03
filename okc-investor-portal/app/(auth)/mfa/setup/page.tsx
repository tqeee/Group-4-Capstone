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
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-4 py-10">
      <section className="mfa-card">
        <p className="mb-5 text-xl font-extrabold tracking-tight text-black">OKC</p>

        <h1 className="mb-1.5 text-lg font-semibold text-slate-900">
          Two-factor authentication
        </h1>
        <p className="mb-5 text-sm leading-relaxed text-slate-500">
          Protect your account with 6-digit codes from an authenticator app such as Google
          Authenticator, Microsoft Authenticator, or Authy.
        </p>

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : done ? (
          <div>
            <p className="mfa-note status-success mb-4">
              Two-factor authentication is now enabled. You&apos;ll be asked for a code every
              time you sign in.
            </p>
            <Link href="/" className="mfa-button-primary">
              Continue to dashboard
            </Link>
          </div>
        ) : verifiedFactorId ? (
          <div>
            <p className="mfa-note status-success mb-4">
              Two-factor authentication is <b>enabled</b> on this account.
            </p>
            {error && <p className="mfa-note status-error mb-3">{error}</p>}
            <div className="flex flex-col gap-2.5">
              <Link href="/" className="mfa-button-primary">
                Back to dashboard
              </Link>
              <button onClick={disable} disabled={busy} className="mfa-button-danger">
                {busy ? 'Removing…' : 'Remove authenticator'}
              </button>
            </div>
          </div>
        ) : enrolling ? (
          <form onSubmit={confirmEnroll}>
            <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-slate-600">
              <li>Scan this QR code with your authenticator app.</li>
              <li>Enter the 6-digit code the app shows to confirm.</li>
            </ol>
            <div className="mb-3 flex justify-center rounded-xl border border-gray-100 bg-white p-3">
              {/* Supabase returns the QR as an SVG data URI, not an uploaded asset. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrSrc!} alt="Authenticator enrollment QR code" className="h-36 w-36" />
            </div>
            <p className="mb-4 text-center text-xs text-slate-400">
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
              className="mfa-code-input mb-3"
            />
            {error && <p className="mfa-note status-error mb-3">{error}</p>}
            <button type="submit" disabled={busy || code.length < 6} className="mfa-button-primary">
              {busy ? 'Confirming…' : 'Confirm and enable'}
            </button>
          </form>
        ) : (
          <div>
            {error && <p className="mfa-note status-error mb-3">{error}</p>}
            <div className="flex flex-col gap-2.5">
              <button onClick={startEnroll} disabled={busy} className="mfa-button-primary">
                {busy ? 'Preparing…' : 'Set up authenticator app'}
              </button>
              <Link href="/" className="mfa-button-secondary">
                Not now
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
