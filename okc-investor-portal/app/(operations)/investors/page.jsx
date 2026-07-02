'use client';

import { useState } from 'react';

const investors = [
  {
    name: 'Faye Cheah',
    id: 'INV-204812',
    email: 'faye.cheah@example.com',
    registeredAt: '17 Mar 2026',
  },
  {
    name: 'Daniel Tan',
    id: 'INV-204813',
    email: 'daniel.tan@example.com',
    registeredAt: '20 Mar 2026',
  },
  {
    name: 'Amelia Wong',
    id: 'INV-204814',
    email: 'amelia.wong@example.com',
    registeredAt: '24 Mar 2026',
  },
];

export default function InvestorsPage() {
  const [selectedInvestor, setSelectedInvestor] = useState(null);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Investors</h1>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Investor Directory</p>
            <h2 className="mt-2 text-lg font-bold text-gray-950">Profiles and account information</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {investors.map(investor => (
            <div key={investor.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {getInitials(investor.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-950">{investor.name}</p>
                  <p className="mt-1 text-sm text-gray-400">{investor.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <button
                  className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  onClick={() => setSelectedInvestor(investor)}
                  type="button"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Investor Profile</p>
                <h2 className="mt-2 text-xl font-bold text-gray-950">Account Information</h2>
              </div>
              <button
                className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
                onClick={() => setSelectedInvestor(null)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                {getInitials(selectedInvestor.name)}
              </div>
              <div>
                <p className="font-bold text-gray-950">{selectedInvestor.name}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedInvestor.id}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
              <ProfileRow label="Registered Name" value={selectedInvestor.name} />
              <ProfileRow label="Registered Email" value={selectedInvestor.email} />
              <ProfileRow label="Investor ID" value={selectedInvestor.id} />
              <ProfileRow label="Registered Date" value={selectedInvestor.registeredAt} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] border-b border-gray-100 last:border-b-0">
      <div className="bg-gray-50 px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="px-4 py-3 text-sm font-medium text-gray-700">{value}</div>
    </div>
  );
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('');
}