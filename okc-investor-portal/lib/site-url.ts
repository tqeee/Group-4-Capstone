// Origin for links we generate (password reset redirects, credential emails).
// Prefer the configured site URL: deriving it from request headers lets an
// attacker inject their own Host header and receive the victim's reset link.
// The header fallback is for local dev where the env var may be unset.
export function siteOriginFromHeaders(requestHeaders: Headers, fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  const host =
    requestHeaders.get('x-forwarded-host')?.split(',')[0].trim() ||
    requestHeaders.get('host')?.split(',')[0].trim()
  if (host) {
    const protocol = requestHeaders.get('x-forwarded-proto')?.split(',')[0].trim() || 'http'
    return `${protocol}://${host}`
  }

  return fallbackOrigin ?? 'http://localhost:3000'
}

export async function getSiteOrigin(): Promise<string> {
  const { headers } = await import('next/headers')
  return siteOriginFromHeaders(await headers())
}
