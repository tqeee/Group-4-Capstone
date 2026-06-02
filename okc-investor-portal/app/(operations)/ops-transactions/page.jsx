'use client';

import { useState } from 'react';
import StatusBadge from '../components/StatusBadge';

const initialTransactions = [
  { id: 'TXN-2401', investor: 'Faye Cheah', type: 'Subscription', amount: 'SGD 50,000.00', status: 'Pending' },
  { id: 'TXN-2402', investor: 'Daniel Tan', type: 'Redemption', amount: 'SGD 18,400.00', status: 'Review' },
  { id: 'TXN-2403', investor: 'Amelia Wong', type: 'Transfer', amount: 'SGD 72,300.00', status: 'Complete' },
];

const statusOptions = ['Pending', 'Review', 'Complete'];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransactionId, setSelectedTransactionId] = useState(initialTransactions[0].id);
  const [newStatus, setNewStatus] = useState('Review');
  const [comment, setComment] = useState('');
  const [referenceSearch, setReferenceSearch] = useState('');
  const [isReferenceDropdownOpen, setIsReferenceDropdownOpen] = useState(false);

  const selectedTransaction = transactions.find(transaction => transaction.id === selectedTransactionId) || transactions[0];
  const filteredTransactions = transactions.filter(transaction => {
    const searchableText = `${transaction.id} ${transaction.investor} ${transaction.type} ${transaction.amount} ${transaction.status}`.toLowerCase();

    return searchableText.includes(referenceSearch.toLowerCase());
  });

  const openStatusModal = () => {
    const firstPendingTransaction = transactions.find(transaction => transaction.status === 'Pending') || transactions[0];
    const nextStatus = firstPendingTransaction.status === 'Pending' ? 'Review' : firstPendingTransaction.status;

    setSelectedTransactionId(firstPendingTransaction.id);
    setNewStatus(nextStatus);
    setComment('');
    setReferenceSearch('');
    setIsReferenceDropdownOpen(false);
    setIsModalOpen(true);
  };

  const selectTransaction = transaction => {
    setSelectedTransactionId(transaction.id);
    setNewStatus(transaction.status === 'Pending' ? 'Review' : transaction.status);
    setReferenceSearch('');
    setIsReferenceDropdownOpen(false);
  };

  const closeStatusModal = () => {
    setIsModalOpen(false);
    setComment('');
    setReferenceSearch('');
    setIsReferenceDropdownOpen(false);
  };

  const updateStatus = () => {
    setTransactions(currentTransactions =>
      currentTransactions.map(transaction =>
        transaction.id === selectedTransaction.id ? { ...transaction, status: newStatus } : transaction,
      ),
    );
    closeStatusModal();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Transactions</h1>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Transaction Queue</p>
            <h2 className="mt-2 text-lg font-bold text-gray-950">Latest requests</h2>
          </div>
          <button
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            onClick={openStatusModal}
          >
            Update Transaction Status
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Reference</th>
                <th className="px-4 py-3 font-semibold">Investor</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td className="px-4 py-4 font-medium text-gray-950">{transaction.id}</td>
                  <td className="px-4 py-4 text-gray-500">{transaction.investor}</td>
                  <td className="px-4 py-4 text-gray-500">{transaction.type}</td>
                  <td className="px-4 py-4 font-medium text-gray-950">{transaction.amount}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={transaction.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Update Status</p>
                <h2 className="mt-2 text-xl font-bold text-gray-950">Update Transaction Status</h2>
              </div>
              <button className="text-2xl leading-none text-gray-400 transition hover:text-gray-700" onClick={closeStatusModal}>
                ×
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div className="relative">
                <p className="text-xs font-semibold text-gray-500">Reference</p>
                <div className="relative mt-2">
                  <input
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-gray-950 outline-none transition placeholder:text-gray-400 hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={event => {
                      setReferenceSearch(event.target.value);
                      setIsReferenceDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setReferenceSearch('');
                      setIsReferenceDropdownOpen(true);
                    }}
                    placeholder="Search reference..."
                    value={isReferenceDropdownOpen ? referenceSearch : selectedTransaction.id}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
                    onClick={() => setIsReferenceDropdownOpen(isOpen => !isOpen)}
                    type="button"
                  >
                    ⌄
                  </button>
                </div>

                {isReferenceDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                    <div className="max-h-56 overflow-y-auto">
                      {filteredTransactions.map(transaction => (
                        <button
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                          key={transaction.id}
                          onClick={() => selectTransaction(transaction)}
                          type="button"
                        >
                          <div>
                            <p className="font-bold text-gray-950">{transaction.id}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {transaction.investor} · {transaction.type} · {transaction.amount}
                            </p>
                          </div>
                          <StatusBadge status={transaction.status} />
                        </button>
                      ))}

                      {filteredTransactions.length === 0 && (
                        <p className="px-4 py-3 text-sm text-gray-400">No references found.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">Current Status</p>
                <div className="mt-2">
                  <StatusBadge status={selectedTransaction.status} />
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">New Status</span>
                <select
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={newStatus}
                  onChange={event => setNewStatus(event.target.value)}
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Comment <span className="font-normal">(Optional)</span></span>
                <textarea
                  className="mt-2 h-28 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  maxLength={300}
                  placeholder="Add a comment about this status update..."
                  value={comment}
                  onChange={event => setComment(event.target.value)}
                />
                <span className="mt-1 block text-right text-xs font-medium text-gray-400">{comment.length} / 300</span>
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                onClick={closeStatusModal}
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                onClick={updateStatus}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
