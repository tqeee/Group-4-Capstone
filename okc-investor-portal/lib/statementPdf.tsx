import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import { fmtDate, fmtMoney, fmtMonth } from '@/lib/format'

// §Deliberately excludes fund share % — see the schema comment on
// InvestorOverview.allocation in lib/queries.ts: an investor's own ownership
// share of a fund's total pool would let them back into the fund's total AUM
// (and by extension other investors' holdings) from their own known deposit.
export type StatementRow = {
  date: Date
  fundName: string
  openingValue: number
  pnl: number
  managementFee: number
  netFlow: number
  closingValue: number
}

export type StatementData = {
  investorName: string
  investorEmail: string
  month: string // 'YYYY-MM'
  rows: StatementRow[]
}

const NAVY = '#1e293b'
const GRAY = '#6b7280'
const LIGHT_GRAY = '#f3f4f6'
const BORDER = '#e5e7eb'
const GREEN = '#16a34a'
const RED = '#ef4444'

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: 'Helvetica', color: '#111827' },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: NAVY },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  docTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  docSub: { fontSize: 9, color: GRAY },
  metaBlock: { alignItems: 'flex-end' },
  metaLine: { fontSize: 9, color: GRAY, marginBottom: 1 },

  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  summaryCard: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
    borderRadius: 4,
    padding: 10,
  },
  summaryLabel: { fontSize: 7, color: GRAY, marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 13, fontFamily: 'Helvetica-Bold' },

  note: {
    fontSize: 8,
    color: GRAY,
    backgroundColor: '#fffbeb',
    borderRadius: 4,
    padding: 8,
    marginBottom: 14,
  },

  table: { borderTopWidth: 1, borderTopColor: BORDER, borderTopStyle: 'solid' },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    borderBottomStyle: 'solid',
    paddingVertical: 5,
  },
  thRow: { backgroundColor: LIGHT_GRAY },
  th: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GRAY, textTransform: 'uppercase' },
  td: { fontSize: 8 },
  totalsRow: { backgroundColor: LIGHT_GRAY, fontFamily: 'Helvetica-Bold' },

  colDate: { width: '13%', paddingHorizontal: 4 },
  colFund: { width: '20%', paddingHorizontal: 4 },
  colOpening: { width: '15%', paddingHorizontal: 4, textAlign: 'right' },
  colPnl: { width: '13%', paddingHorizontal: 4, textAlign: 'right' },
  colFee: { width: '13%', paddingHorizontal: 4, textAlign: 'right' },
  colFlow: { width: '13%', paddingHorizontal: 4, textAlign: 'right' },
  colClosing: { width: '13%', paddingHorizontal: 4, textAlign: 'right' },

  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: GRAY,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    borderTopStyle: 'solid',
    paddingTop: 6,
  },
})

const signed = (n: number) => (n < 0 ? RED : GREEN)

function StatementDocument({ investorName, investorEmail, month, rows }: StatementData) {
  const totalOpening = rows.length > 0 ? rows[0].openingValue : 0
  const totalClosing = rows.length > 0 ? rows[rows.length - 1].closingValue : 0
  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0)
  const totalFee = rows.reduce((s, r) => s + r.managementFee, 0)
  const totalFlow = rows.reduce((s, r) => s + r.netFlow, 0)
  const generatedAt = fmtDate(new Date())

  return (
    <Document title={`OKC Account Statement — ${fmtMonth(`${month}-01`)}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.titleRow} fixed>
          <View>
            <Text style={styles.brand}>OKC</Text>
            <Text style={styles.docTitle}>Account Statement</Text>
            <Text style={styles.docSub}>{fmtMonth(`${month}-01`)}</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLine}>{investorName}</Text>
            <Text style={styles.metaLine}>{investorEmail}</Text>
            <Text style={styles.metaLine}>Generated {generatedAt}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Opening Value</Text>
            <Text style={styles.summaryValue}>{fmtMoney(totalOpening)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Closing Value</Text>
            <Text style={styles.summaryValue}>{fmtMoney(totalClosing)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total P&amp;L</Text>
            <Text style={[styles.summaryValue, { color: signed(totalPnl) }]}>
              {fmtMoney(totalPnl, { sign: true })}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Management Fee</Text>
            <Text style={styles.summaryValue}>{fmtMoney(totalFee)}</Text>
          </View>
        </View>

        <Text style={styles.note}>
          Daily P&amp;L already reflects the Management Fee deduction; Management Fee is shown
          separately below for transparency.
        </Text>

        <View style={styles.table}>
          <View style={[styles.tr, styles.thRow]} fixed>
            <Text style={[styles.th, styles.colDate]}>Date</Text>
            <Text style={[styles.th, styles.colFund]}>Fund</Text>
            <Text style={[styles.th, styles.colOpening]}>Opening</Text>
            <Text style={[styles.th, styles.colPnl]}>Daily P&amp;L</Text>
            <Text style={[styles.th, styles.colFee]}>Mgmt Fee</Text>
            <Text style={[styles.th, styles.colFlow]}>Deposits/Withdrawals</Text>
            <Text style={[styles.th, styles.colClosing]}>Closing</Text>
          </View>

          {rows.map((r, i) => (
            <View style={styles.tr} key={i} wrap={false}>
              <Text style={[styles.td, styles.colDate]}>{fmtDate(r.date)}</Text>
              <Text style={[styles.td, styles.colFund]}>{r.fundName}</Text>
              <Text style={[styles.td, styles.colOpening]}>{fmtMoney(r.openingValue)}</Text>
              <Text style={[styles.td, styles.colPnl, { color: signed(r.pnl) }]}>
                {fmtMoney(r.pnl, { sign: true })}
              </Text>
              <Text style={[styles.td, styles.colFee]}>{fmtMoney(r.managementFee)}</Text>
              <Text style={[styles.td, styles.colFlow]}>
                {r.netFlow !== 0 ? fmtMoney(r.netFlow, { sign: true }) : '—'}
              </Text>
              <Text style={[styles.td, styles.colClosing]}>{fmtMoney(r.closingValue)}</Text>
            </View>
          ))}

          <View style={[styles.tr, styles.totalsRow]} wrap={false}>
            <Text style={[styles.td, styles.colDate]}>Totals</Text>
            <Text style={[styles.td, styles.colFund]} />
            <Text style={[styles.td, styles.colOpening]}>{fmtMoney(totalOpening)}</Text>
            <Text style={[styles.td, styles.colPnl, { color: signed(totalPnl) }]}>
              {fmtMoney(totalPnl, { sign: true })}
            </Text>
            <Text style={[styles.td, styles.colFee]}>{fmtMoney(totalFee)}</Text>
            <Text style={[styles.td, styles.colFlow]}>
              {totalFlow !== 0 ? fmtMoney(totalFlow, { sign: true }) : '—'}
            </Text>
            <Text style={[styles.td, styles.colClosing]}>{fmtMoney(totalClosing)}</Text>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => `OKC Investor Portal  |  Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  )
}

export async function renderStatementPdf(data: StatementData): Promise<Buffer> {
  return renderToBuffer(<StatementDocument {...data} />)
}
