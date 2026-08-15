import { headers } from 'next/headers'
import { prisma } from '@/lib/db'

// Section 3.1: audit logging of authentication-related (and admin/ops)
// activities. Writes must never break the user-facing flow, so failures are
// logged and swallowed.
export async function audit(
  action: string,
  {
    actor,
    detail,
    success = true,
  }: { actor?: string | null; detail?: string; success?: boolean } = {}
) {
  let ip: string | null = null
  try {
    const h = await headers()
    ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
  } catch {
    // Not in a request scope (e.g. seed script) — no IP available.
  }

  try {
    await prisma.auditLog.create({
      data: { action, actorEmail: actor ?? null, detail, ip, success },
    })
  } catch (err) {
    console.error('audit log write failed:', err)
  }
}
