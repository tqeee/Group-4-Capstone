'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { prisma } from '@/lib/db'
import { requireRole } from '@/lib/auth/guards'
import { rebuildFundLedger } from '@/lib/ledger'
import { audit } from '@/lib/audit'
import { buildImportSummary, checkImportAgainstFund } from '@/lib/importValidation'
import type { ImportSummary, ParsedDealRow } from '@/lib/importValidation'

// NB: do not re-export ImportSummary from here. Next's 'use server' transform
// enumerates this module's exports at runtime, and re-exporting an imported
// type emits a reference to a binding that does not exist once types are
// erased — which throws "ImportSummary is not defined" as the module loads,
// breaking every import regardless of file or fund. Consumers that need the
// type should import it from '@/lib/importValidation' directly.

export type ImportState =
  | { status: 'success'; message: string; inserted: number; skipped: number; summary: ImportSummary }
  // The file's contents look inconsistent with the chosen fund. Not an error —
  // a fund legitimately can start trading a new instrument — so the operator is
  // shown what was found and can resubmit to override.
  | { status: 'confirm'; message: string; warnings: string[]; summary: ImportSummary }
  | { status: 'error'; message: string; summary?: ImportSummary }
  | undefined

// MT5 exports carry `type`/`entry` either as numeric codes (dataset 5.4 spec)
// or as strings — the firm's workbook ("sample data portal.xlsm") uses
// 'buy'/'sell'/'balance' and 'IN'/'OUT'. Map both onto the codes we store.
const DEAL_TYPES: Record<string, number> = { buy: 0, sell: 1, balance: 2, credit: 3 }
const ENTRY_TYPES: Record<string, number> = { in: 0, out: 1, inout: 2, 'out by': 3 }

function parseEnum(raw: string | undefined, map: Record<string, number>): number | null {
  const trimmed = (raw ?? '').trim().toLowerCase()
  if (trimmed === '') return null
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return map[trimmed] ?? null
}

// 1970-01-01 expressed in Excel serial days (epoch 1899-12-30).
const EXCEL_EPOCH_OFFSET_DAYS = 25569

// `time_msc` (unix ms) is preferred when present — it's unambiguous and
// survives any CSV export untouched. `time` varies by source: the firm's
// workbook stores an Excel serial date (fractional days, e.g. 46098.238…),
// other exports use unix seconds/ms or a date string. Accept all of them.
function parseDealTime(timeRaw: string | undefined, timeMscRaw: string | undefined): Date | null {
  const msc = Number((timeMscRaw ?? '').trim())
  if (Number.isFinite(msc) && msc >= 1e12) {
    return new Date(msc)
  }

  const trimmed = (timeRaw ?? '').trim()
  if (trimmed === '') return null

  const n = Number(trimmed)
  if (Number.isFinite(n)) {
    if (n >= 1e12) return new Date(n) // unix milliseconds
    if (n >= 1e9) return new Date(n * 1000) // unix seconds
    if (n >= 20000 && n < 100000) {
      // Excel serial date (1954–2173), fractional days since 1899-12-30 UTC.
      return new Date(Math.round((n - EXCEL_EPOCH_OFFSET_DAYS) * 86400 * 1000))
    }
    return null
  }

  const d = new Date(trimmed)
  return isNaN(d.getTime()) ? null : d
}

const toNum = (v: string | undefined) => {
  const n = Number((v ?? '').trim())
  return Number.isFinite(n) ? n : 0
}

