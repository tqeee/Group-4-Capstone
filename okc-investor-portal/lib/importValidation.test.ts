import { describe, it, expect } from 'vitest'
import { buildImportSummary, detectFundMismatch, type ParsedDealRow } from './importValidation'

const deal = (ticket: number, symbol: string, iso: string, magic: string | null = null): ParsedDealRow => ({
  ticket: BigInt(ticket),
  symbol,
  time: new Date(iso),
  magic,
})

describe('buildImportSummary', () => {
  it('counts instruments and strategies, and spans the real date range', () => {
    const summary = buildImportSummary({
      fileName: 'export.csv',
      fundName: 'OKC Gold Fund',
      rows: [
        deal(1, 'XAUUSD', '2026-03-17T05:00:00Z', '12345678'),
        deal(2, 'XAUUSD', '2026-03-18T05:00:00Z', '12345678'),
        deal(3, 'XAUUSD', '2026-04-08T05:00:00Z', '88888'),
      ],
      balanceRows: 1,
      invalidRows: 2,
    })

    expect(summary.dealRows).toBe(3)
    expect(summary.balanceRows).toBe(1)
    expect(summary.invalidRows).toBe(2)
    expect(summary.symbols).toEqual([{ symbol: 'XAUUSD', count: 3 }])
    // Sorted by frequency, so the dominant strategy leads.
    expect(summary.strategies).toEqual([
      { magic: '12345678', count: 2 },
      { magic: '88888', count: 1 },
    ])
    expect(summary.dateFrom).toBe('2026-03-17T05:00:00.000Z')
    expect(summary.dateTo).toBe('2026-04-08T05:00:00.000Z')
  })

  it("ignores MT5's magic=0 placeholder rather than reporting it as a strategy", () => {
    const summary = buildImportSummary({
      fileName: 'f.csv',
      fundName: 'F',
      rows: [deal(1, 'QQQ', '2026-01-02T00:00:00Z', '0'), deal(2, 'QQQ', '2026-01-03T00:00:00Z', null)],
      balanceRows: 0,
      invalidRows: 0,
    })
    expect(summary.strategies).toEqual([])
  })

  it('handles an empty file without inventing a date range', () => {
    const summary = buildImportSummary({
      fileName: 'empty.csv',
      fundName: 'F',
      rows: [],
      balanceRows: 0,
      invalidRows: 0,
    })
    expect(summary.dealRows).toBe(0)
    expect(summary.dateFrom).toBeNull()
    expect(summary.dateTo).toBeNull()
  })
})

describe('detectFundMismatch', () => {
  const base = {
    fundName: 'OKC Alpha Fund',
    fileSymbols: [{ symbol: 'XAUUSD', count: 564 }],
    fundSymbols: ['EURUSD'],
    ticketsElsewhere: [],
    sampledTickets: 500,
  }

  it('warns when none of the file\'s instruments match the fund', () => {
    const warnings = detectFundMismatch(base)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('EURUSD')
    expect(warnings[0]).toContain('XAUUSD')
  })

  it('stays silent when the instruments match', () => {
    expect(detectFundMismatch({ ...base, fundSymbols: ['XAUUSD'] })).toEqual([])
  })

  it('stays silent on partial overlap — a fund may start trading something new', () => {
    const warnings = detectFundMismatch({
      ...base,
      fileSymbols: [
        { symbol: 'XAUUSD', count: 500 },
        { symbol: 'EURUSD', count: 10 },
      ],
      fundSymbols: ['EURUSD'],
    })
    expect(warnings).toEqual([])
  })

  it('does not warn on instruments for a brand-new fund with no deals yet', () => {
    expect(detectFundMismatch({ ...base, fundSymbols: [] })).toEqual([])
  })

  it('warns when the tickets already belong to another fund', () => {
    const warnings = detectFundMismatch({
      ...base,
      fundSymbols: ['XAUUSD'], // instruments fine, so this is the only warning
      ticketsElsewhere: [{ fundName: 'OKC Gold Fund', count: 500 }],
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('OKC Gold Fund')
    expect(warnings[0]).toContain('duplicates')
  })

  it('reports both problems when both apply', () => {
    const warnings = detectFundMismatch({
      ...base,
      ticketsElsewhere: [{ fundName: 'OKC Gold Fund', count: 500 }],
    })
    expect(warnings).toHaveLength(2)
  })
})
