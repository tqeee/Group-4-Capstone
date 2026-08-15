'use client' // Error boundaries must be Client Components.

import { useEffect } from 'react'
import Link from 'next/link'

/*
 * Root error boundary. Catches uncaught exceptions thrown while rendering any
 * page or nested (route-group) layout below the root layout — a failed DB read,
 * a thrown server component, etc. It renders in place of the crashed segment,
 * inside the root layout, so fonts + globals.css still apply.
 *
 * The root layout itself is NOT covered here (an error boundary never wraps the
 * layout in its own segment) — that last-resort case is app/global-error.tsx.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  // Next 16.2+ recovery prop: re-fetches and re-renders the boundary's children.
  unstable_retry: () => void
}) {
  useEffect(() => {
    // Server-component errors arrive here already scrubbed (only a digest in
    // prod); log so the digest is visible for matching against server logs.
    console.error(error)
  }, [error])

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-6">
      <div className="w-full max-w-md text-center">
        <span className="text-2xl font-extrabold tracking-tight text-[#071437]">OKC</span>

        <div className="card mt-8 p-8 shadow-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <svg
              className="h-7 w-7 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-[#071437]">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7894]">
            An unexpected error occurred while loading this page. You can try again, or
            head back to the portal.
          </p>

          {error.digest && (
            <p className="mt-4 font-mono text-xs text-gray-400">Reference: {error.digest}</p>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => unstable_retry()}
              className="rounded-lg bg-[#1554ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0047ff]"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-lg border border-gray-200 px-5 py-2.5 text-sm font-semibold text-[#071437] transition hover:bg-gray-50"
            >
              Return to portal
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
