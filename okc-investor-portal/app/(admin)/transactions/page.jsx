'use client';
import { useState } from 'react';

const initialRequests = [
  {
    id: 'REQ-001',
    investor: 'Faye Cheah',
    investorId: 'INV-204812',
    type: 'Deposit',
    amount: 100000,
    submitted: '1 Apr 2026',
    status: 'Pending',
    approver: 'Admin',
    note: 'First top-up after initial deposit.',
  },
  {
    id: 'REQ-002',
    investor: 'Faye Cheah',
    investorId: 'INV-204812',
    type: 'Withdrawal',
    amount: 20000,
    submitted: '7 Apr 2026',
    status: 'Pending',
    approver: 'Admin',
    note: 'Partial withdrawal.',
  },
  {
    id: 'REQ-003',
    investor: 'Sarah Lim',
    investorId: 'INV-204813',
    type: 'Deposit',
    amount: 150000,
    submitted: '5 Apr 2026',
    status: 'Approved',
    approver: 'Admin',
    note: 'Initial onboarding deposit.',
  },
  {
    id: 'REQ-004',
    investor: 'James Wong',
    investorId: 'INV-204814',
    type: 'Deposit',
    amount: 200000,
    submitted: '7 Apr 2026',
    status: 'Rejected',
    approver: 'Admin',
    note: 'KYC documents incomplete.',
  },
];

const statusStyle = {
  Pending: 'bg-yellow-50 text-yellow-600',
  Approved: 'bg-green-50 text-green-600',
  Rejected: 'bg-red-50 text-red-500',
  Completed: 'bg-blue-50 text-blue-600',
};

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

export default function TransactionsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [activeFilter, setActiveFilter] = useState('All');
  const [toast, setToast] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = activeFilter === 'All'
    ? requests
    : requests.filter(r => r.status === activeFilter);

  function handleAction(id, action) {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: action } : r)
    );
    setToast(`Request ${id} ${action.toLowerCase()}.`);
    setSelected(null);
    setTimeout(() => setToast(null), 3000);
  }

  const pending = requests.filter(r => r.status === 'Pending').length;
  const totalDeposits = requests
    .filter(r => r.type === 'Deposit' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalWithdrawals = requests
    .filter(r => r.type === 'Withdrawal' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Review and approve investor deposit and withdrawal requests.
        </p>
      </div>

      {/* Stats Grid — Adapts columns cleanly to viewport width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'PENDING APPROVAL', value: pending, red: pending > 0 },
          { label: 'TOTAL REQUESTS', value: requests.length, red: false },
          { label: 'APPROVED DEPOSITS', value: `SGD ${totalDeposits.toLocaleString()}`, red: false },
          { label: 'APPROVED WITHDRAWALS', value: `SGD ${totalWithdrawals.toLocaleString()}`, red: false },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 min-w-0">
            <p className="text-xs text-gray-400 font-medium tracking-wide mb-2 truncate">{s.label}</p>
            <p className={`text-2xl font-bold whitespace-nowrap ${s.red ? 'text-red-500' : 'text-gray-900'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition flex items-center whitespace-nowrap ${
              activeFilter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700'
            }`}
          >
            {f}
            {f === 'Pending' && pending > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Responsive Table Wrapper */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['REQUEST ID', 'INVESTOR', 'TYPE', 'AMOUNT', 'SUBMITTED', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-xs font-mono text-gray-400 whitespace-nowrap">{req.id}</td>
                  <td className="px-6 py-4 min-w-[160px]">
                    <p className="text-sm font-semibold text-gray-900 truncate">{req.investor}</p>
                    <p className="text-xs text-gray-400 truncate">{req.investorId}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      req.type === 'Deposit' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'
                    }`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    SGD {req.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">{req.submitted}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {req.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(req.id, 'Approved')}
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'Rejected')}
                          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No action</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">No requests found.</div>
        )}
      </div>

      {/* Toast Notice */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}
    </div>
  );
}