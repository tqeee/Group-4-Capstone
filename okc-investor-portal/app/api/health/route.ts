// GET /api/health — load balancer health check target.
//
// The Elastic Beanstalk ALB target group polls this every 15s and marks the
// instance unhealthy after 5 consecutive non-200s. It cannot point at '/':
// the proxy redirects an unauthenticated request to /login, so '/' answers 307
// and the check fails with Target.ResponseCodeMismatch even though the app is
// perfectly healthy.
//
// Deliberately a LIVENESS check, not a readiness one: it touches no database
// and no Supabase endpoint. A brief Postgres hiccup must not take every
// instance out of the load balancer and turn a slow page into an outage. It
// answers 200 exactly when this Node process is up and serving — which is the
// only question the ALB is asking.
//
// Reachable signed out via `publicRoutes` in lib/supabase/proxy.ts.

// The health check must reflect the live process, so never prerender this into
// a static asset at build time.
export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ status: 'ok', time: new Date().toISOString() })
}
