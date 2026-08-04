'use client';

import { useActionState, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { createClient } from '@/lib/supabase/client';
import { logMfaEvent } from '@/app/(auth)/mfa/actions';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  PASSWORD_RULES,
} from '@/lib/auth/password';
import { changePassword } from './actions';

// The checklist renders the same rules the server enforces (lib/auth/password),
// so it can never show all-green on something the submit will refuse. It was
// ported from origin/jinrui 8f5bd69 — which predates both the server/client
// split of this page and the shared rule module — with a cross for unmet rules
// and the upper length bound added.
const REQUIREMENTS = PASSWORD_RULES;

function CheckItem({ met, started, label }) {
  // Neutral until they start typing — a wall of red on an empty form reads as
  // failure rather than guidance.
  const tone = met ? 'bg-green-500' : started ? 'bg-red-400' : 'bg-slate-300';

  return (
    <li className="flex items-center gap-2 text-[clamp(0.8rem,0.9vw,0.95rem)]">
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full transition-colors ${tone}`}
      >
        <svg
          className="h-3 w-3 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d={met ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}
          />
        </svg>
      </span>
      <span className={met ? 'text-slate-700' : 'text-slate-500'}>{label}</span>
      <span className="sr-only">{met ? '— requirement met' : '— not yet met'}</span>
    </li>
  );
}

function EyeIcon({ visible }) {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
      aria-hidden="true"
    >
      {visible ? (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      )}
    </svg>
  );
}

// Supabase refuses updateUser({ password }) with 401 insufficient_aal when the
// account has a verified authenticator and the session is only AAL1 — which is
// exactly what a password-recovery link produces. So when the server tells us
// the session still needs a second factor, the password form is gated behind a
// TOTP challenge that elevates this session to AAL2 first.
//
// The challenge runs browser-to-Supabase directly (same as /mfa); only the
// audit trail goes through the server.
export default function ChangePasswordClient({ needsMfa, accountEmail = null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [state, formAction, isPending] = useActionState(changePassword, undefined);

  const [mfaCleared, setMfaCleared] = useState(!needsMfa);
  const [code, setCode] = useState('');
  const [mfaError, setMfaError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = REQUIREMENTS.map(r => ({ ...r, met: r.test(password) }));
  const metCount = checks.filter(r => r.met).length;
  const allMet = metCount === checks.length;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const showMismatch = confirmPassword.length > 0 && !passwordsMatch;
  const canSubmit = allMet && passwordsMatch && !isPending;

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
    // Locked to the viewport: this page is the tallest of the auth screens
    // (checklist + confirm field + error banner + the MFA step), and letting
    // the document scroll dragged the whole split with it, exposing empty
    // space above and below both panels.
    <main className="flex h-dvh overflow-hidden">

      <AuthBrandPanel />

      {/* RIGHT PANEL — the only scrollable region, and only when it needs to be.
          my-auto on the child rather than items-center here: centring a flex
          child that outgrows its scroll container pushes its top out of reach,
          because the overflow spills in both directions. Auto margins collapse
          to zero once the content is taller, so it simply starts at the top.

          `relative` is load-bearing, not decoration: overflow does not clip an
          absolutely positioned descendant unless the scroller is also its
          containing block. Without it the sr-only aria-live tally (Tailwind's
          .sr-only is position:absolute) resolved against the document instead
          and added 9px of page scroll — invisible, but enough to unlock the
          whole view and reintroduce the blank bands. */}
      <section className="relative flex w-1/2 justify-center overflow-y-auto bg-[#fbfcff] px-[clamp(2rem,5vw,6rem)] py-[clamp(2rem,4vw,4rem)]">
        <div className="my-auto w-full max-w-xl">

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

              <p className="mb-[clamp(1rem,1.5vw,1.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-[#6b7894]">
                Choose a new password to secure your account before continuing.
                Any other signed-in sessions will be logged out.
              </p>

              {/* Whose password this is about. A reset link authenticates as
                  its own recipient, so on a shared machine the account being
                  changed is not necessarily the one that was signed in. */}
              {accountEmail && (
                <p className="mb-[clamp(2rem,3vw,3.5rem)] flex items-center gap-2 rounded-xl border border-[#d8e1ef] bg-white px-4 py-3 text-[clamp(0.875rem,0.95vw,1rem)] text-slate-600">
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206"
                    />
                  </svg>
                  <span>
                    Setting a new password for{' '}
                    <span className="font-semibold text-slate-900">{accountEmail}</span>
                  </span>
                </p>
              )}

              <form action={formAction}>

                {/* New password */}
                <div className="mb-[clamp(1.25rem,2vw,2rem)]">
                  <label htmlFor="password" className="auth-label">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={MAX_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder="Enter your new password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      aria-describedby="password-requirements"
                      className="auth-input pr-11"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>

                  {/* Live requirement checklist. Announcing every rule on each
                      keystroke would be unbearable on a screen reader, so only
                      the running tally is a live region. */}
                  <ul
                    id="password-requirements"
                    className="mt-[clamp(0.75rem,1vw,1rem)] space-y-2 rounded-lg bg-slate-50 p-4"
                  >
                    {checks.map(r => (
                      <CheckItem
                        key={r.id}
                        met={r.met}
                        started={password.length > 0}
                        label={r.label}
                      />
                    ))}
                  </ul>
                  <p aria-live="polite" className="sr-only">
                    {metCount} of {checks.length} password requirements met
                  </p>
                </div>

                {/* Confirm password */}
                <div className="mb-[clamp(1.5rem,2.5vw,2.5rem)]">
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      maxLength={MAX_PASSWORD_LENGTH}
                      autoComplete="new-password"
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`auth-input pr-11 ${
                        showMismatch ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    >
                      <EyeIcon visible={showConfirm} />
                    </button>
                  </div>

                  {showMismatch && (
                    <p className="mt-[clamp(0.5rem,0.6vw,0.6rem)] flex items-center gap-1.5 text-[clamp(0.8rem,0.9vw,0.95rem)] text-red-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Passwords do not match.
                    </p>
                  )}
                  {passwordsMatch && (
                    <p className="mt-[clamp(0.5rem,0.6vw,0.6rem)] flex items-center gap-1.5 text-[clamp(0.8rem,0.9vw,0.95rem)] text-green-600">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Passwords match.
                    </p>
                  )}
                </div>

                {/* Error message */}
                {state?.error && (
                  <p className="auth-status-message status-error mb-[clamp(1rem,1.5vw,1.5rem)]">
                    {state.error}
                  </p>
                )}

                <button type="submit" disabled={!canSubmit} className="auth-button-primary">
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
