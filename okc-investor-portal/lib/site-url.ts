import { headers } from 'next/headers'

// Origin for links we generate (password reset redirects, credential emails).
// Prefer the configured site URL: deriving it from request headers lets an
// attacker inject their own Host header and receive the victim's reset link.
// The header fallback is for local dev where the env var may be unset.
export async function getSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) {
    return configured.replace(/\/+$/, '')
  }

  const headersList = await headers()
  const protocol = headersList.get('x-forwarded-proto') ?? 'http'
  return `${protocol}://${headersList.get('host')}`
}
