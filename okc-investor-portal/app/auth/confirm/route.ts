import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { audit } from '@/lib/audit'

// Exchanges the token in a Supabase auth email link for a session, then
// forwards the user (password recovery lands on /change-password). Supports
// both link styles so it works regardless of the project's email template:
//  - token_hash + type  — the template Supabase recommends for SSR apps
//    ({{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery)
//  - code               — the default {{ .ConfirmationURL }} template, which
//    verifies on Supabase's side and redirects here with a PKCE code
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')

  // Only same-origin relative paths — prevents open redirects via ?next=.
  const rawNext = searchParams.get('next') ?? '/change-password'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/change-password'

  const redirectTo = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone()
    const [pathname, search] = path.split('?')
    url.pathname = pathname
    url.search = search ? `?${search}` : ''
    for (const [key, value] of Object.entries(params ?? {})) {
      url.searchParams.set(key, value)
    }
    return NextResponse.redirect(url)
  }

  const supabase = await createClient()

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: type })
      return redirectTo(next)
    }
    await audit('AUTH_LINK_REJECTED', { detail: `${type}: ${error.message}`, success: false })
    return redirectTo('/forgot-password', { error: 'link' })
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      await audit('AUTH_LINK_VERIFIED', { actor: data.user?.email ?? null, detail: 'code' })
      return redirectTo(next)
    }
    await audit('AUTH_LINK_REJECTED', { detail: `code: ${error.message}`, success: false })
    return redirectTo('/forgot-password', { error: 'link' })
  }

  // No usable token (e.g. the link's error fragment, or a stray visit).
  return redirectTo('/forgot-password', { error: 'link' })
}
