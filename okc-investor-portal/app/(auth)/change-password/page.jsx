'use client';

import { useActionState } from 'react';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { changePassword } from './actions';

export default function ChangePasswordPage() {
  const [state, formAction, isPending] = useActionState(changePassword, undefined);

  return (
    <main className="flex min-h-screen">

      <AuthBrandPanel />

      {/* RIGHT PANEL */}
      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-[clamp(2rem,5vw,6rem)]">
        <div className="w-full max-w-xl">

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

        </div>
      </section>
    </main>
  );
}
