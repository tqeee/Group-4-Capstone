'use client';

import { useActionState, useRef, useState } from 'react';
import { fmtDate } from '@/lib/format';
import { importDealsCsv } from './actions';

const statusBadgeStyles = {
  Validated: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-amber-100 text-amber-700',
};

// A broker export carries no fund identifier, so the operator's fund choice
// can't be verified automatically. Showing exactly what the file contained
// lets them confirm it themselves at a glance.
function FileSummary({ summary }) {
  const period =
    summary.dateFrom && summary.dateTo
      ? `${fmtDate(summary.dateFrom)} – ${fmtDate(summary.dateTo)}`
      : '—';

  return (
    <div className="max-w-xl rounded-xl border border-gray-200 bg-gray-50/60 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
        Detected in {summary.fileName}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-gray-500">Target fund</dt>
        <dd className="font-semibold text-gray-900">{summary.fundName}</dd>

        <dt className="text-gray-500">Trading period</dt>
        <dd className="font-medium text-gray-700">{period}</dd>

        <dt className="text-gray-500">Instruments</dt>
        <dd className="font-medium text-gray-700">
          {summary.symbols.length > 0
            ? summary.symbols.map(s => `${s.symbol} (${s.count})`).join(', ')
            : '—'}
        </dd>

        <dt className="text-gray-500">Strategies</dt>
        <dd className="font-medium text-gray-700">
          {summary.strategies.length > 0
            ? summary.strategies.map(s => `${s.magic} (${s.count})`).join(', ')
            : '—'}
        </dd>

        <dt className="text-gray-500">Deal rows</dt>
        <dd className="font-medium text-gray-700">{summary.dealRows}</dd>

        {summary.balanceRows > 0 && (
          <>
            <dt className="text-gray-500">Balance rows</dt>
            <dd className="font-medium text-gray-700">
              {summary.balanceRows} excluded — record as fund flows
            </dd>
          </>
        )}

        {summary.invalidRows > 0 && (
          <>
            <dt className="text-gray-500">Invalid rows</dt>
            <dd className="font-medium text-amber-700">{summary.invalidRows} skipped</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export default function DataImportClient({ batches, funds }) {
  const [state, formAction, isPending] = useActionState(importDealsCsv, undefined);
  const [fileName, setFileName] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);
  const formRef = useRef(null);

  const filteredBatches = batches.filter(b =>
    `${b.fileName} ${b.uploadedBy} ${b.status}`.toLowerCase().includes(search.toLowerCase())
  );

  function handleFiles(files) {
    if (files?.length && fileInputRef.current) {
      fileInputRef.current.files = files;
      setFileName(files[0].name);
    }
  }

  const lastValidated = batches.find(b => b.status === 'Validated');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Data Import</h1>
        <p className="text-gray-400 text-sm mt-1">
          Upload the broker&apos;s raw deal export (CSV) to feed the daily P&L pipeline. Imports
          are idempotent — re-uploaded deals are skipped by ticket number.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900">Import broker deals</h2>

            <form ref={formRef} action={formAction} className="mt-5 space-y-5">
              <div className="max-w-xl">
                <label className="text-sm font-semibold text-gray-500" htmlFor="fundId">
                  Fund
                </label>
                <select
                  id="fundId"
                  name="fundId"
                  defaultValue={funds[0]?.id}
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {funds.map(fund => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                onDragOver={e => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFiles(e.dataTransfer.files);
                }}
                className={`flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-blue-200 bg-blue-50/30 hover:border-blue-300 hover:bg-blue-50/60'
                }`}
              >
                <svg className="h-12 w-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 16V8m0 0l-3 3m3-3l3 3M6 16.5a4.5 4.5 0 01.8-8.93A5.5 5.5 0 0117.5 9.5H18a3.5 3.5 0 010 7h-2"
                  />
                </svg>
                <p className="mt-3 font-bold text-gray-900">
                  {fileName ?? 'Drag and drop your CSV here'}
                </p>
                <p className="mt-1 text-sm text-gray-500">or</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => setFileName(e.target.files?.[0]?.name ?? null)}
                />
                <p className="mt-4 text-xs font-medium text-gray-500">
                  CSV · raw broker deal export · max 50MB ·{' '}
                  <a
                    href="/sample-data/broker-deals-2026-04-09.csv"
                    download
                    className="text-blue-600 hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    download sample file
                  </a>
                </p>
              </div>

              {state?.status === 'error' && (
                <p className="auth-status-message status-error max-w-xl">{state.message}</p>
              )}
              {state?.status === 'success' && (
                <p className="auth-status-message status-success max-w-xl">{state.message}</p>
              )}

              {/* What the importer found in the file — shown on every outcome so
                  an import is never a black box. */}
              {state?.summary && <FileSummary summary={state.summary} />}

              {state?.status === 'confirm' && (
                <div className="max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-bold text-amber-900">{state.message}</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-amber-800">
                    {state.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-amber-700">
                    Nothing has been imported yet. Pick a different fund above, or import anyway
                    if this is correct.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isPending || !fileName}
                  className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? 'Importing…' : 'Import and recalculate ledger'}
                </button>

                {/* Submitting via this button sends confirm=true, which tells the
                    action the operator has read the warnings. */}
                {state?.status === 'confirm' && (
                  <button
                    type="submit"
                    name="confirm"
                    value="true"
                    disabled={isPending || !fileName}
                    className="rounded-lg border border-amber-500 bg-white px-6 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Import anyway
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-bold text-gray-900">Recent Imports</h2>
              <div className="relative w-full md:w-80">
                <svg
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-600 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search files..."
                  value={search}
                />
              </div>
            </div>
            <div className="mt-5 max-h-96 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wider text-gray-400 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold">File Name</th>
                    <th className="px-4 py-3 font-semibold">Uploaded By</th>
                    <th className="px-4 py-3 font-semibold">Uploaded At</th>
                    <th className="px-4 py-3 font-semibold">Rows</th>
                    <th className="px-4 py-3 font-semibold">Skipped</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBatches.map(batch => (
                    <tr key={batch.id} className="transition hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V3zm7 1v3h3l-3-3z" />
                            </svg>
                          </span>
                          <span className="font-medium text-gray-900">{batch.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{batch.uploadedBy}</td>
                      <td className="px-4 py-4 text-gray-600">{fmtDate(batch.uploadedAt)}</td>
                      <td className="px-4 py-4 font-medium text-gray-900">{batch.rowCount}</td>
                      <td className="px-4 py-4 text-gray-600">{batch.skipped}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold ${statusBadgeStyles[batch.status] ?? 'bg-gray-100 text-gray-600'}`}
                        >
                          {batch.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredBatches.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={6}>
                        {batches.length === 0 ? 'No imports yet.' : 'No files match your search.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700">Last Successful Import</h2>
            {lastValidated ? (
              <>
                <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="mt-5 text-lg font-bold text-gray-900 break-all">{lastValidated.fileName}</p>
                <p className="mt-2 text-sm text-gray-500">{fmtDate(lastValidated.uploadedAt)}</p>
                <p className="mt-2 text-sm font-medium text-gray-600">
                  {lastValidated.rowCount} deal(s) · by {lastValidated.uploadedBy}
                </p>
              </>
            ) : (
              <p className="mt-4 text-sm text-gray-400">No imports yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
