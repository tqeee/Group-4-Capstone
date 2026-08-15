import Link from 'next/link'

/*
 * Root 404 page. In the App Router the root app/not-found renders both for
 * explicit notFound() calls in a route segment AND for any URL that matches no
 * route at all (Next 13.3+). It's a Server Component with no props, rendered
 * inside the root layout, so fonts + globals.css apply. Next auto-injects
 * <meta name="robots" content="noindex"> for the 404 response.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfcff] px-6">
      <div className="w-full max-w-md text-center">
        <span className="text-2xl font-extrabold tracking-tight text-[#071437]">OKC</span>

        <p className="mt-8 text-sm font-semibold tracking-wide text-[#1f6bff]">404</p>
        <h1 className="mt-2 text-3xl font-bold text-[#071437]">Page not found</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#6b7894]">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded-lg bg-[#1554ff] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0047ff]"
          >
            Return to portal
          </Link>
        </div>
      </div>
    </main>
  )
}
