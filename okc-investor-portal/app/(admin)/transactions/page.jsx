'use client';
import { useState } from 'react';

// Status styling object maps matching system directory conventions
const statusStyle = {
  Pending: 'bg-yellow-50 text-yellow-600',
  Approved: 'bg-green-50 text-green-600',
  Rejected: 'bg-red-50 text-red-500',
  Completed: 'bg-blue-50 text-blue-600',
};

const filters = ['All', 'Pending', 'Approved', 'Rejected'];

export default function TransactionsPage({
  // Lifted configuration structure to prevent variable freeze patterns
  initialRequests = [
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
  ]
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeFilter, setActiveFilter] = useState('All');
  const [toast, setToast] = useState(null);

  // Filter computations
  const filtered = activeFilter === 'All'
    ? requests
    : requests.filter(r => r.status === activeFilter);

  function handleAction(id, action) {
    setRequests(prev =>
      prev.map(r => r.id === id ? { ...r, status: action } : r)
    );
    setToast(`Request ${id} has been ${action.toLowerCase()}.`);
    setTimeout(() => setToast(null), 3000);
  }

  // Aggregate metrics calculation logic
  const pending = requests.filter(r => r.status === 'Pending').length;
  const totalDeposits = requests
    .filter(r => r.type === 'Deposit' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);
  const totalWithdrawals = requests
    .filter(r => r.type === 'Withdrawal' && r.status === 'Approved')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Header Framework */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
        <p className="text-gray-400 text-sm mt-1">
          Review and approve investor deposit and withdrawal requests.
        </p>
      </div>

      {/* Dynamic Summary Cards Row */}
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

      {/* Segmented Filter Control Ribbon */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center whitespace-nowrap ${
              activeFilter === f
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
            }`}
          >
            {f}
            {f === 'Pending' && pending > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center line-height-none">
                {pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filter and Table Card Frame */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Scalable Matrix Viewport */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {['REQUEST ID', 'INVESTOR', 'TYPE', 'AMOUNT', 'SUBMITTED', 'STATUS', 'ACTIONS'].map(h => (
                  <th key={h} className="text-left text-xs text-gray-400 font-medium px-6 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                  <td className="px-6 py-5 text-xs font-mono text-gray-400 whitespace-nowrap">{req.id}</td>
                  <td className="px-6 py-5 max-w-[200px]">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate whitespace-nowrap">{req.investor}</p>
                      <p className="text-xs text-gray-400 font-mono truncate whitespace-nowrap mt-0.5">{req.investorId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      req.type === 'Deposit' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {req.type}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                    SGD {req.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-5 text-xs text-gray-400 whitespace-nowrap">{req.submitted}</td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    {req.status === 'Pending' ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(req.id, 'Approved')}
                          className="text-xs bg-green-50 text-green-600 hover:bg-green-100 font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(req.id, 'Rejected')}
                          className="text-xs bg-red-50 text-red-500 hover:bg-red-100 font-semibold px-3 py-1.5 rounded-lg transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-sm bg-gray-50/20">
            No transaction records match your filter criteria.
          </div>
        )}
      </div>

      {/* Notification System Frame */}
      {toast && (
        <div className="fixed bottom-6 right-6 left-6 sm:left-auto bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50 max-w-sm sm:max-w-md mx-auto sm:mx-0">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}