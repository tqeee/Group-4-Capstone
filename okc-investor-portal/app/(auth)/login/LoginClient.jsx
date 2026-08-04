'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import AuthBrandPanel from '@/components/auth/AuthBrandPanel';
import { IDLE_TIMEOUT_MS } from '@/lib/auth/idle';
import { login } from './actions';

export default function LoginClient({ timedOut = false }) {
  const [state, formAction, isPending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen">

      <AuthBrandPanel />

      {/* RIGHT PANEL */}
      <section className="flex w-1/2 items-center justify-center bg-[#fbfcff] px-[clamp(2rem,5vw,6rem)]">

        <div className="w-full max-w-xl">

          <h2 className="mb-[clamp(0.5rem,1vw,1rem)] text-[clamp(1.75rem,3vw,3rem)] font-bold leading-tight text-[#071437]">
            Welcome back
          </h2>

          <p className="mb-[clamp(2rem,3vw,3.5rem)] text-[clamp(1rem,1.2vw,1.25rem)] text-[#6b7894]">
            Sign in to access your investor portal
          </p>

          {/* Set by the proxy (or the client countdown) when an idle session
              was ended, so the user isn't left wondering why they're here. */}
          {timedOut && (
            <p className="auth-status-message status-info mb-[clamp(1.5rem,2vw,2rem)]">
              You were signed out after {IDLE_TIMEOUT_MS / 60000} minutes of inactivity. Please
              sign in again.
            </p>
          )}

          <form action={formAction}>

            {/* Email */}
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

            {/* Password */}
            <div className="mb-[clamp(1.5rem,2.5vw,2.5rem)]">

              <div className="mb-[clamp(0.5rem,0.8vw,0.75rem)] flex justify-between">

                <label
                  htmlFor="password"
                  className="text-[clamp(0.875rem,1vw,1.125rem)] font-medium text-slate-900"
                >
                  Password
                </label>

                <Link
                  href="/forgot-password"
                  className="text-[clamp(0.875rem,1vw,1.125rem)] font-medium text-[#1f6bff] hover:underline"
                >
                  Forgot password?
                </Link>

              </div>

              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className="auth-input"
              />

            </div>

            {/* Error message */}
            {state?.error && (
              <p className="auth-status-message status-error mb-[clamp(1rem,1.5vw,1.5rem)]">
                {state.error}
              </p>
            )}

            {/* Button */}
            <button type="submit" disabled={isPending} className="auth-button-primary">
              {isPending ? 'Signing in…' : 'Sign in'}
            </button>

          </form>

          {/* Footer Text */}
          <p className="mt-[clamp(2rem,3vw,3rem)] text-center text-[clamp(0.875rem,0.95vw,1.125rem)] leading-relaxed text-[#7c8aa5]">
            This portal is for authorised investors only.
            <br />
            Contact your fund manager for access.
          </p>

        </div>
      </section>
    </main>
  );
}
