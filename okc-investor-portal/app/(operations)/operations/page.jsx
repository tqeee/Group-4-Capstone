import Link from 'next/link';
import StatusBadge from '../components/StatusBadge';

const operationalMetrics = [
  {
    label: 'Open Operational Tasks',
    value: '31',
    helper: '+6 vs yesterday',
    helperTone: 'text-blue-700',
    icon: 'clipboard',
    iconTone: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Pending Transaction Reviews',
    value: '24',
    helper: '+4 vs yesterday',
    helperTone: 'text-amber-700',
    icon: 'hourglass',
    iconTone: 'bg-amber-100 text-amber-700',
  },
  {
    label: 'Investor Inquiries',
    value: '7',
    helper: '-2 vs yesterday',
    helperTone: 'text-indigo-700',
    icon: 'chat',
    iconTone: 'bg-indigo-100 text-indigo-700',
  },
  {
    label: 'Tasks Completed (Today)',
    value: '18',
    helper: '+8 vs yesterday',
    helperTone: 'text-emerald-700',
    icon: 'check',
    iconTone: 'bg-emerald-100 text-emerald-700',
  },
];

const workloadStats = [
  { label: 'Pending', value: '30 (37.5%)', dot: 'bg-blue-500' },
  { label: 'In Review', value: '18 (22.5%)', dot: 'bg-amber-400' },
  { label: 'Completed', value: '28 (35.0%)', dot: 'bg-emerald-500' },
  { label: 'Rejected', value: '4 (5.0%)', dot: 'bg-red-500' },
];

const queueItems = [
  {
    label: 'Transaction Reviews',
    description: 'Deposits, withdrawals and transfers awaiting review',
    value: '24',
    icon: 'document',
    iconTone: 'bg-blue-100 text-blue-700',
    badgeTone: 'bg-blue-100 text-blue-700',
    href: '/ops-transactions',
  },
  {
    label: 'Investor Inquiries',
    description: 'Unresolved investor inquiries and follow-ups',
    value: '7',
    icon: 'users',
    iconTone: 'bg-violet-100 text-violet-700',
    badgeTone: 'bg-violet-100 text-violet-700',
    href: '/inquiries',
  },
];

const recentOperationLogs = [
  {
    requestId: 'REQ-2026-00124',
    investor: 'Faye Cheah',
    investorId: 'INV-002',
    type: 'Deposit',
    amount: 'SGD 50,000.00',
    amountTone: 'text-emerald-700',
    dateTime: '8 Apr 2026, 10:23 AM',
    status: 'Pending',
    handledBy: '-',
  },
  {
    requestId: 'REQ-2026-00123',
    investor: 'Daniel Tan',
    investorId: 'INV-003',
    type: 'Withdrawal',
    amount: 'SGD 18,400.00',
    amountTone: 'text-red-600',
    dateTime: '8 Apr 2026, 09:45 AM',
    status: 'Review',
    handledBy: 'Sarah Lim',
  },
  {
    requestId: 'REQ-2026-00122',
    investor: 'Amelia Wong',
    investorId: 'INV-004',
    type: 'Transfer',
    amount: 'SGD 72,300.00',
    amountTone: 'text-gray-950',
    dateTime: '7 Apr 2026, 04:15 PM',
    status: 'Complete',
    handledBy: 'Jason Ng',
  },
];

export default function OperationsDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">Good morning, Operations team!</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Operations Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">Monitor operational activities and manage requests efficiently.</p>
        </div>
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Live NAV as of today · 19:00 SGT
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {operationalMetrics.map(metric => (
          <div key={metric.label} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${metric.iconTone}`}>
              <MetricIcon name={metric.icon} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{metric.label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-950">{metric.value}</p>
              <p className={`mt-2 text-sm font-medium ${metric.helperTone}`}>{metric.helper}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Operational Workload Overview</h2>

          <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
            <div className="relative mx-auto h-44 w-44 justify-self-center rounded-full bg-[conic-gradient(#3b82f6_0_37.5%,#fbbf24_37.5%_60%,#34d399_60%_95%,#ef4444_95%_100%)]">
              <div className="absolute inset-8 flex flex-col items-center justify-center rounded-full bg-white text-center">
                <span className="text-sm text-gray-400">Total</span>
                <span className="text-3xl font-bold text-gray-950">80</span>
                <span className="text-xs text-gray-400">Tasks</span>
              </div>
            </div>

            <div className="space-y-5">
              {workloadStats.map(stat => (
                <div key={stat.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${stat.dot}`} />
                    <span className="font-medium text-gray-700">{stat.label}</span>
                  </div>
                  <span className="font-semibold text-gray-600">{stat.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-950">Operational Queue</h2>
          <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {queueItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-4 p-5 transition hover:bg-gray-50"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${item.iconTone}`}>
                    <MetricIcon name={item.icon} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-950">{item.label}</p>
                    <p className="mt-1 max-w-xs text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <span className={`rounded-lg px-3 py-2 text-lg font-bold ${item.badgeTone}`}>{item.value}</span>
                  <span className="text-2xl text-gray-400">›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-950">Recent Operation Logs</h2>
          <Link
            href="/operation-log"
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
          >
            View All
          </Link>
        </div>

        <div className="mt-5 max-h-80 overflow-y-auto rounded-lg border border-gray-100">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Request ID</th>
                <th className="px-4 py-3 font-semibold">Investor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Handled By</th>
                <th className="px-4 py-3 font-semibold" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOperationLogs.map(log => (
                <tr key={log.requestId} className="transition hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-950">{log.requestId}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-950">{log.investor}</p>
                    <p className="mt-0.5 text-xs font-medium text-gray-400">{log.investorId}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">{log.type}</td>
                  <td className={`px-4 py-4 font-bold ${log.amountTone}`}>{log.amount}</td>
                  <td className="px-4 py-4 text-gray-600">{log.dateTime}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-600">{log.handledBy}</td>
                  <td className="px-4 py-4 text-right text-xl font-bold text-gray-400">...</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricIcon({ name }) {
  const iconClass = 'h-6 w-6';

  if (name === 'clipboard' || name === 'document') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-9 8h10a2 2 0 002-2V7.5A2.5 2.5 0 0016.5 5h-.75A2.75 2.75 0 0013 2.25h-2A2.75 2.75 0 008.25 5H7.5A2.5 2.5 0 005 7.5V19a2 2 0 002 2z" />
      </svg>
    );
  }

  if (name === 'hourglass') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3h12M6 21h12M8 3v4a4 4 0 001.17 2.83L12 12l2.83-2.17A4 4 0 0016 7V3M8 21v-4a4 4 0 011.17-2.83L12 12l2.83 2.17A4 4 0 0116 17v4" />
      </svg>
    );
  }

  if (name === 'chat') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M7 17l-4 4V7a4 4 0 014-4h10a4 4 0 014 4v6a4 4 0 01-4 4H7z" />
      </svg>
    );
  }

  if (name === 'users') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-4a3 3 0 100-6 3 3 0 000 6zM9 10a3 3 0 100-6 3 3 0 000 6zm0 4h6" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}