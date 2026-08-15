// Removes the deals (dataset 5.4 rows) from ONE specific CSV import — e.g. a
// file uploaded into the wrong fund by mistake — without touching anything
// else in that fund. Unlike delete-fund.ts, this leaves the fund, its other
// deals, its fund flows, and the ImportBatch row itself all alone; it only
// deletes investment_transactions rows tied to the matched batch, then
// rebuilds the ledger for whichever fund(s) those rows belonged to (removing
// deals changes daily P&L, so the persisted fund_daily_nav /
// investor_daily_ledger rows for that fund are stale until rebuilt).
//
// Safe by default: without --yes this only PRINTS what it would delete and
// changes nothing.
//
//   npx tsx scripts/remove-import-batch.ts <filename-substring>          dry run
//   npx tsx scripts/remove-import-batch.ts <filename-substring> --yes    deletes + rebuilds
//
// <filename-substring> matches ImportBatch.fileName case-insensitively — e.g.
// "yen" or "okc-yen-fund-usdjpy.csv" will both match a batch uploaded as
// "okc-yen-fund-usdjpy.csv".

// The connection strings live in `.env`, with `.env.local` first so a local
// override wins (same pattern as prisma.config.ts).
import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })
import { prisma } from '../lib/db'
import { rebuildFundLedger } from '../lib/ledger'

const query = process.argv[2]
const confirmed = process.argv.includes('--yes')

const money = (v: number) =>
  v.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function main() {
  if (!query) {
    console.error('Usage: npx tsx scripts/remove-import-batch.ts <filename-substring> [--yes]')
    process.exitCode = 1
    return
  }

  const batches = await prisma.importBatch.findMany({
    where: { fileName: { contains: query, mode: 'insensitive' } },
    orderBy: { uploadedAt: 'desc' },
  })

  if (batches.length === 0) {
    const all = await prisma.importBatch.findMany({
      select: { fileName: true, uploadedAt: true, rowCount: true },
      orderBy: { uploadedAt: 'desc' },
      take: 20,
    })
    console.error(`No import batch matches "${query}".`)
    console.error('\nMost recent uploads:')
    all.forEach(b => console.error(`  ${b.uploadedAt.toISOString().slice(0, 16)}  ${b.fileName}  (${b.rowCount} rows)`))
    process.exitCode = 1
    return
  }

  if (batches.length > 1) {
    console.error(`"${query}" matches more than one upload — re-run with a more specific filename:`)
    batches.forEach(b => console.error(`  id ${b.id}  ${b.uploadedAt.toISOString().slice(0, 16)}  ${b.fileName}  (${b.rowCount} rows)`))
    process.exitCode = 1
    return
  }

  const batch = batches[0]

  // Deals currently tied to this batch, grouped by fund — the batch itself
  // isn't fund-scoped in the schema, but every deal row it created is.
  const deals = await prisma.deal.findMany({
    where: { batchId: batch.id },
    select: { fundId: true, symbol: true, time: true },
  })

  if (deals.length === 0) {
    console.log(`Batch "${batch.fileName}" (uploaded ${batch.uploadedAt.toISOString().slice(0, 10)}) has no remaining deals — nothing to do.`)
    return
  }

  const fundIds = [...new Set(deals.map(d => d.fundId))]
  const funds = await prisma.fund.findMany({ where: { id: { in: fundIds } } })
  const fundById = new Map(funds.map(f => [f.id, f]))
  const symbols = [...new Set(deals.map(d => d.symbol))]
  const dates = deals.map(d => d.time.toISOString().slice(0, 10)).sort()

  console.log(`Import batch: ${batch.fileName}`)
  console.log(`  uploaded    ${batch.uploadedAt.toISOString().slice(0, 16)} by ${batch.uploadedBy}`)
  console.log(`  symbols     ${symbols.join(', ')}`)
  console.log(`  date range  ${dates[0]} – ${dates[dates.length - 1]}`)
  console.log('\nDeals currently in the database from this batch, by fund:')
  for (const fundId of fundIds) {
    const fund = fundById.get(fundId)
    const count = deals.filter(d => d.fundId === fundId).length
    console.log(`  ${fund ? `${fund.code} — ${fund.name}` : fundId}: ${count} deal(s)`)
  }
  console.log('\nLeft alone: the import_batches row itself, fund flows, and every other deal in the affected fund(s).')

  if (!confirmed) {
    console.log('\nDry run only — nothing was deleted. Re-run with --yes to delete these deals and rebuild the affected fund(s).')
    return
  }

  console.log('\nDeleting…')
  const { count: deletedCount } = await prisma.deal.deleteMany({ where: { batchId: batch.id } })
  await prisma.auditLog.create({
    data: {
      action: 'DEALS_REMOVED',
      actorEmail: 'system (remove-import-batch script)',
      detail: `Removed ${deletedCount} deal(s) from batch "${batch.fileName}" (uploaded ${batch.uploadedAt.toISOString().slice(0, 10)}) across fund(s): ${fundIds.map(id => fundById.get(id)?.code ?? id).join(', ')}`,
    },
  })
  console.log(`Deleted ${deletedCount} deal(s).`)

  for (const fundId of fundIds) {
    const fund = fundById.get(fundId)
    console.log(`\nRebuilding ledger for ${fund ? `${fund.code} — ${fund.name}` : fundId}…`)
    await rebuildFundLedger(fundId)
    const latestNav = await prisma.fundDailyNav.findFirst({ where: { fundId }, orderBy: { date: 'desc' } })
    const remainingDeals = await prisma.deal.count({ where: { fundId } })
    console.log(`  done — ${remainingDeals} deal(s) remain, current AUM ${latestNav ? money(Number(latestNav.closingBalance)) : '—'}`)
  }

  console.log('\nDone. Run `npx tsx scripts/rebuild-ledgers.ts --check` to confirm every fund still reconciles.')
}

main()
  .catch(e => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
