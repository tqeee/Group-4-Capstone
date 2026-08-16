// Benchmarks how long the investor dashboard (/investor) takes to load real
// P&L data after login, against the 3-second non-functional requirement.
//
//   TARGET_URL=http://localhost:3000 \
//   TEST_INVESTOR_EMAIL=... TEST_INVESTOR_PASSWORD=... \
//   npx tsx scripts/benchmark-dashboard.ts
//
// TARGET_URL defaults to localhost so this can be validated against the real
// dev environment before pointing it at production. Credentials are never
// hardcoded — only ever read from the environment, and never logged.
//
// "Loaded" is measured from the moment the post-login redirect lands on
// /investor (login/auth latency is a separate concern from dashboard load)
// until real P&L content is visible: the "NAV as of" badge, which only
// renders once the server has actual ledger data (a fresh investor with no
// data gets a "Let's get started" empty state instead), and the portfolio
// chart's <canvas> having been laid out and drawn to by Chart.js.

import 'dotenv/config'
import { chromium } from 'playwright'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const TARGET_URL = (process.env.TARGET_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.TEST_INVESTOR_EMAIL
const PASSWORD = process.env.TEST_INVESTOR_PASSWORD
const RUNS = 5
const BUDGET_MS = 3000
const SCREENSHOT_PATH = path.resolve('dashboard-benchmark-screenshot.png')
const CDP_PORT = 9222

if (!EMAIL || !PASSWORD) {
  console.error(
    'Set TEST_INVESTOR_EMAIL and TEST_INVESTOR_PASSWORD environment variables before running this script.'
  )
  process.exit(1)
}

type RunResult = {
  dashboardVisibleMs: number
  domContentLoadedMs: number | null
  loadEventMs: number | null
  lcpMs: number | null
}

// Installed before every navigation in the context (Playwright re-runs init
// scripts on each new document) — has to be in place from the very first
// paint of the post-login /investor document, so it's added once up front
// rather than read after the fact, which would miss early LCP candidates.
const LCP_OBSERVER_SCRIPT = `
  window.__lcp = null;
  try {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) window.__lcp = last.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
`

async function loginAndMeasure(page: import('playwright').Page): Promise<RunResult> {
  await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[name="email"]', EMAIL!)
  await page.fill('input[name="password"]', PASSWORD!)

  // The clock starts once we're actually on /investor — everything before
  // this (auth, the redirect) is login latency, not dashboard load time.
  await Promise.all([
    page.waitForURL('**/investor', { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ])
  const start = Date.now()

  await page.waitForSelector('text=NAV as of', { timeout: 15000 })
  await page.waitForFunction(
    () => {
      const c = document.querySelector('canvas')
      return !!c && c.width > 0 && c.height > 0
    },
    { timeout: 15000 }
  )
  const dashboardVisibleMs = Date.now() - start

  const timing = await page.evaluate(() => {
    const [nav] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    return {
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
      loadEventMs: nav ? nav.loadEventEnd : null,
      lcpMs: (window as unknown as { __lcp: number | null }).__lcp,
    }
  })

  return { dashboardVisibleMs, ...timing }
}

async function runTimingBenchmark(): Promise<RunResult[]> {
  const browser = await chromium.launch({ headless: true })
  const results: RunResult[] = []
  try {
    for (let i = 0; i < RUNS; i++) {
      // Fresh context per run — a real user hits this cold on login, not
      // with a warm cache from a previous run in the same session.
      const context = await browser.newContext()
      const page = await context.newPage()
      await page.addInitScript(LCP_OBSERVER_SCRIPT)
      console.log(`Run ${i + 1}/${RUNS}...`)
      const result = await loginAndMeasure(page)
      results.push(result)
      console.log(`  dashboard visible: ${result.dashboardVisibleMs}ms`)
      await context.close()
    }

    // One more login, held open, for the evidence screenshot.
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.addInitScript(LCP_OBSERVER_SCRIPT)
    await loginAndMeasure(page)
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true })
    await context.close()
  } finally {
    await browser.close()
  }
  return results
}

type LighthouseResult = { performanceScore: number; timeToInteractiveMs: number } | { error: string }

async function runLighthouseAudit(): Promise<LighthouseResult> {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'okc-lh-'))
  // A persistent context (a real Chrome profile directory), not an isolated
  // Playwright context: Lighthouse attaches over CDP to the browser's
  // default target and needs to see the SAME cookie jar the login just set,
  // which an ephemeral `browser.newContext()` profile would hide from it.
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    args: [`--remote-debugging-port=${CDP_PORT}`],
  })
  try {
    const page = context.pages()[0] ?? (await context.newPage())
    await page.goto(`${TARGET_URL}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[name="email"]', EMAIL!)
    await page.fill('input[name="password"]', PASSWORD!)
    await Promise.all([
      page.waitForURL('**/investor', { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ])
    await page.waitForSelector('text=NAV as of', { timeout: 15000 })

    const { default: lighthouse } = await import('lighthouse')
    const runnerResult = await lighthouse(
      `${TARGET_URL}/investor`,
      { port: CDP_PORT, logLevel: 'error', onlyCategories: ['performance'] }
    )
    if (!runnerResult) throw new Error('Lighthouse returned no result')

    const { lhr } = runnerResult
    return {
      performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      timeToInteractiveMs: lhr.audits['interactive']?.numericValue ?? -1,
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  } finally {
    await context.close()
    fs.rmSync(userDataDir, { recursive: true, force: true })
  }
}

function summarize(results: RunResult[]) {
  const times = results.map(r => r.dashboardVisibleMs)
  const avg = times.reduce((a, b) => a + b, 0) / times.length
  const min = Math.min(...times)
  const max = Math.max(...times)
  return { avg, min, max }
}

async function main() {
  console.log(`Target: ${TARGET_URL}/investor`)
  console.log(`Runs: ${RUNS}\n`)

  const results = await runTimingBenchmark()
  const { avg, min, max } = summarize(results)

  console.log('\nPer-run detail:')
  results.forEach((r, i) => {
    console.log(
      `  Run ${i + 1}: visible=${r.dashboardVisibleMs}ms` +
        `  DCL=${r.domContentLoadedMs?.toFixed(0) ?? 'n/a'}ms` +
        `  load=${r.loadEventMs?.toFixed(0) ?? 'n/a'}ms` +
        `  LCP=${r.lcpMs?.toFixed(0) ?? 'n/a'}ms`
    )
  })

  console.log('\nRunning Lighthouse audit (authenticated /investor)...')
  const lighthouseResult = await runLighthouseAudit()

  console.log('\n=== Dashboard Load Benchmark ===')
  console.log(`Dashboard visible — avg: ${avg.toFixed(0)}ms, min: ${min}ms, max: ${max}ms (n=${RUNS})`)

  if ('error' in lighthouseResult) {
    console.log(`Lighthouse audit: skipped (${lighthouseResult.error})`)
  } else {
    console.log(
      `Lighthouse — Performance score: ${lighthouseResult.performanceScore}/100, ` +
        `Time to Interactive: ${lighthouseResult.timeToInteractiveMs.toFixed(0)}ms`
    )
  }

  console.log(`\nScreenshot saved: ${SCREENSHOT_PATH}`)

  const marginMs = BUDGET_MS - avg
  console.log(`\nBudget: ${BUDGET_MS}ms (3 seconds)`)
  if (avg <= BUDGET_MS) {
    console.log(`RESULT: PASS — averaged ${avg.toFixed(0)}ms, ${marginMs.toFixed(0)}ms under budget.`)
  } else {
    console.log(`RESULT: FAIL — averaged ${avg.toFixed(0)}ms, ${Math.abs(marginMs).toFixed(0)}ms OVER budget.`)
  }
  if (max > BUDGET_MS && avg <= BUDGET_MS) {
    console.log(`NOTE: the average passes but the slowest run (${max}ms) exceeded budget — worth a closer look.`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
