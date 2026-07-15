// Shared server-side formatters so client components receive display-ready
// strings (avoids locale/timezone hydration drift).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function fmtMonth(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function fmtMoney(n: number, { currency = '$', sign = false }: { currency?: string; sign?: boolean } = {}): string {
  const abs = Math.abs(n).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const prefix = n < 0 ? '-' : sign ? '+' : ''
  return `${prefix}${currency}${abs}`
}

export function fmtPct(n: number, { sign = true, dp = 2 }: { sign?: boolean; dp?: number } = {}): string {
  const abs = Math.abs(n).toFixed(dp)
  const prefix = n < 0 ? '-' : sign ? '+' : ''
  return `${prefix}${abs}%`
}
