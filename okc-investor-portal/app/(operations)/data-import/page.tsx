import { prisma } from '@/lib/db'
import { getImportBatches } from '@/lib/queries'
import DataImportClient from './DataImportClient'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function DataImportPage() {
  const [batches, funds] = await Promise.all([
    getImportBatches(),
    prisma.fund.findMany({ select: { id: true, name: true } }),
  ])

  return <DataImportClient batches={batches} funds={funds} />
}
