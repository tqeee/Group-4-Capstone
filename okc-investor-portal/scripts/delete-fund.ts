// Removes a fund and everything tied to it: dataset 5.4 deals
// (investment_transactions), fund flows, and the derived §8.1 ledger rows
// (fund_daily_nav, investor_daily_ledger). This is destructive and there is
// no undo — the shared DB has no soft-delete/archive for funds, and Prisma's
// FK constraints are the default RESTRICT (no onDelete: Cascade anywhere in
// schema.prisma), so child rows must be deleted before the fund itself.
//
// Safe by default: without --yes this only PRINTS what it would delete and
// changes nothing. Import batch rows (import_batches) are deliberately left
// alone — they're an upload audit trail, not fund data, and the schema
// doesn't scope them to a single fund.
//
//   npx tsx scripts/delete-fund.ts <code-or-name>          dry run, no changes
//   npx tsx scripts/delete-fund.ts <code-or-name> --yes    actually deletes
//
// <code-or-name> matches the fund's code exactly (case-insensitive) or its
// name as a substring (case-insensitive) — e.g. "YEN" or "okc-yen-fund" will
// both match a fund named "OKC Yen Fund" with code "YEN".

// `dotenv/config` only reads `.env`, which this project does not have — the
// connection strings live in `.env.local` (same fix as prisma.config.ts;
// without this DATABASE_URL is undefined and the pg driver silently falls
// back to trying localhost:5432, which shows up as ECONNREFUSED).
import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
import { prisma } from '../lib/db'

const query = process.argv[2]
const confirmed = process.argv.includes('--yes')

const money = (v: number) =>
  v.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function main() {
  if (!query) {
    console.error('Usage: npx tsx scripts/delete-fund.ts <code-or-name> [--yes]')
    process.exitCode = 1
    return
  }

  const matches = await prisma.fund.findMany({
    where: {
      OR: [
        { code: { equals: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } },
      ],
    },
  })

  if (matches.length === 0) {
    const all = await prisma.fund.findMany({ select: { code: true, name: true }, orderBy: { code: 'asc' } })
    console.error(`No fund matches "${query}".`)
    console.error('\nFunds that exist:')
    all.forEach(f => console.error(`  ${f.code} — ${f.name}`))
    process.exitCode = 1
    return
  }

  if (matches.length > 1) {
    console.error(`"${query}" matches more than one fund — re-run with the exact code:`)
    matches.forEach(f => console.error(`  ${f.code} — ${f.name}`))
    process.exitCode = 1
    return
  }

  const fund = matches[0]

  const [dealCount, flowCount, navCount, ledgerCount, latestNav] = await Promise.all([
    prisma.deal.count({ where: { fundId: fund.id } }),
    prisma.fundFlow.count({ where: { fundId: fund.id } }),
    prisma.fundDailyNav.count({ where: { fundId: fund.id } }),
    prisma.investorDailyLedger.count({ where: { fundId: fund.id } }),
    prisma.fundDailyNav.findFirst({ where: { fundId: fund.id }, orderBy: { date: 'desc' } }),
  ])

  console.log(`Fund: ${fund.code} — ${fund.name}`)
  console.log(`  id             ${fund.id}`)
  console.log(`  currency       ${fund.currency}`)
  console.log(`  inception date ${fund.inceptionDate.toISOString().slice(0, 10)}`)
  console.log(`  current AUM    ${latestNav ? money(Number(latestNav.closingBalance)) : '—'}`)
  console.log('\nThis will permanently delete:')
  console.log(`  ${dealCount} deal(s) (investment_transactions)`)
  console.log(`  ${flowCount} fund flow(s) (deposit/withdrawal requests)`)
  console.log(`  ${navCount} fund_daily_nav row(s)`)
  console.log(`  ${ledgerCount} investor_daily_ledger row(s)`)
  console.log('\nLeft alone: import_batches rows (upload history, not fund-scoped).')

  if (!confirmed) {
    console.log('\nDry run only — nothing was deleted. Re-run with --yes to actually delete this fund.')
    return
  }

  console.log('\nDeleting…')
  await prisma.$transaction([
    prisma.investorDailyLedger.deleteMany({ where: { fundId: fund.id } }),
    prisma.fundDailyNav.deleteMany({ where: { fundId: fund.id } }),
    prisma.fundFlow.deleteMany({ where: { fundId: fund.id } }),
    prisma.deal.deleteMany({ where: { fundId: fund.id } }),
    prisma.fund.delete({ where: { id: fund.id } }),
    prisma.auditLog.create({
      data: {
        action: 'FUND_DELETED',
        actorEmail: 'system (delete-fund script)',
        detail: `Deleted fund ${fund.code} — ${fund.name} (${dealCount} deals, ${flowCount} flows, ${navCount} nav rows, ${ledgerCount} ledger rows)`,
      },
    }),
  ])

  console.log(`Done. "${fund.code} — ${fund.name}" and all its data have been removed.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
