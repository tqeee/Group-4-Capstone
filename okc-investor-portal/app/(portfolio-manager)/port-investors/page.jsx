'use client';

import { useState } from 'react';
import InvestorProfileModal from '../port-components/InvestorProfileModal';
import { getInvestorDirectory, getInvestorProfile } from '../port-services/portfolioService';

export default function PortfolioManagerInvestorsPage() {
  const investors = getInvestorDirectory();
  const [selectedInvestorId, setSelectedInvestorId] = useState(null);
  const selectedInvestor = selectedInvestorId ? getInvestorProfile(selectedInvestorId) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Portfolio Manager</p>
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
                  onClick={() => setSelectedInvestorId(investor.id)}
                  type="button"
                >
                  View Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <InvestorProfileModal investor={selectedInvestor} onClose={() => setSelectedInvestorId(null)} />
    </div>
  );
}

function getInitials(name) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('');
}