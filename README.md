# OKC Investor Portal

**🔗 Live app: [okcportal.app](https://okcportal.app/)**

A capstone project by a team of Year 3 Data Science students at Ngee Ann
Polytechnic, built for the industry partner **OKC**. The portal gives investors,
operations staff, portfolio managers, and admins a live, role-based view of fund
performance — replacing manual, spreadsheet-driven reporting with a system that
ingests broker trade data, computes daily shareholding and profit/loss per the
client's own recordkeeping methodology, and handles the full deposit/withdrawal
lifecycle end to end.

## What it does

- **Investors** see their portfolio value, daily/monthly/YTD performance, holdings
  by fund, and can request deposits/withdrawals with a per-fund risk tolerance.
- **Operations** review and approve those requests, run the bank-transfer
  confirmation workflow, and import broker trade data (CSV) to update the ledger.
- **Portfolio managers** get a read-only view of fund performance, return-driver
  breakdowns, and an allocation what-if simulator.
- **Admins** manage users, roles, portal settings, and view audit logs.

Every fund's daily shareholding and profit/loss is computed from raw broker trade
records using a daily waterfall calculation, so the numbers are always
reproducible from source data rather than mutated in place.

## Quick start

```bash
cd okc-investor-portal
npm install                # also runs `prisma generate` via postinstall
# create a .env with your Supabase + database credentials — see the app
# README below for the exact variables needed
npx tsx prisma/seed.ts     # optional: seed demo data
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). See the
[app README](./okc-investor-portal/README.md) for the full list of environment
variables, the role/route map, available scripts, and deployment notes.

## Tech stack

Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · Prisma 7 ·
Tailwind CSS 4 · vitest

## Team

Built by a team of four as part of the Capstone Project module.