// Ingestion pipeline for daily P&L updates (§3.2): parse the raw broker CSV,
// validate rows, skip duplicates (by ticket), store the fields we keep from
// dataset 5.4, record an ImportBatch for auditability, and replay the ledger.
export async function importDealsCsv(
  _prevState: ImportState,
  formData: FormData
): Promise<ImportState> {
  const guard = await requireRole('operations')
  if (!guard.ok) return { status: 'error', message: guard.message }

  const file = formData.get('file')
  const fundId = formData.get('fundId')
  // Set by the "Import anyway" button when the operator has seen the warnings
  // and wants to proceed regardless.
  const overrideWarnings = formData.get('confirm') === 'true'

  if (!(file instanceof File) || file.size === 0) {
    return { status: 'error', message: 'Please choose a CSV file to import.' }
  }
  if (file.size > 50 * 1024 * 1024) {
    return { status: 'error', message: 'File is larger than the 50MB limit.' }
  }
  const fund =
    typeof fundId === 'string' ? await prisma.fund.findUnique({ where: { id: fundId } }) : null
  if (!fund) {
    return { status: 'error', message: 'Please choose a valid fund.' }
  }

  const text = await file.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return { status: 'error', message: `Could not parse CSV: ${parsed.errors[0].message}` }
  }

  const required = ['ticket', 'profit', 'symbol']
  const headers = parsed.meta.fields ?? []
  const missing = required.filter(c => !headers.includes(c))
  if (!headers.includes('time') && !headers.includes('time_msc')) {
    missing.push('time or time_msc')
  }
  if (missing.length > 0) {
    return {
      status: 'error',
      message: `CSV is missing required column(s): ${missing.join(', ')}. Expected the raw broker deal export (dataset 5.4).`,
    }
  }

  const rows: {
    ticket: bigint
    fundId: string
    order: bigint | null
    time: Date
    type: number
    entry: number
    positionId: bigint | null
    volume: number
    price: number
    commission: number
    swap: number
    profit: number
    fee: number
    symbol: string
    comment: string | null
  }[] = []
  let skipped = 0
  let balanceRows = 0
  // Minimal shape the validation needs. `magic` (strategy id) is not stored on
  // Deal — one fund runs many strategies, so it identifies an EA, not a fund —
  // but reporting it lets ops confirm the file holds what they expect.
  const parsedRows: ParsedDealRow[] = []

  for (const row of parsed.data) {
    const ticketRaw = (row.ticket ?? '').trim()
    const time = parseDealTime(row.time, row.time_msc)
    const type = parseEnum(row.type, DEAL_TYPES)

    // Balance rows are broker-account deposits/withdrawals, not trades. The
    // portal tracks money movement as fund flows (dataset 5.2), so these are
    // reported back to the operator instead of being imported as P&L.
    if (type === 2) {
      balanceRows++
      continue
    }

    if (!/^\d+$/.test(ticketRaw) || !time || !(row.symbol ?? '').trim()) {
      skipped++
      continue
    }

    const symbol = row.symbol.trim()
    parsedRows.push({
      ticket: BigInt(ticketRaw),
      symbol,
      time,
      magic: (row.magic ?? '').trim() || null,
    })

    rows.push({
      ticket: BigInt(ticketRaw),
      fundId: fund.id,
      order: /^\d+$/.test((row.order ?? '').trim()) ? BigInt(row.order.trim()) : null,
      time,
      type: type ?? 0,
      entry: parseEnum(row.entry, ENTRY_TYPES) ?? 0,
      positionId: /^\d+$/.test((row.position_id ?? '').trim())
        ? BigInt(row.position_id.trim())
        : null,
      volume: toNum(row.volume),
      price: toNum(row.price),
      commission: toNum(row.commission),
      swap: toNum(row.swap),
      profit: toNum(row.profit),
      fee: toNum(row.fee),
      symbol,
      comment: row.comment?.trim() || null,
    })
  }

  const summary = buildImportSummary({
    fileName: file.name,
    fundName: fund.name,
    rows: parsedRows,
    balanceRows,
    invalidRows: skipped,
  })

  if (rows.length === 0) {
    return {
      status: 'error',
      message: `No valid deal rows found (${skipped} invalid, ${balanceRows} balance row(s)).`,
      summary,
    }
  }

  // Catch the obvious mistake of pointing a file at the wrong fund before
  // anything is written (see lib/importValidation.ts for why this can only
  // ever be a warning, never an automatic routing decision).
  const warnings = await checkImportAgainstFund(fund, parsedRows, summary.symbols)

  if (warnings.length > 0 && !overrideWarnings) {
    return {
      status: 'confirm',
      message: `Check this file matches ${fund.name} before importing.`,
      warnings,
      summary,
    }
  }

  const batch = await prisma.importBatch.create({
    data: {
      fileName: file.name,
      kind: 'deals',
      uploadedBy: guard.email,
      rowCount: 0,
      skipped,
      status: 'Processing',
    },
  })

  // Duplicate tickets (re-uploaded files) are skipped, making imports
  // idempotent and safe to retry.
  const result = await prisma.deal.createMany({
    data: rows.map(r => ({ ...r, batchId: batch.id })),
    skipDuplicates: true,
  })
  const duplicates = rows.length - result.count

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      rowCount: result.count,
      skipped: skipped + duplicates + balanceRows,
      status: 'Validated',
    },
  })

  await rebuildFundLedger(fund.id)

  await audit('DATA_IMPORTED', {
    actor: guard.email,
    detail:
      `${file.name} -> ${fund.name}: ${result.count} deals inserted, ${skipped} invalid, ` +
      `${duplicates} duplicates, ${balanceRows} balance rows` +
      `, symbols: ${summary.symbols.map(s => s.symbol).join('/') || 'none'}` +
      (overrideWarnings ? ' [imported despite warnings]' : ''),
  })

  revalidatePath('/data-import')
  revalidatePath('/operations')
  return {
    status: 'success',
    inserted: result.count,
    skipped: skipped + duplicates + balanceRows,
    summary,
    message: `${file.name} -> ${fund.name}: ${result.count} deal(s) imported${duplicates ? `, ${duplicates} duplicate(s) skipped` : ''}${skipped ? `, ${skipped} invalid row(s) skipped` : ''}${balanceRows ? `, ${balanceRows} balance row(s) (deposits/withdrawals) excluded — record those as fund flows` : ''}. Ledger recalculated.`,
  }
}
