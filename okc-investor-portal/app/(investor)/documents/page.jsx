'use client';
import { useState } from 'react';

const documents = [
  {
    category: 'Monthly Statements',
    items: [
      {
        name: 'March 2026 — Account Statement',
        description: 'Full P&L breakdown, trade log, and portfolio summary for March 2026.',
        date: '1 Apr 2026',
        size: '245 KB',
        type: 'PDF',
        available: true,
      },
      {
        name: 'April 2026 — Account Statement',
        description: 'Full P&L breakdown, trade log, and portfolio summary for April 2026.',
        date: 'Available 1 May 2026',
        size: '—',
        type: 'PDF',
        available: false,
      },
    ],
  },
  {
    category: 'Fund Documents',
    items: [
      {
        name: 'OKC XAUUSD Fund — Fact Sheet',
        description: 'Fund overview, strategy description, risk profile, and fee structure.',
        date: '17 Mar 2026',
        size: '180 KB',
        type: 'PDF',
        available: true,
      },
      {
        name: 'Investment Management Agreement',
        description: 'Signed agreement between investor and OKC Capital.',
        date: '17 Mar 2026',
        size: '320 KB',
        type: 'PDF',
        available: true,
      },
      {
        name: 'Risk Disclosure Statement',
        description: 'Important risk disclosures for trading in leveraged instruments.',
        date: '17 Mar 2026',
        size: '95 KB',
        type: 'PDF',
        available: true,
      },
    ],
  },
  {
    category: 'Tax Documents',
    items: [
      {
        name: 'YA 2026 — Tax Summary',
        description: 'Annual income and capital gains summary for tax filing purposes.',
        date: 'Available Jan 2027',
        size: '—',
        type: 'PDF',
        available: false,
      },
    ],
  },
];

export default function DocumentsPage() {
  const [toast, setToast] = useState(false);

  function handleDownload(doc) {
    if (!doc.available) return;
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-400 text-sm mt-1">
          Your account statements, fund documents, and tax records.
        </p>
      </div>

      {/* Document sections */}
      <div className="space-y-6">
        {documents.map((section, si) => (
          <div key={si}>
            {/* Section label */}
            <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mb-3">
              {section.category}
            </p>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
              {section.items.map((doc, di) => (
                <div
                  key={di}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                >
                  {/* Left — icon + info */}
                  <div className="flex items-center gap-4">
                    {/* PDF icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      doc.available ? 'bg-red-50' : 'bg-gray-100'
                    }`}>
                      <svg
                        className={`w-5 h-5 ${doc.available ? 'text-red-500' : 'text-gray-400'}`}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z"/>
                      </svg>
                    </div>

                    <div>
                      <p className={`text-sm font-semibold ${doc.available ? 'text-gray-900' : 'text-gray-400'}`}>
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{doc.date}</span>
                        {doc.size !== '—' && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="text-xs text-gray-400">{doc.size}</span>
                          </>
                        )}
                        <span className="text-gray-300">·</span>
                        <span className="text-xs font-medium text-gray-400">{doc.type}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right — download button */}
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={!doc.available}
                    className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition flex-shrink-0 ml-6 ${
                      doc.available
                        ? 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {doc.available ? 'Download' : 'Not available'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 z-50">
          <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Document download will be available when backend is connected.
        </div>
      )}
    </div>
  );
}