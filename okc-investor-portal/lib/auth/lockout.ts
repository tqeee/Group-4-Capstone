import { prisma } from '@/lib/db'

// Account security safeguard (§3.1): after this many failed sign-in attempts
// within the window, further attempts for that email are refused — on top of
// Supabase's own per-IP rate limiting.
export const LOCKOUT_THRESHOLD = 5
export const LOCKOUT_WINDOW_MINUTES = 15

// The marker written when an administrator clears a lockout. Exported so the
// writer (app/(admin)/users/actions.ts) and the reader below can never drift —
// a typo on either side would silently make the unlock button do nothing.
export const LOCKOUT_CLEARED_ACTION = 'LOGIN_LOCKOUT_CLEARED'

// Events that end the current run of failures.
//
// The counter is DERIVED from the audit trail rather than stored, so resetting
// it must never mean deleting rows: §3.1 requires a complete trail, and a
// lockout that erases the record of the attack which triggered it destroys the
// evidence an admin needs to tell a forgetful user from an attacker. Instead
// only failures recorded AFTER the most recent marker are counted — the
// history stays intact and the count still goes back to zero.
const RESET_ACTIONS = [LOCKOUT_CLEARED_ACTION, 'LOGIN_SUCCESS']

export type LockoutState = {
  locked: boolean
  /** Failures counted since the last reset marker — what a clear would wipe. */
  failures: number
}

function windowStart(): Date {
  return new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000)
}

export async function getLockoutState(email: string): Promise<LockoutState> {
  try {
    const since = windowStart()

    const lastReset = await prisma.auditLog.findFirst({
      where: {
        actorEmail: email,
        action: { in: RESET_ACTIONS },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    const failures = await prisma.auditLog.count({
      where: {
        action: 'LOGIN_FAILED',
        actorEmail: email,
        // Whichever is later: the start of the window, or the last reset.
        createdAt: { gt: lastReset?.createdAt ?? since },
      },
    })

    return { locked: failures >= LOCKOUT_THRESHOLD, failures }
  } catch {
    // If the audit store is unreachable, fail open: Supabase still rate
    // limits, and a DB outage must not lock every user out of the portal.
    return { locked: false, failures: 0 }
  }
}

// Every currently locked-out email → its failure count, in one query.
//
// Used by the admin user list, which needs the state for ~200 accounts at
// once; getLockoutState() per row would be two queries each. Same definition
// as above, expressed as a correlated subquery for the per-email reset marker.
export async function lockedOutEmails(): Promise<Map<string, number>> {
  try {
    const since = windowStart()

    const rows = await prisma.$queryRaw<{ email: string; failures: number }[]>`
      SELECT a."actorEmail" AS email, COUNT(*)::int AS failures
      FROM audit_logs a
      WHERE a.action = 'LOGIN_FAILED'
        AND a."actorEmail" IS NOT NULL
        AND a."createdAt" > COALESCE((
          SELECT MAX(r."createdAt")
          FROM audit_logs r
          WHERE r."actorEmail" = a."actorEmail"
            AND r.action IN (${LOCKOUT_CLEARED_ACTION}, 'LOGIN_SUCCESS')
            AND r."createdAt" >= ${since}
        ), ${since})
      GROUP BY a."actorEmail"
      HAVING COUNT(*) >= ${LOCKOUT_THRESHOLD}
    `

    return new Map(rows.map((row) => [row.email.toLowerCase(), row.failures]))
  } catch {
    // Same fail-open reasoning: show the list without lock state rather than
    // 500 the whole Users page.
    return new Map()
  }
}
