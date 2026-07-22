import { prisma } from '@/lib/db'

// We do not want investors to see which real fund their money sits in.
// Every investor-facing surface (dashboard, funds page, activity, request-transaction, statements) shows this stable, portal-wide
// "Fund A" / "Fund B" label instead of the real name/code. 
// Ops and admin pages are unaffected — they read Fund.name/code directly. 
// Ordered by inception date so a given fund always maps to the same letter for every investor.

function indexToLetter(i: number): string {
  let n = i
  let letter = ''
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letter
}

export async function getFundLabels(): Promise<Map<string, { code: string; name: string }>> {
  const funds = await prisma.fund.findMany({
    orderBy: [{ inceptionDate: 'asc' }, { id: 'asc' }],
    select: { id: true },
  })
  return new Map(
    funds.map((f, i) => {
      const letter = indexToLetter(i)
      return [f.id, { code: letter, name: `Fund ${letter}` }]
    })
  )
}
