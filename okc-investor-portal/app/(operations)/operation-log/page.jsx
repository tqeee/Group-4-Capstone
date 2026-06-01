import StatusBadge from '../components/StatusBadge';

const operationLogs = [
  { time: '09:45', title: 'Subscription submitted', detail: 'Faye Cheah · OKC XAUUSD Fund', status: 'Pending' },
  { time: '11:20', title: 'Redemption moved to review', detail: 'Daniel Tan · OKC Macro Fund', status: 'Review' },
  { time: '14:05', title: 'Transfer completed', detail: 'Amelia Wong · OKC Income Fund', status: 'Complete' },
  { time: '16:30', title: 'Investor inquiry opened', detail: 'Clarification requested on April statement', status: 'Open' },
];

export default function OperationLogPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Operation Log</h1>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">All Operation Logs</p>
        <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {operationLogs.map(log => (
            <div key={`${log.time}-${log.title}`} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <span className="w-12 text-sm font-semibold text-gray-400">{log.time}</span>
                <div>
                  <p className="font-semibold text-gray-950">{log.title}</p>
                  <p className="mt-1 text-sm text-gray-500">{log.detail}</p>
                </div>
              </div>
              <StatusBadge status={log.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}