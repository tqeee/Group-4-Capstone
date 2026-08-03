'use client';

import { useState } from 'react';
import { fmtDate, fmtMoney } from '@/lib/format';

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

export default function InvestorsClient({ investors }) {
  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = investors.filter(i =>
    `${i.name} ${i.email} ${i.id}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Investors</h1>
        <p className="text-gray-400 text-sm mt-1">Directory of investor accounts and their current holdings.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Investor Directory</p>
            <h2 className="mt-2 text-lg font-bold text-gray-900">Profiles and account information</h2>
          </div>
          <div className="relative w-full md:w-72">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-600 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onChange={e => setSearch(e.target.value)}
              placeholder="Search investors..."
              value={search}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {filtered.map(investor => (
            <div key={investor.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
                  {getInitials(investor.name)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{investor.name}</p>
                  <p className="mt-1 text-sm text-gray-400">{investor.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Portfolio value</p>
                  <p className="text-sm font-bold text-gray-900">{fmtMoney(investor.portfolioValue)}</p>
                </div>
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
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">
              {investors.length === 0 ? 'No investors onboarded yet.' : 'No investors match your search.'}
            </p>
          )}
        </div>
      </section>

      {selectedInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Investor Profile</p>
                <h2 className="mt-2 text-xl font-bold text-gray-900">Account Information</h2>
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
                <p className="font-bold text-gray-900">{selectedInvestor.name}</p>
                <p className="mt-1 text-sm text-gray-500">{selectedInvestor.email}</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
              <ProfileRow label="Registered Name" value={selectedInvestor.name} />
              <ProfileRow label="Registered Email" value={selectedInvestor.email} />
              <ProfileRow label="Investor ID" value={selectedInvestor.id} />
              <ProfileRow label="Onboarded" value={fmtDate(selectedInvestor.onboardingDate)} />
              <ProfileRow label="Portfolio Value" value={fmtMoney(selectedInvestor.portfolioValue)} />
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
      <div className="px-4 py-3 text-sm font-medium text-gray-700 break-all">{value}</div>
    </div>
  );
}
