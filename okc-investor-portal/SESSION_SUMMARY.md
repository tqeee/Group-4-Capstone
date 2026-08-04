# Session Summary — 2026-07-24 → 2026-08-03

Scope: verified the §8.1/§8.2 P&L pipeline against the challenge statement, fixed a live dashboard bug, added year-to-date reporting, made the ledger calculation unit-testable, added a real NAV timestamp, added the Portfolio Manager role wired to real data, merged everything into `integration`, and reconciled the auth↔profile sync into version control.

---

## 1. P&L calculation logic — verified, not changed

Compared `lib/ledger.ts`'s `rebuildFundLedger` against §8.1 (shareholding waterfall) and §8.2 (performance metrics) of the challenge statement. Confirmed formula-for-formula match:

- Daily P&L split pro-rata by each investor's *opening* share %
- Flows applied additively after P&L, then % shareholding recalculated for the next day
- New investors joining mid-period correctly default to 0% opening share (no misattribution)
- Withdrawals floored at $0 (never negative), investor dropped from tracking once at zero
- `compoundReturn()` = `Π(1 + pnl/opening) − 1`, matching §8.2(ii) exactly

Also cross-checked an older prototype transcript from a different tech stack — its final algorithm was conceptually identical, and the one real bug it hit (new-investor-mid-period misattribution) does **not** exist here.

**No calculation logic was changed** — only confirmed correct.

## 2. Frontend fixes

| File | Change |
|---|---|
| `app/(investor)/investor/page.jsx` | Was a client component rendering **100% hardcoded mock data** regardless of who was logged in. Rewritten as a server component fetching `getInvestorByAuth` + `getInvestorOverview`, rendering the real (previously unused) `InvestorDashboard.jsx`. |
| `components/dashboard/HoldingsTable.jsx` | Header said `"TOTAL P&L"` but the column rendered a `ytd` field. Fixed to `"YTD"`. |
| `app/(investor)/investor/InvestorDashboard.jsx` | `ytd` switched from duplicating `inceptionPnl` to real `fund.ytdPnl`; NAV timestamp from hardcoded `19:00 SGT` to `fmtTime(overview.asOfComputedAt)`. |
| `app/(investor)/reports/ReportsClient.jsx` | Added a 5th "YTD RETURN" stat card. |
| `app/(operations)/operations/page.tsx` | Same NAV-timestamp fix. |

## 3. Backend: YTD calculation (`lib/queries.ts`)

Added `ytdPnl`/`ytdPct` to `getInvestorOverview()` (aggregate and per-fund), mirroring the MTD pattern.

**Edge case found and fixed:** when an investor's YTD (or MTD) window starts on their very first-ever day, the opening balance is genuinely $0, so the percentage always displayed `0%`. Fixed by falling back to gross deposits as the denominator — the same approach `inceptionPct` already used. Verified live: `+0.00%` → correct `−32.06%`.

## 4. Ledger refactor + test suite

`rebuildFundLedger()` mixed the §8.1 calculation with database I/O, making the math untestable without a live DB.

- New pure function `computeFundLedger(fundId, deals, flows)` — plain data in, plain data out, **zero database calls**. Same logic, only relocated.
- `rebuildFundLedger()` is now a thin wrapper: fetch → compute → write in one transaction.
- Added `vitest` + `lib/ledger.test.ts` (8 tests): single investor/day, new investor mid-period (regression test), over-withdrawal flooring, multi-investor pro-rata split, trade-count counting only `entry=1`, and `compoundReturn` edge cases.
- New `npm test` script.
- **Verified behaviour-preserving:** re-ran the real rebuild against the live GOLD fund — 24 NAV rows, total P&L −16,028.12, 17 Mar's pnl/tradeCount/dailyReturnPct, final closing balance all matched exactly.

## 5. Real NAV timestamp

"NAV as of [date] · 19:00 SGT" had a real date but a hardcoded time.

