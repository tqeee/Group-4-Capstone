import { getAuditLogs } from '@/lib/queries'
import AuditLogTable from '@/components/AuditLogTable'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function OperationLogPage() {
  const logs = await getAuditLogs(200)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Operation Log</h1>
        <p className="text-gray-400 text-sm mt-1">
          Read-only record of authentication, admin, and operational activity.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
