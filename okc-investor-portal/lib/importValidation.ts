import { prisma } from '@/lib/db'

// Sanity checks run before a broker deal export is imported into a fund.
//
// The industry norm is one broker account per fund, so a deal export belongs to
// exactly one fund and the operator picks it at upload. Nothing inside an MT5
// export identifies the fund — there is no account column, `symbol` can be
// shared by two funds, and `magic` is a strategy id (one fund runs several) —
// so the operator's choice cannot be verified automatically. What we can do is
// catch the obvious mistake of pointing a file at the wrong fund and make them
// confirm.
//
// The pure functions here take plain data and are unit-tested without a
// database; `checkImportAgainstFund` is the thin wrapper that fetches what they
// need. Same split as computeFundLedger / rebuildFundLedger in lib/ledger.ts.

// What the importer detected in the uploaded file. Surfaced to the operator on
// every outcome so an import is never a black box.
export type ImportSummary = {
  fileName: string
  fundName: string
  dealRows: number
  balanceRows: number
  invalidRows: number
  symbols: { symbol: string; count: number }[]
  strategies: { magic: string; count: number }[]
  dateFrom: string | null
  dateTo: string | null
}

export type ParsedDealRow = {
  ticket: bigint
  symbol: string
  time: Date
  magic: string | null
}

export function buildImportSummary(input: {
  fileName: string
  fundName: string
  rows: ParsedDealRow[]
  balanceRows: number
  invalidRows: number
}): ImportSummary {
  const symbolCounts = new Map<string, number>()
  const magicCounts = new Map<string, number>()
  let minTime: Date | null = null
  let maxTime: Date | null = null

  for (const r of input.rows) {
    symbolCounts.set(r.symbol, (symbolCounts.get(r.symbol) ?? 0) + 1)
    // magic 0 is MT5's "no strategy" placeholder — reporting it as a strategy
    // would be noise.
    if (r.magic && r.magic !== '0') {
      magicCounts.set(r.magic, (magicCounts.get(r.magic) ?? 0) + 1)
    }
    if (!minTime || r.time < minTime) minTime = r.time
    if (!maxTime || r.time > maxTime) maxTime = r.time
  }

  return {
    fileName: input.fileName,
    fundName: input.fundName,
    dealRows: input.rows.length,
    balanceRows: input.balanceRows,
    invalidRows: input.invalidRows,
    symbols: [...symbolCounts.entries()]
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count),
    strategies: [...magicCounts.entries()]
      .map(([magic, count]) => ({ magic, count }))
      .sort((a, b) => b.count - a.count),
    dateFrom: minTime ? minTime.toISOString() : null,
    dateTo: maxTime ? maxTime.toISOString() : null,
  }
}

// Pure: given what the file contains and what the fund already holds, decide
// what the operator should be warned about.
export function detectFundMismatch(input: {
  fundName: string
  fileSymbols: { symbol: string; count: number }[]
  fundSymbols: string[]
  ticketsElsewhere: { fundName: string; count: number }[]
  sampledTickets: number
}): string[] {
  const warnings: string[] = []

  // Only flag when NONE of the file's instruments are ones this fund trades. A
  // partial overlap is normal — a fund can legitimately start trading something
  // new — and warning on that would train operators to click through.
  if (input.fundSymbols.length > 0 && input.fileSymbols.length > 0) {
    const known = new Set(input.fundSymbols)
    const unknown = input.fileSymbols.filter(s => !known.has(s.symbol))
    if (unknown.length === input.fileSymbols.length) {
      warnings.push(
        `${input.fundName} has only ever traded ${input.fundSymbols.join(', ')}, but this file ` +
          `contains ${unknown.map(u => `${u.symbol} (${u.count} deals)`).join(', ')}. ` +
          `That usually means the file belongs to a different fund.`
      )
    }
  }

  // Tickets are globally unique, so deals already filed under another fund are
  // silently dropped by skipDuplicates — the operator would see "0 imported"
  // with no explanation.
  if (input.ticketsElsewhere.length > 0) {
    const detail = input.ticketsElsewhere
      .map(f => `${f.count} already in ${f.fundName}`)
      .join(', ')
    warnings.push(
      `Deals from this file are already recorded under another fund (${detail}, ` +
        `of ${input.sampledTickets} checked). Re-importing them here will skip them as ` +
        `duplicates rather than move them.`
    )
  }

  return warnings
}

// How many tickets to test for prior ownership. Enough to spot a wrong-fund
// upload without building a huge IN clause for a large file.
const TICKET_SAMPLE_SIZE = 500

// Fetches what detectFundMismatch needs, then applies it.
export async function checkImportAgainstFund(
  fund: { id: string; name: string },
  rows: ParsedDealRow[],
  fileSymbols: { symbol: string; count: number }[]
): Promise<string[]> {
  const sampledTickets = rows.slice(0, TICKET_SAMPLE_SIZE).map(r => r.ticket)

  const [existingSymbols, elsewhere] = await Promise.all([
    prisma.deal.groupBy({
      by: ['symbol'],
      where: { fundId: fund.id },
      _count: { _all: true },
    }),
    prisma.deal.findMany({
      where: { ticket: { in: sampledTickets }, fundId: { not: fund.id } },
      select: { fundId: true },
    }),
  ])

  const countByFundId = new Map<string, number>()
  for (const d of elsewhere) {
    countByFundId.set(d.fundId, (countByFundId.get(d.fundId) ?? 0) + 1)
  }
  const otherFunds =
    countByFundId.size > 0
      ? await prisma.fund.findMany({
          where: { id: { in: [...countByFundId.keys()] } },
          select: { id: true, name: true },
        })
      : []

  return detectFundMismatch({
    fundName: fund.name,
    fileSymbols,
    fundSymbols: existingSymbols.map(s => s.symbol),
    ticketsElsewhere: otherFunds.map(f => ({
      fundName: f.name,
      count: countByFundId.get(f.id) ?? 0,
    })),
    sampledTickets: sampledTickets.length,
  })
}
