# OKC Investor Portal

Secure investor portal for OKC, built with [Next.js 16](https://nextjs.org) (App Router), [Supabase](https://supabase.com) auth, Tailwind CSS 4, and Prisma.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` with your Supabase project credentials. **`.env` is the canonical
   file** — the app, the Prisma CLI (`prisma.config.ts`), the seed, the maintenance
   scripts and the vitest setup all read it. A `.env.local` is optional and, where
   it exists, takes precedence key by key; keep the two in sync or you will point
   the app and the CLI at different projects.

   ```bash
   # Supabase — dashboard > Project Settings > API
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # server-only; admin user management, password-reset lookup

   # Database — dashboard > Project Settings > Database > Connection string
   DATABASE_URL=...                # transaction-mode pooler; used by the app at runtime
   DIRECT_URL=...                  # session-mode pooler; used by the Prisma CLI for migrations

   # Absolute origin of this deployment. Password-reset and invite links are built
   # from it, so it must never be derived from a request header.
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

   # Optional — transactional email via Resend (see lib/email.ts). If unset, invite
   # credentials are shown to the admin in the UI instead of being emailed.
   RESEND_API_KEY=...
   EMAIL_FROM=...                  # verified sender; defaults to Resend's onboarding sender
   ```

3. Generate the Prisma client and seed demo data:

   ```bash
   npx prisma generate     # also runs automatically on npm install (postinstall)
   npx tsx prisma/seed.ts  # idempotent
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). In development, [/debug-users](http://localhost:3000/debug-users) can seed test accounts (disabled in production).

## Roles and routes

Every signed-in user has a role stored in Supabase `app_metadata` (see `lib/auth/roles.ts`). The proxy (`proxy.ts` → `lib/supabase/proxy.ts`) refreshes the session and routes each role to its own section:

| Role                | Home                 | Section pages                                                                     |
| ------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `investor`          | `/investor`          | `app/(investor)` — funds, documents, request-transaction                            |
| `operations`        | `/operations`        | `app/(operations)` — ops-transactions, ops-funds, data-import, investors, operation-log |
| `admin`             | `/admin`             | `app/(admin)` — users, audit-logs, transactions (read-only), settings               |
| `portfolio-manager` | `/portfolio-manager` | `app/(portfolio-manager)` — performance, port-investors, port-transactions (read-only) |

The route → role map is `ROUTE_ROLES` in `lib/auth/roles.ts`.

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
- `npm test` — vitest (ledger, return drivers, what-if allocation)
- `npx tsx scripts/rebuild-ledgers.ts` — recompute every fund's daily ledger; `--check` reconciles without writing. **Run this after any change to `lib/ledger.ts`** — the maths lives in code but the numbers on screen come from persisted rows.

## Deploying

The AWS Elastic Beanstalk bundle is assembled by `scripts/build-eb-bundle.mjs`:

```bash
NEXT_PUBLIC_SITE_URL=https://okcportal.app npx next build
node scripts/build-eb-bundle.mjs
```

Then zip the **contents** of `.next/eb-bundle` (not the folder) — EB needs `server.js`, `Procfile` and `.platform/` at the archive root.

> `NEXT_PUBLIC_*` is inlined at build time, including server-side, so a deploy built without the override above bakes `http://localhost:3000` into every production redirect. Setting it as an EB environment property does not fix it.
