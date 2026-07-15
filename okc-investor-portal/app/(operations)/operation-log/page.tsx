import { getAuditLogs } from '@/lib/queries'
import AuditLogTable from '@/components/AuditLogTable'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OperationLogPage() {
  const logs = await getAuditLogs(200)

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Operation Log</h1>
        <p className="mt-2 text-sm text-gray-500">
          Read-only record of authentication, admin, and operational activity.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
