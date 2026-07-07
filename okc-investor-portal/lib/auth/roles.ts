// Role-based access control definitions shared by the proxy and server actions.
// Roles are stored in Supabase `app_metadata` (server-controlled, present in the
// JWT claims), never in `user_metadata` (user-editable).

export const ROLES = ['investor', 'operations', 'admin'] as const
export type Role = (typeof ROLES)[number]

// Users created before roles existed have no role claim; treat them as investors.
export const DEFAULT_ROLE: Role = 'investor'

export const ROLE_HOME: Record<Role, string> = {
  investor: '/investor',
  operations: '/operations',
  admin: '/admin',
}

// Route groups like (admin) don't appear in the URL, so every section is a
// top-level path. Any path not listed here is accessible to all signed-in roles.
const ROUTE_ROLES: Record<string, Role> = {
  // (admin)
  '/admin': 'admin',
  '/users': 'admin',
  '/audit-logs': 'admin',
  '/transactions': 'admin',
  '/settings': 'admin',
  // (operations)
  '/operations': 'operations',
  '/investors': 'operations',
  '/data-import': 'operations',
  '/operation-log': 'operations',
  '/ops-transactions': 'operations',
  '/ops-funds': 'operations',
  // (investor)
  '/investor': 'investor',
  '/activity': 'investor',
  '/documents': 'investor',
  '/funds': 'investor',
  '/reports': 'investor',
  '/request-transaction': 'investor',
  // API routes (the proxy returns 401/403 JSON for these instead of redirecting)
  '/api/statements': 'investor',
}

export function normalizeRole(value: unknown): Role {
  return ROLES.includes(value as Role) ? (value as Role) : DEFAULT_ROLE
}

// Exact-or-segment matching so '/investor' doesn't swallow '/investors'.
export function requiredRoleForPath(pathname: string): Role | null {
  for (const [prefix, role] of Object.entries(ROUTE_ROLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return role
    }
  }
  return null
}
