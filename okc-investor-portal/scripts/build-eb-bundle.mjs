// Assembles the Elastic Beanstalk deployment bundle from a standalone build.
//
//   NEXT_PUBLIC_SITE_URL=https://okcportal.app npx next build
//   node scripts/build-eb-bundle.mjs
//
// This used to be done by hand, which is how Procfile, start.sh and
// .platform/ came to exist ONLY inside the built artifact — one `next build`
// (which clears .next/) destroyed them. They live in the repo now, and this
// script copies them in.
//
// Layout it produces, which is what the Node.js platform on AL2023 expects:
//
//   .next/eb-bundle/
//     server.js        \
//     package.json      >  from .next/standalone (Next's own output)
//     node_modules/    /
//     .next/           traced server build + static/ copied in beside it
//     public/          not traced by standalone; must be copied
//     Procfile         web: sh start.sh
//     start.sh         pins HOSTNAME=0.0.0.0 (see the file for why)
//     .platform/       nginx overrides (proxy buffers, body size)

import { cp, rm, mkdir, access, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const standalone = join(root, '.next', 'standalone')
const out = join(root, '.next', 'eb-bundle')

async function exists(p) {
  try { await access(p); return true } catch { return false }
}

if (!(await exists(standalone))) {
  console.error(
    'No .next/standalone — run `next build` first, with output: "standalone" in next.config.ts.'
  )
  process.exit(1)
}

// A stale bundle would quietly ship files the current build no longer emits.
await rm(out, { recursive: true, force: true })
await mkdir(out, { recursive: true })

// Next's standalone output is already the server root: server.js, a pruned
// node_modules, package.json and the traced .next/server.
await cp(standalone, out, { recursive: true })

// Two things standalone deliberately leaves out, because it has no way to know
// how they will be served: the client-side static chunks and /public.
await cp(join(root, '.next', 'static'), join(out, '.next', 'static'), { recursive: true })
if (await exists(join(root, 'public'))) {
  await cp(join(root, 'public'), join(out, 'public'), { recursive: true })
}

// Platform config. .platform must sit at the bundle root for EB to apply it.
for (const entry of ['Procfile', 'start.sh', '.platform']) {
  const from = join(root, entry)
  if (!(await exists(from))) {
    console.error(`Missing ${entry} at the repo root — the bundle needs it.`)
    process.exit(1)
  }
  await cp(from, join(out, entry), { recursive: true })
}

// Procfile runs `sh start.sh`, so start.sh needs no exec bit — but zip on
// Windows would not preserve one anyway. Normalise CRLF: /bin/sh on Linux
// fails with "not found" on a shebang line ending in \r.
for (const f of ['start.sh', 'Procfile']) {
  const p = join(out, f)
  await writeFile(p, (await readFile(p, 'utf8')).replace(/\r\n/g, '\n'))
}

// Next copies .env into standalone. The EB environment supplies the runtime
// secrets as environment properties, so shipping the file would duplicate the
// DB password, service-role key and Resend key inside the zip for no benefit.
// (NEXT_PUBLIC_* are already inlined at build time and unaffected by this.)
await rm(join(out, '.env'), { force: true })

console.log('Bundle ready:', out)
