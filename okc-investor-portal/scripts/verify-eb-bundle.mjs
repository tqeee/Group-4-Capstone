// Asserts that an assembled Elastic Beanstalk bundle is actually deployable.
//
//   node scripts/verify-eb-bundle.mjs [bundle-dir]
//
// Every check here exists because the corresponding mistake has already
// shipped, or nearly shipped, at least once:
//
//   * NEXT_PUBLIC_* is inlined at BUILD time, server-side included. A build
//     run without the override bakes http://localhost:3000 into every
//     production redirect, and setting the variable on the host afterwards
//     does nothing. The Supabase URL and key are inlined the same way — miss
//     those and the bundle ships `undefined` with no way to fix it at runtime.
//   * Procfile / start.sh / .platform once existed ONLY inside the built
//     artifact, so a single `next build` (which clears .next/) deleted them.
//   * A \r on start.sh's shebang makes /bin/sh fail with a bare "not found".
//   * Without HOSTNAME=0.0.0.0 Next binds the instance hostname, nothing
//     listens on loopback, and every request is a 502.
//   * .platform/nginx/conf.d/proxy.conf carries the proxy_buffer_size bump
//     that stops sign-in 502ing on Supabase's chunked session cookies.
//   * Next copies .env into standalone, which would ship the DB password and
//     service-role key inside the zip.

import { readFile, readdir, access, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const bundle = process.argv[2] ?? join(process.cwd(), '.next', 'eb-bundle')
const expectedSiteUrl = process.env.EXPECTED_SITE_URL ?? ''
const expectedSupabaseUrl = process.env.EXPECTED_SUPABASE_URL ?? ''

const results = []
const check = (ok, label, detail = '') => {
  results.push({ ok, label, detail })
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}${detail ? `  — ${detail}` : ''}`)
}

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

async function walk(dir) {
  const out = []
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return out }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...(await walk(full)))
    else out.push(full)
  }
  return out
}

console.log(`Verifying bundle: ${bundle}\n`)

if (!(await exists(bundle))) {
  console.error(`No bundle at ${bundle} — run scripts/build-eb-bundle.mjs first.`)
  process.exit(1)
}

// ---- required files at the archive root -----------------------------------
for (const f of [
  'server.js',
  'package.json',
  'Procfile',
  'start.sh',
  '.platform/nginx/conf.d/proxy.conf',
]) {
  check(await exists(join(bundle, f)), `root file present: ${f}`)
}

// ---- directories standalone does not populate on its own ------------------
for (const [dir, min] of [['.next/static', 1], ['.next/server', 1], ['node_modules', 1]]) {
  const files = await walk(join(bundle, dir))
  check(files.length >= min, `${dir} populated`, `${files.length} files`)
}

// ---- secrets must not be in the archive -----------------------------------
const allFiles = await walk(bundle)
const envFiles = allFiles.filter(f => /(^|[\\/])\.env($|\.)/.test(relative(bundle, f)))
check(envFiles.length === 0, 'no .env* shipped', envFiles.map(f => relative(bundle, f)).join(', '))

// ---- shell scripts must be LF-only ----------------------------------------
for (const f of ['start.sh', 'Procfile']) {
  const p = join(bundle, f)
  if (!(await exists(p))) continue
  const text = await readFile(p, 'utf8')
  check(!text.includes('\r'), `${f} has no CR`, text.includes('\r') ? 'contains \\r' : '')
}

// ---- start.sh must bind all interfaces ------------------------------------
if (await exists(join(bundle, 'start.sh'))) {
  const startSh = await readFile(join(bundle, 'start.sh'), 'utf8')
  check(/HOSTNAME\s*=\s*0\.0\.0\.0/.test(startSh), 'start.sh sets HOSTNAME=0.0.0.0')
}

// ---- the nginx directives that keep sign-in and CSV upload working --------
const confPath = join(bundle, '.platform/nginx/conf.d/proxy.conf')
if (await exists(confPath)) {
  const conf = await readFile(confPath, 'utf8')
  for (const d of [
    'client_max_body_size 10m',
    'proxy_buffer_size 16k',
    'proxy_buffers 8 16k',
    'proxy_busy_buffers_size 32k',
  ]) {
    check(conf.includes(d), `nginx directive: ${d}`)
  }
}

// ---- the build-time inlining trap -----------------------------------------
// Only executable chunks matter; .js.map legitimately contains original
// sources and would produce a false alarm either way.
const serverJs = (await walk(join(bundle, '.next', 'server'))).filter(
  f => f.endsWith('.js') && !f.endsWith('.map')
)
const staticJs = (await walk(join(bundle, '.next', 'static'))).filter(
  f => f.endsWith('.js') && !f.endsWith('.map')
)

let siteHits = 0
let localhostHits = []
for (const f of serverJs) {
  const text = await readFile(f, 'utf8')
  if (expectedSiteUrl && text.includes(expectedSiteUrl)) siteHits++
  if (text.includes('localhost:3000')) localhostHits.push(relative(bundle, f))
}
if (expectedSiteUrl) {
  check(siteHits > 0, `site URL inlined: ${expectedSiteUrl}`, `${siteHits} server chunk(s)`)
}
check(
  localhostHits.length === 0,
  'no localhost:3000 in executable server chunks',
  localhostHits.slice(0, 3).join(', ')
)

// The Supabase URL is inlined into the BROWSER bundle too. If it were missing
// at build time the client would ship `undefined` and every sign-in would
// fail against a nonexistent host, so assert it is really there.
if (expectedSupabaseUrl) {
  let supaHits = 0
  for (const f of [...serverJs, ...staticJs]) {
    const text = await readFile(f, 'utf8')
    if (text.includes(expectedSupabaseUrl)) supaHits++
  }
  check(supaHits > 0, 'Supabase URL inlined into the bundle', `${supaHits} chunk(s)`)
}

// ---- size sanity ----------------------------------------------------------
let bytes = 0
for (const f of allFiles) bytes += (await stat(f)).size
check(bytes > 10 * 1024 * 1024, 'bundle is a plausible size', `${(bytes / 1024 / 1024).toFixed(1)} MB`)

// ---------------------------------------------------------------------------
const failed = results.filter(r => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) FAILED:`)
  for (const f of failed) console.error(`  - ${f.label}${f.detail ? `: ${f.detail}` : ''}`)
  process.exit(1)
}
console.log('Bundle looks deployable.')
