// Recomputes the §8.1 daily workings for every fund from source data.
//
//   npx tsx scripts/rebuild-ledgers.ts --check    report only, writes nothing
//   npx tsx scripts/rebuild-ledgers.ts            rebuild, then report
//
// Only the two derived tables are touched — fund_daily_nav and
// investor_daily_ledger are deleted and rewritten per fund, inside a
// transaction. Source data (investment_transactions, fund_flows, investors,
// funds) is read but never modified, so a rebuild is always safe to repeat and
// always reproducible from the source rows.
//
// Run this after any change to lib/ledger.ts: the fix lives in the replay
// logic, but the numbers the portal shows come from these stored rows, so
// nothing changes on screen until they are recomputed.

import 'dotenv/config'
import { prisma } from '../lib/db'
import { rebuildAllLedgers } from '../lib/ledger'

const checkOnly = process.argv.includes('--check')

const n = (d: unknown) => Number(d)
const round2 = (v: number) => Math.round(v * 100) / 100
const round8 = (v: number) => Math.round(v * 1e8) / 1e8
const money = (v: number) =>
  v.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

type Snapshot = {
  code: string
  name: string
  days: number
  aum: number
  totalPnl: number
  returnPct: number
  problems: string[]
}

async function snapshot(): Promise<Snapshot[]> {
  const funds = await prisma.fund.findMany({ orderBy: { code: 'asc' } })
  const out: Snapshot[] = []

  for (const fund of funds) {
    const [nav, ledger] = await Promise.all([
      prisma.fundDailyNav.findMany({ where: { fundId: fund.id }, orderBy: { date: 'asc' } }),
      prisma.investorDailyLedger.findMany({ where: { fundId: fund.id } }),
    ])

    // Group the per-investor rows by day so each fund row can be reconciled
    // against the investors it is meant to be the sum of.
    const byDay = new Map<number, typeof ledger>()
    for (const row of ledger) {
      const key = row.date.getTime()
      byDay.set(key, [...(byDay.get(key) ?? []), row])
    }

    const problems: string[] = []
    const note = (msg: string) => {
      // Cap the output: if the books are broken they tend to be broken a lot.
      if (problems.length < 5) problems.push(msg)
      else if (problems.length === 5) problems.push('…')
    }

    let factor = 1
    nav.forEach((row, i) => {
      const date = row.date.toISOString().slice(0, 10)
      const opening = n(row.openingBalance)
      const pnl = n(row.pnl)
      const netFlows = n(row.netFlows)
      const closing = n(row.closingBalance)
      const rows = byDay.get(row.date.getTime()) ?? []
      const sum = (vs: number[]) => vs.reduce((a, b) => a + b, 0)

      if (round2(opening + pnl + netFlows) !== closing) {
        note(`${date}: opening + pnl + netFlows (${money(round2(opening + pnl + netFlows))}) != closing (${money(closing)})`)
      }
      if (i > 0 && opening !== n(nav[i - 1].closingBalance)) {
        note(`${date}: opens at ${money(opening)} but previous day closed at ${money(n(nav[i - 1].closingBalance))}`)
      }
      if (round2(sum(rows.map(r => n(r.pnl)))) !== pnl) {
        note(`${date}: investor P&L sums to ${money(round2(sum(rows.map(r => n(r.pnl)))))}, fund P&L is ${money(pnl)}`)
      }
      if (round2(sum(rows.map(r => n(r.closingValue)))) !== closing) {
        note(`${date}: investor values sum to ${money(round2(sum(rows.map(r => n(r.closingValue)))))}, fund closing is ${money(closing)}`)
      }
      if (closing !== 0 && round8(sum(rows.map(r => n(r.closingSharePct)))) !== 1) {
        note(`${date}: shareholdings sum to ${round8(sum(rows.map(r => n(r.closingSharePct))))}, not 1`)
      }
      if (closing < 0) note(`${date}: negative NAV (${money(closing)})`)

      if (opening > 0) factor *= 1 + pnl / opening
    })

    out.push({
      code: fund.code,
      name: fund.name,
      days: nav.length,
      aum: nav.length > 0 ? n(nav[nav.length - 1].closingBalance) : 0,
      totalPnl: nav.reduce((s, d) => s + n(d.pnl), 0),
      returnPct: (factor - 1) * 100,
      problems,
    })
  }

  return out
}

function report(title: string, snaps: Snapshot[], before?: Snapshot[]) {
  console.log(`\n${title}`)
  console.log('─'.repeat(title.length))

  for (const s of snaps) {
    const prev = before?.find(b => b.code === s.code)
    const delta = (now: number, was: number | undefined) =>
      was === undefined || round2(now) === round2(was) ? '' : `  (was ${money(was)})`

    console.log(`\n${s.code} — ${s.name}`)
    console.log(`  days recorded  ${s.days}${prev && prev.days !== s.days ? `  (was ${prev.days})` : ''}`)
    console.log(`  AUM            ${money(s.aum)}${delta(s.aum, prev?.aum)}`)
    console.log(`  total P&L      ${money(s.totalPnl)}${delta(s.totalPnl, prev?.totalPnl)}`)
    console.log(`  fund return    ${s.returnPct.toFixed(4)}%${prev && round8(prev.returnPct) !== round8(s.returnPct) ? `  (was ${prev.returnPct.toFixed(4)}%)` : ''}`)

    if (s.problems.length === 0) {
      console.log('  reconciliation OK')
    } else {
      console.log(`  RECONCILIATION FAILED (${s.problems.length === 6 ? '5+' : s.problems.length}):`)
      for (const p of s.problems) console.log(`    - ${p}`)
    }
  }
}

async function main() {
  const before = await snapshot()

  if (checkOnly) {
    report('Current state (no changes made)', before)
    const broken = before.filter(s => s.problems.length > 0)
    console.log(
      broken.length === 0
        ? '\nAll funds reconcile.'
        : `\n${broken.length} fund(s) do not reconcile — rerun without --check to rebuild.`
    )
    return
  }

  report('Before rebuild', before)

  console.log('\nRebuilding…')
  const started = Date.now()
  await rebuildAllLedgers()
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`)

  const after = await snapshot()
  report('After rebuild', after, before)

  const broken = after.filter(s => s.problems.length > 0)
  if (broken.length > 0) {
    console.error(`\n${broken.length} fund(s) still do not reconcile after rebuilding.`)
    process.exitCode = 1
  } else {
    console.log('\nAll funds reconcile.')
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