- Schema: `updatedAt DateTime @updatedAt` on `FundDailyNav` and `InvestorDailyLedger`.
- Migration `20260725000000_add_ledger_updated_at`, applied via `migrate deploy` (this project's RLS migration doesn't replay through `migrate dev`'s shadow database — a known pre-existing quirk).
- `getInvestorOverview` / `getFundTotals` now return `asOfComputedAt`; new `fmtTime()` helper in `lib/format.ts` (UTC+8).
- Verified live: displayed time changed between two rebuilds (`02:31` → `02:36 SGT`) matching the server clock.

## 6. Portfolio Manager role

Triggered by a live crash: a teammate had added `PORTFOLIO_MANAGER` directly to the shared DB's `Role` enum and created an investor row using it, but the enum was missing from `schema.prisma` — so every query fetching all investors (the admin pages) threw `Value 'PORTFOLIO_MANAGER' not found in enum 'Role'`.

- Added `PORTFOLIO_MANAGER` to the `Role` enum + migration `20260731000000_add_portfolio_manager_role`.
- Wired `'portfolio-manager'` through the RBAC system: `ROLES`, `ROLE_HOME`, `ROUTE_ROLES`, the invite flow's `DB_ROLE` map, and the admin Users page dropdown/labels.
- Brought the `(portfolio-manager)` route group over from the `jinrui` branch (layout/nav, `port-investors`, `port-transactions`, shared components).
- **Rewrote the dashboard and performance pages to use real data.** They shipped reading a hardcoded dummy dataset (fictional investors, one hardcoded fund). Both are now server-fetch + client-render pairs with a fund selector covering every fund in the DB; Pending Actions and Recent Activity come from `getFlowsForReview()` / `getAuditLogs()`.
- New `getFundDailySeries(fundId)` read model in `lib/queries.ts` for the fund-level daily NAV series.
- **Bug fixed:** `portfolioPerformance.js` divided by the period's starting balance for fund return — real funds open day one at $0, producing `Infinity`/`NaN`. Falls back to net contributions, matching the YTD/MTD fix.
- Verified live: admin-crashing query succeeds, PM login redirects correctly, both pages render real fund names and figures (Portfolio Value SGD 51,321.18 = XAU's actual balance) with no dummy data and no `NaN`.

**Still on dummy data (out of scope):** `port-transactions` page and the investor-profile modal.

## 7. Auth ↔ profile sync (reconciled into version control)

`auth.users` (Supabase/GoTrue) and `public.investors` (Prisma) are linked only by `investors."authUserId"` — a convention with **no FK constraint**. Accounts created outside the app's invite flow used to get a login with no portal profile.

**What happened:** implemented a trigger to fix this, then discovered through testing that a teammate had *already* added equivalent (and better) triggers directly to the shared DB. Rolled mine back and captured theirs instead.

Three migrations, in order:
1. `20260801000000_auth_user_profile_trigger` — my `on_auth_user_created` trigger.
2. `20260801010000_drop_redundant_auth_trigger` — dropped it once the duplication was found.
3. `20260801020000_reconcile_auth_sync_triggers` — **the important one.** Captures the teammate's DB-only objects so they exist in version control and on any fresh rebuild:
   - `role_from_auth_metadata()` — maps `app_metadata.role` onto the `Role` enum
   - `sync_investor_from_auth_user()` + `on_auth_user_synced` (AFTER INSERT **OR UPDATE**)
   - `unlink_investor_from_auth_user()` + `on_auth_user_unlinked` (AFTER DELETE)

Written idempotently, so it was safe to apply where the objects already existed. Verified after applying: role mapping (incl. unknown → `INVESTOR`), auto-provisioning on insert, orphan re-link without duplication, name preserved when metadata has none, role changes propagating on UPDATE, and delete nulling `authUserId` while keeping the profile.

**Behaviour is one-directional** (demonstrated empirically):
- Create in `auth.users` → profile auto-created and linked ✅
- Insert into `public.investors` → orphan with no login ❌ (there are zero triggers on `investors`)
- An orphan **heals automatically** when a matching auth account is later created (keyed on email)

**Team rule that follows:** always create accounts on the auth side — ideally the portal's Users page (it writes a `USER_INVITED` audit record, required by §3.1, and validates the role against an allowlist; the Supabase dashboard lets a typo like `"operation"` silently fall back to `INVESTOR`). Never insert into `investors` directly.

## 8. Data / account cleanup

- **Deleted 8 rows:** 7 orphaned profiles with zero financial data (`ops@okccapital.sg`, `admin@okccapital.sg`, `s10269166@…`, `teoqe07@…`, and 3 old test rows) plus `test-pm@example.com` (auth user + profile, my own leftover test account). Every deletion was guarded by a re-check for zero `fund_flows` and zero `investor_daily_ledger` rows.
- **Restored the GOLD demo login:** created an auth user for `investor@okc.com`, which the trigger auto-linked to the existing "Demo Investor" profile — same row id, no duplicate, all 141 ledger rows and 3 flows intact ($33,971.88). Password generated at creation time and given to the user directly (not recorded here).
- **Result: `auth.users` = 11, `investors` = 11, zero orphans.**

**Known leftover:** a real $5,000 deposit for Sarah Lim on the XAU fund (`note: "check #2 verification deposit"`, `reviewedBy: "verification-script"`), created to demonstrate the live pipeline end-to-end. Not reversed. It inflates Sarah's balance ($20,863.57 vs $15,863.57), XAU's AUM, and dilutes other investors' share percentages. Removing it means deleting the flow row and rebuilding XAU's ledger.

**Also noted, not fixed:** two different investors share the display name "Faye Cheah" (`faye.cheah@example.com` and `fayayyee@gmail.com`). Names have no unique constraint — correct by design, since email is the identity key — but the ops investor directory, PM investors page, and transaction lists show names without emails, so they look identical on screen.

## 9. Git

- `8e0a6fb` — sections 1–5. Force-pushed to `origin/qi-en` per explicit instruction, discarding 19 remote-only commits (a teammate had repeatedly overwritten `qi-en` with another branch's content). A teammate later restored those commits and reverted `8e0a6fb`; on instruction, force-pushed again to reinstate it.
- `2eea251` — section 6 (Portfolio Manager).
- `92ca857` — merge of `qi-en` into `integration`, bringing in Faye's `8b54106` fund-name anonymization (investors see generic `Fund A`/`Fund B` labels; ops/admin/PM see real names). One conflict in `lib/queries.ts`, resolved by keeping both imports. Verified after merge: `tsc`, `eslint`, and all 8 tests clean.
- `qi-en` then fast-forwarded to match `integration`; both currently identical.

**Correction to an earlier note in this file:** an earlier version claimed `integration` still had the old `pnlShare`/`flows` schema. That was wrong — `integration` does have the reconcile migration and uses `pnl`. The stale schema was in a teammate's older local archive, not the branch.

---

## Open items

- [ ] Three migrations from section 7 not yet committed (`20260801000000`, `20260801010000`, `20260801020000`) — **must be committed**, since all are recorded as applied in the shared DB and a fresh rebuild would otherwise lack the auth triggers
- [ ] $5,000 verification deposit still in the shared DB
- [ ] `port-transactions` page and investor-profile modal still on dummy data
- [ ] Duplicate display names not disambiguated in the UI (showing email alongside name would fix it)
- [ ] `Co-Authored-By: Claude` trailer on `8e0a6fb` / `2eea251` — removing it now requires rewriting both `qi-en` and `integration`
