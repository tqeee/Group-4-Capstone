# OKC Investor Portal

Secure investor portal for OKC, built with [Next.js 16](https://nextjs.org) (App Router), [Supabase](https://supabase.com) auth, Tailwind CSS 4, and Prisma.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` with your Supabase project credentials:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...              # Supabase dashboard > Project Settings > API
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...             # server-only; required for admin user management

   # Optional — SMTP for emailing credentials to invited users (see lib/email.ts)
   SMTP_HOST=...
   SMTP_PORT=587
   SMTP_USER=...
   SMTP_PASS=...
   SMTP_FROM=...

   # Optional — Prisma (see prisma.config.ts)
   DATABASE_URL=...
   ```

3. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). In development, [/debug-users](http://localhost:3000/debug-users) can seed test accounts (disabled in production).

## Roles and routes

Every signed-in user has a role stored in Supabase `app_metadata` (see `lib/auth/roles.ts`). The proxy (`proxy.ts` → `lib/supabase/proxy.ts`) refreshes the session and routes each role to its own section:

| Role         | Home         | Section pages                                                            |
| ------------ | ------------ | ------------------------------------------------------------------------ |
| `investor`   | `/investor`  | `app/(investor)` — funds, activity, reports, documents, request-transaction |
| `operations` | `/operations`| `app/(operations)` — ops-transactions, data-import, investors, operation-log |
| `admin`      | `/admin`     | `app/(admin)` — users, audit-logs, transactions, settings                 |

Admin-created accounts receive a temporary password by email and are forced through `/change-password` on first sign-in.

## Project layout

- `app/` — routes, grouped by role; route-specific client components sit next to their `page.jsx`
- `components/` — shared UI (auth panels, dashboard cards/charts, operations badges)
- `lib/` — Supabase clients (`browser`, `server`, `admin`), role definitions, email sending
- `prisma/` — database schema (Prisma 7, PostgreSQL)

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
