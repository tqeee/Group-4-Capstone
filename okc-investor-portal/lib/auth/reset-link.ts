import { prisma } from '@/lib/db'
import { RESET_LINK_MAX_AGE_MS } from './recovery'

// Identifies the account behind a password-reset link WITHOUT spending it.
//
// GoTrue stores the emailed `token_hash` verbatim in auth.users.recovery_token
// and clears it to '' once verifyOtp() consumes it (both verified against this
// project, 4 Aug 2026). So the same value that proves the link is genuine also
// tells us whose it is, how old it is, and whether the account has an
// authenticator — all before we decide to redeem it.
//
// That is what lets the link stay usable until the password actually changes:
// opening it only reads this row; only setting the password calls verifyOtp.

type Row = {
  id: string
  email: string | null
  sent_at: Date | null
  banned_until: Date | null
  has_mfa: boolean
}

export type ResetLinkLookup =
  | { status: 'valid'; userId: string; email: string; hasMfa: boolean; sentAt: Date }
  | { status: 'expired' }
  | { status: 'unknown' }

export async function lookupResetLink(
  tokenHash: string | null | undefined
): Promise<ResetLinkLookup> {
  // Guard the empty string explicitly: GoTrue writes '' (not NULL) when no
  // recovery is in flight, so a blank token would otherwise match a real row.
  if (!tokenHash) return { status: 'unknown' }

  let rows: Row[]
  try {
    rows = await prisma.$queryRaw<Row[]>`
      SELECT u.id::text        AS id,
             u.email           AS email,
             u.recovery_sent_at AS sent_at,
             u.banned_until    AS banned_until,
             EXISTS (
               SELECT 1 FROM auth.mfa_factors f
               WHERE f.user_id = u.id AND f.status = 'verified'
             )                 AS has_mfa
      FROM auth.users u
      WHERE u.recovery_token = ${tokenHash}
        AND u.recovery_token <> ''
      LIMIT 1
    `
  } catch (err) {
    // Fail closed. A reset that cannot be checked must not be honoured, and
    // the flow needs the database for its audit trail regardless.
    console.error('reset link lookup failed:', err)
    return { status: 'unknown' }
  }

  const row = rows[0]
  if (!row || !row.email) return { status: 'unknown' }

  // A disabled account must not be recoverable by whoever holds the mailbox.
  if (row.banned_until && row.banned_until > new Date()) return { status: 'unknown' }

  // No send timestamp means we cannot prove the link is inside its window.
  if (!row.sent_at) return { status: 'expired' }
  if (Date.now() - row.sent_at.getTime() > RESET_LINK_MAX_AGE_MS) return { status: 'expired' }

  return {
    status: 'valid',
    userId: row.id,
    email: row.email,
    hasMfa: row.has_mfa,
    sentAt: row.sent_at,
  }
}
