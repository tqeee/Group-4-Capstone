---
name: verify
description: How to run and drive the OKC investor portal end-to-end (dev server, minting Supabase session cookies for curl, RBAC/MFA/sign-out flows).
---

# Verifying the OKC investor portal

## Launch

```bash
npm run dev   # ready in ~1s on http://localhost:3000; logs proxy + route timings
```

Capture the server output to a file — the Supabase "user object … could be
insecure" warning and route errors show up there, not in responses.

## Drive authenticated flows without a browser

Server actions and Supabase auth make browser-less testing possible by minting
`@supabase/ssr`-format cookies:

1. Sign in with `@supabase/supabase-js` (`signInWithPassword`, publishable key
   from `.env.local`).
2. Cookie name: `sb-<project-ref>-auth-token` (ref = first label of the
   Supabase URL hostname). Value: `"base64-" + base64url(JSON.stringify(session))`,
   chunked into `<name>.0`, `<name>.1`… if longer than 3180 chars.
3. `curl -H "Cookie: <that>" http://localhost:3000/<path>`.

Working scripts from a past session (mint cookies, create/delete throwaway
role users, TOTP enroll + code computation for the MFA gate): see the
scratchpad pattern in `setup-test-users.mjs` / `cleanup-test-users.mjs` — they
create `rbac-test-*@example.com` users via the service-role key with
`app_metadata.role` set, and delete them by id afterwards. Never enroll MFA on
teammates' real users.

**Do not assume the seeded demo logins exist.** The Supabase project is shared;
teammates create/delete auth users. List users with the service-role key first,
and prefer throwaway users (investor pages tolerate a missing Investor row).

## Flows worth driving

- Role gates: each role's cookie against its own pages (200) and the other two
  groups' pages (307 to role home). `/` and `/login` redirect to role home.
- API: `/api/statements/<month>` — 401 unauthenticated, 403 wrong role.
- MFA: an AAL1 session for a user with a verified TOTP factor must 307 to
  `/mfa` from everything (including `/mfa/setup`); AAL2 cookie passes.
- Sign-out button without JS: grep the page HTML for `$ACTION_ID_<hash>`, then
  `curl -F '$ACTION_ID_<hash>=' <same page URL>` with the session cookie →
  expect `303 Location: /login` + Set-Cookie clearing.

## Real-browser flows (MFA enroll, dialogs, client-side nav)

No Playwright in the repo. `npm install puppeteer-core` in the scratchpad and
launch the system Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`,
`headless: 'new'`). Delete the scratchpad node_modules afterwards.

- Cookies must go on the same browser context as the page (`context.setCookie`
  / `page.setCookie`) — `browser.setCookie` only hits the default context.
- Compute TOTP codes from the enrollment secret with node:crypto (HMAC-SHA1,
  base32 key, 30s window). **Codes are single-use**: the code used to confirm
  enrollment is rejected if replayed for the login challenge in the same 30s
  window — wait for the next window.
- Wait for the target button's text before clicking; the MFA pages have a
  brief client-side `listFactors()` loading state after navigation.
- Ignore `document.body.innerText` missing button labels in headless Chrome
  (layout quirk) — assert on `textContent`/selectors and screenshots instead.
- Git Bash mangles `/path` CLI args into Windows paths — prefix commands with
  `MSYS_NO_PATHCONV=1` when passing URL paths.

## Server-action forms via curl/node (no browser)

`useActionState` forms render reference-encoded hidden inputs (`$ACTION_REF_n`,
`$ACTION_n:0`, `$ACTION_n:1`, `$ACTION_KEY`) — replay ALL of them (including
the value-less `$ACTION_REF_n`) plus your fields as multipart FormData with
the session cookie; missing one yields 500 "Failed to find Server Action".
On pages with one form per row (e.g. /users), slice to the `<form>` block
containing the target row's id first. Response: 200 with the returned state
re-rendered (grep `status-error` for error messages) or 303 on redirect.

⚠ Forms inside CLOSED modals (add-fund, add-user, new-request…) are NOT in
the fetched HTML — blind hidden-input harvesting then picks up the nav's
Sign out form and **revokes your test session** (303 → /login, cookie dead).
Drive modal forms with headless Chrome instead.

## Testing the password-reset flow without email

`admin.generateLink({ type: 'recovery', email })` (service key) returns
`properties.hashed_token` → GET `/auth/confirm?token_hash=<it>&type=recovery`
with a cookie jar → expect 307 to /change-password + session cookie. Tokens
are single-use. Probes worth keeping: replayed token → `/forgot-password?error=link`;
`?next=//evil.com` → sanitized to /change-password.

## Prisma from scripts

`npx tsx --env-file=.env.local --tsconfig tsconfig.json <script>` — tsx does
NOT load env files itself ("denied access on database" = missing env). Use
this to sweep test rows from AuditLog after verification.

## Gotchas

- Scripts outside the repo can't resolve `@supabase/supabase-js` by name —
  import `<repo>/node_modules/@supabase/supabase-js/dist/index.mjs` by file URL.
- Sign-out through the portal writes a LOGOUT row to the shared AuditLog table.
- ALWAYS stop the dev server when the task is done (user rule — low-storage
  laptop, and it squats on port 3000). On Windows, stopping the background
  task kills only the wrapper shell — the node child survives. Verify with
  `Get-NetTCPConnection -LocalPort 3000 -State Listen` and `Stop-Process` the
  owning PID if it still answers. If the user wants to click around, have them
  run `npm run dev` themselves instead of leaving yours up.
