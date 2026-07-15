import { getAuditLogs } from '@/lib/queries'
import AuditLogTable from '@/components/AuditLogTable'

// Reads live portal data on every request.
export const dynamic = 'force-dynamic'

export default async function AuditLogsPage() {
  const logs = await getAuditLogs(300)

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-400 text-sm mt-1">
          Complete record of authentication, admin, and operations actions.
        </p>
      </div>
      <AuditLogTable logs={logs} />
    </div>
  )
}
