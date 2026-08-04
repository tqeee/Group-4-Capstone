'use client' // Error boundaries must be Client Components.

/*
 * Last-resort error boundary. Fires only when the ROOT layout itself throws —
 * app/error.tsx cannot catch that, since a boundary never wraps the layout in
 * its own segment. global-error REPLACES the root layout when active, so it
 * must render its own <html>/<body> and cannot rely on globals.css or the
 * font variables being applied. Everything here is inlined for that reason.
 *
 * metadata/generateMetadata aren't supported in a Client Component, so the tab
 * title is set with React's <title> element instead.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'Arial, Helvetica, sans-serif',
          background: '#fbfcff',
          color: '#071437',
        }}
      >
        <title>Something went wrong · OKC</title>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '420px',
              textAlign: 'center',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '16px',
              padding: '40px 32px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#071437',
              }}
            >
              OKC
            </div>

            <h1 style={{ margin: '24px 0 0', fontSize: '22px', fontWeight: 700 }}>
              Something went wrong
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '14px',
                lineHeight: 1.6,
                color: '#6b7894',
              }}
            >
              A critical error occurred and the page could not be displayed. Please try again.
            </p>

            {error?.digest && (
              <p
                style={{
                  margin: '16px 0 0',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#9ca3af',
                }}
              >
                Reference: {error.digest}
              </p>
            )}

            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                marginTop: '32px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '8px',
                background: '#1554ff',
                color: '#ffffff',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
