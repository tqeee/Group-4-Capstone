const transactions = [
  {
    id: "txn_1001",
    investor: "Faye Cheah",
    type: "Deposit",
    amount: "SGD 50,000.00",
    submitted: "17 Mar 2026",
    status: "Pending review",
  },
  {
    id: "txn_1002",
    investor: "Faye Cheah",
    type: "Withdrawal",
    amount: "SGD 12,000.00",
    submitted: "8 Apr 2026",
    status: "Pending review",
  },
];

export default function OperationsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-8 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-blue-700">
            Operations
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Transaction Approvals
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-gray-500">
            Review pending deposits and withdrawals before submitting approval
            or rejection decisions through the secured operations API.
          </p>
        </header>

        <section className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {["ID", "Investor", "Type", "Amount", "Submitted", "Status", "Decision"].map((header) => (
                  <th
                    key={header}
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="text-sm text-gray-700">
                  <td className="px-5 py-4 font-mono text-xs text-gray-500">
                    {transaction.id}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {transaction.investor}
                  </td>
                  <td className="px-5 py-4">{transaction.type}</td>
                  <td className="px-5 py-4 font-semibold text-gray-900">
                    {transaction.amount}
                  </td>
                  <td className="px-5 py-4">{transaction.submitted}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button className="rounded-md bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700">
                        Approve
                      </button>
                      <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
