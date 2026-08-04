'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { requestPasswordReset } from './actions';

export default function ForgotPasswordClient({ linkError, expired }) {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, undefined);

  return (
    <main className="flex min-h-screen">

      <AuthBrandPanel />

      {/* RIGHT PANEL */}
      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-[clamp(2rem,5vw,6rem)]">
        <div className="w-full max-w-xl">

          <h2 className="mb-[clamp(0.5rem,1vw,1rem)] text-[clamp(1.75rem,3vw,3rem)] font-bold leading-tight text-[#071437]">
            Reset password
          </h2>

          <p className="mb-[clamp(2rem,3vw,3.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] leading-relaxed text-[#6b7894]">
            Enter your email address and we&apos;ll send you a link
            to reset your password
          </p>

          {linkError && !state && (
            <p className="auth-status-message status-error mb-[clamp(1rem,1.5vw,1.5rem)]">
              {expired
                ? 'That reset link has expired — links are valid for 20 minutes. Request a new one below.'
                : 'That reset link is invalid or has already been used. Request a new one below.'}
            </p>
          )}

          <form action={formAction}>
            <div className="mb-[clamp(1.25rem,2vw,2rem)]">

              <label htmlFor="email" className="auth-label">
                Email address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="investor@example.com"
                className="auth-input"
              />
            </div>

            {/* Status message */}
            {state?.message && (
              <p
                className={`auth-status-message mb-[clamp(1rem,1.5vw,1.5rem)] ${
                  state.error ? 'status-error' : 'status-success'
                }`}
              >
                {state.message}
              </p>
            )}

            <button type="submit" disabled={isPending} className="auth-button-primary">
              {isPending ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          <div className="mt-[clamp(2rem,3vw,3rem)] text-center">
            <Link
              href="/login"
              className="text-[clamp(0.875rem,1vw,1.125rem)] font-medium text-[#1f6bff] hover:underline"
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
