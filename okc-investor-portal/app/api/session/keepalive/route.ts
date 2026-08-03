import { NextResponse } from 'next/server'

// Heartbeat for the idle timeout. The body does nothing on purpose — the whole
// point is that the request passes through the proxy, which re-stamps the
// last-activity cookie for any authenticated request (lib/supabase/proxy.ts).
//
// Without this, activity that makes no server request (reading a long page,
// scrolling, filling in a form) would look like idleness to the proxy and the
// user would be signed out mid-task. The client throttles the ping to once per
// IDLE_HEARTBEAT_MS, and stops entirely while the tab is idle.
//
// Unauthenticated callers never reach this: the proxy 401s /api/* without a
// session, and an idle-expired session is signed out before it gets here.
export async function POST() {
  return new NextResponse(null, { status: 204 })
}

export const dynamic = 'force-dynamic'
