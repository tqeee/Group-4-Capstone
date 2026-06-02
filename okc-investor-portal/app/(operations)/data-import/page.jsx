'use client';

import { useMemo, useState } from 'react';

const supportedFileTypes = [
  {
    label: 'NAV Upload',
    description: 'Daily NAV and fund valuation data',
    formats: 'XLSX, CSV',
    icon: 'chart',
    iconTone: 'bg-blue-100 text-blue-700',
  },
  {
    label: 'Investor Registry',
    description: 'Investor master data and updates',
    formats: 'XLSX, CSV',
    icon: 'users',
    iconTone: 'bg-violet-100 text-violet-700',
  },
  {
    label: 'Transaction Records',
    description: 'Subscriptions, redemptions and transfers',
    formats: 'XLSX, CSV',
    icon: 'arrows',
    iconTone: 'bg-emerald-100 text-emerald-700',
  },
  {
    label: 'Bank Statement',
    description: 'Bank transactions and reconciliations',
    formats: 'XLSX, CSV',
    icon: 'bank',
    iconTone: 'bg-amber-100 text-amber-700',
  },
  {
    label: 'Portfolio Holdings',
    description: 'Holdings and position data',
    formats: 'XLSX, CSV',
    icon: 'briefcase',
    iconTone: 'bg-gray-100 text-gray-600',
  },
];

const initialRecentImports = [
  { fileName: 'NAV_2026-04-08.xlsx', type: 'NAV Upload', uploadedBy: 'Operations Team', uploadedAt: '8 Apr 2026, 19:00 SGT', status: 'Validated' },
  { fileName: 'Bank_2026-04-08.xlsx', type: 'Bank Statement', uploadedBy: 'Operations Team', uploadedAt: '8 Apr 2026, 17:30 SGT', status: 'Pending Review' },
  { fileName: 'Transactions_2026-04-08.xlsx', type: 'Transaction Records', uploadedBy: 'Operations Team', uploadedAt: '8 Apr 2026, 16:45 SGT', status: 'Pending Review' },
  { fileName: 'Investors_2026-04-08.xlsx', type: 'Investor Registry', uploadedBy: 'Operations Team', uploadedAt: '8 Apr 2026, 15:20 SGT', status: 'Validated' },
  { fileName: 'Holdings_2026-04-07.xlsx', type: 'Portfolio Holdings', uploadedBy: 'Operations Team', uploadedAt: '7 Apr 2026, 18:10 SGT', status: 'Validated' },
  { fileName: 'NAV_2026-04-07.xlsx', type: 'NAV Upload', uploadedBy: 'Operations Team', uploadedAt: '7 Apr 2026, 19:00 SGT', status: 'Validated' },
  { fileName: 'Bank_2026-04-07.xlsx', type: 'Bank Statement', uploadedBy: 'Operations Team', uploadedAt: '7 Apr 2026, 17:30 SGT', status: 'Validated' },
];

const fileContents = {
  'NAV_2026-04-08.xlsx': [
    { Date: '08/04/2026', Fund: 'OKC Gold Trading Fund', 'NAV (SGD)': '10,450,000.00', 'Units Outstanding': '1,000,000.00', 'NAV per Unit': '10.45' },
    { Date: '07/04/2026', Fund: 'OKC Gold Trading Fund', 'NAV (SGD)': '10,320,000.00', 'Units Outstanding': '1,000,000.00', 'NAV per Unit': '10.32' },
    { Date: '06/04/2026', Fund: 'OKC Gold Trading Fund', 'NAV (SGD)': '10,280,000.00', 'Units Outstanding': '1,000,000.00', 'NAV per Unit': '10.28' },
    { Date: '05/04/2026', Fund: 'OKC Gold Trading Fund', 'NAV (SGD)': '10,210,000.00', 'Units Outstanding': '1,000,000.00', 'NAV per Unit': '10.21' },
  ],
  'Bank_2026-04-08.xlsx': [
    { Date: '08/04/2026', Account: 'Operating Account', Description: 'Investor subscription', Debit: '-', Credit: '50,000.00', Balance: '2,450,000.00' },
    { Date: '08/04/2026', Account: 'Operating Account', Description: 'Redemption payment', Debit: '18,400.00', Credit: '-', Balance: '2,431,600.00' },
    { Date: '08/04/2026', Account: 'Custody Account', Description: 'Custody fee', Debit: '2,500.00', Credit: '-', Balance: '1,128,000.00' },
  ],
  'Transactions_2026-04-08.xlsx': [
    { Reference: 'TXN-2401', Investor: 'Faye Cheah', Type: 'Subscription', Amount: 'SGD 50,000.00', Status: 'Pending' },
    { Reference: 'TXN-2402', Investor: 'Daniel Tan', Type: 'Redemption', Amount: 'SGD 18,400.00', Status: 'Review' },
    { Reference: 'TXN-2403', Investor: 'Amelia Wong', Type: 'Transfer', Amount: 'SGD 72,300.00', Status: 'Complete' },
  ],
};

const typeBadgeStyles = {
  'NAV Upload': 'bg-blue-100 text-blue-700',
  'Investor Registry': 'bg-violet-100 text-violet-700',
  'Transaction Records': 'bg-emerald-100 text-emerald-700',
  'Bank Statement': 'bg-amber-100 text-amber-700',
  'Portfolio Holdings': 'bg-yellow-100 text-yellow-800',
};

const statusBadgeStyles = {
  Validated: 'bg-emerald-100 text-emerald-700',
  'Pending Review': 'bg-amber-100 text-amber-700',
};

export default function DataImportPage() {
  const [imports, setImports] = useState(initialRecentImports);
  const [selectedFileType, setSelectedFileType] = useState('');
  const [isFileTypeOpen, setIsFileTypeOpen] = useState(false);
  const [importSearch, setImportSearch] = useState('');
  const [openActionFile, setOpenActionFile] = useState(null);
  const [viewedFile, setViewedFile] = useState(null);
  const [statusImportFile, setStatusImportFile] = useState(null);
  const [newImportStatus, setNewImportStatus] = useState('Validated');
  const [statusComment, setStatusComment] = useState('');

  const selectedFileTypeDetails = useMemo(
    () => supportedFileTypes.find(fileType => fileType.label === selectedFileType),
    [selectedFileType],
  );
  const filteredImports = useMemo(() => {
    const normalizedSearch = importSearch.toLowerCase();

    return imports.filter(importFile => {
      const searchableText = `${importFile.fileName} ${importFile.type} ${importFile.uploadedBy} ${importFile.uploadedAt} ${importFile.status}`.toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [importSearch, imports]);
  const viewedFileRows = viewedFile ? buildFileBrowserRows(viewedFile) : [];

  const openStatusModal = importFile => {
    setStatusImportFile(importFile);
    setNewImportStatus(importFile.status);
    setStatusComment('');
    setOpenActionFile(null);
  };

  const closeStatusModal = () => {
    setStatusImportFile(null);
    setStatusComment('');
  };

  const updateImportStatus = () => {
    setImports(currentImports =>
      currentImports.map(currentImport =>
        currentImport.fileName === statusImportFile.fileName ? { ...currentImport, status: newImportStatus } : currentImport,
      ),
    );
    setViewedFile(currentViewedFile =>
      currentViewedFile?.fileName === statusImportFile.fileName ? { ...currentViewedFile, status: newImportStatus } : currentViewedFile,
    );
    closeStatusModal();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-500">Operations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-950">Data Import</h1>
        <p className="mt-2 text-sm text-gray-500">Upload files to keep fund data accurate and up to date.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-700">Types of Files Supported</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
              {supportedFileTypes.map(fileType => (
                <div key={fileType.label} className="flex gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${fileType.iconTone}`}>
                    <FileTypeIcon name={fileType.icon} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-950">{fileType.label}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500">{fileType.description}</p>
                    <span className="mt-3 inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-500">
                      {fileType.formats}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-950">Import File</h2>

            <div className="mt-5 max-w-xl">
              <p className="text-sm font-semibold text-gray-500">Select File Type</p>
              <div className="relative mt-2">
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-600 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onClick={() => setIsFileTypeOpen(isOpen => !isOpen)}
                  type="button"
                >
                  <span>{selectedFileType || 'Select file type'}</span>
                  <span className={`text-gray-400 transition ${isFileTypeOpen ? 'rotate-180' : ''}`}>⌄</span>
                </button>

                {isFileTypeOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
                    {supportedFileTypes.map(fileType => (
                      <button
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                        key={fileType.label}
                        onClick={() => {
                          setSelectedFileType(fileType.label);
                          setIsFileTypeOpen(false);
                        }}
                        type="button"
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${fileType.iconTone}`}>
                          <FileTypeIcon name={fileType.icon} small />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-gray-950">{fileType.label}</span>
                          <span className="block text-xs text-gray-500">{fileType.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedFileTypeDetails && (
                <p className="mt-2 text-xs text-gray-400">Accepted formats: {selectedFileTypeDetails.formats}</p>
              )}
            </div>

            <div className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 px-6 py-10 text-center transition hover:border-blue-300 hover:bg-blue-50/60">
              <svg className="h-12 w-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V8m0 0l-3 3m3-3l3 3M6 16.5a4.5 4.5 0 01.8-8.93A5.5 5.5 0 0117.5 9.5H18a3.5 3.5 0 010 7h-2" />
              </svg>
              <p className="mt-3 font-bold text-gray-950">Drag and drop your file here</p>
              <p className="mt-1 text-sm text-gray-500">or</p>
              <button className="mt-3 rounded-lg border border-blue-500 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
                Browse Files
              </button>
              <p className="mt-4 text-xs font-medium text-gray-500">CSV, XLSX, XLSM – Max 50MB</p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <h2 className="text-sm font-bold text-gray-950">Recent Imports</h2>
              <div className="relative w-full md:w-80">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-600 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  onChange={event => setImportSearch(event.target.value)}
                  placeholder="Search files..."
                  value={importSearch}
                />
              </div>
            </div>
            <div className="mt-5 max-h-96 overflow-y-auto rounded-lg border border-gray-100">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs uppercase tracking-wider text-gray-400 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold">File Name</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Uploaded By</th>
                    <th className="px-4 py-3 font-semibold">Uploaded At</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredImports.map(importFile => (
                    <tr key={importFile.fileName} className="transition hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-emerald-700">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 012-2h5l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V3zm7 1v3h3l-3-3z" />
                            </svg>
                          </span>
                          <span className="font-medium text-gray-950">{importFile.fileName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge className={typeBadgeStyles[importFile.type]}>{importFile.type}</Badge>
                      </td>
                      <td className="px-4 py-4 text-gray-600">{importFile.uploadedBy}</td>
                      <td className="px-4 py-4 text-gray-600">{importFile.uploadedAt}</td>
                      <td className="px-4 py-4">
                        <Badge className={statusBadgeStyles[importFile.status]}>{importFile.status}</Badge>
                      </td>
                      <td className="relative px-4 py-4 text-right">
                        <button
                          className="rounded-lg px-2 py-1 text-xl font-bold text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                          onClick={() => setOpenActionFile(openActionFile === importFile.fileName ? null : importFile.fileName)}
                          type="button"
                        >
                          ...
                        </button>
                        {openActionFile === importFile.fileName && (
                          <div className="absolute right-4 top-11 z-20 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white text-left shadow-xl">
                            <a
                              className="block w-full px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                              download={importFile.fileName}
                              href={buildDownloadHref(importFile)}
                              onClick={() => setOpenActionFile(null)}
                            >
                              Download File
                            </a>
                            <button
                              className="block w-full px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                              onClick={() => {
                                setViewedFile(importFile);
                                setOpenActionFile(null);
                              }}
                              type="button"
                            >
                              View File Contents
                            </button>
                            <button
                              className="block w-full px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                              onClick={() => openStatusModal(importFile)}
                              type="button"
                            >
                              Update Status
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredImports.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-gray-400" colSpan={6}>
                        No files match your search.
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
            <div className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-5 text-3xl font-bold text-gray-950">19:00</p>
            <p className="mt-2 text-sm text-gray-500">8 Apr 2026</p>
            <p className="mt-2 text-sm font-medium text-gray-600">Daily NAV upload</p>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M12 14a4 4 0 10-4-4" />
                </svg>
              </span>
              <h2 className="text-sm font-bold text-gray-950">Import Tips</h2>
            </div>
            <div className="mt-5 space-y-5">
              <TipItem>Ensure your file follows the required format.</TipItem>
              <TipItem>Check for validation errors after upload.</TipItem>
              <TipItem>Large files may take a few minutes to process.</TipItem>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-950">Validation Summary (Last Import)</h2>
            <div className="mt-5 flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <div>
                <p className="font-bold text-gray-950">No errors found</p>
                <p className="mt-1 text-sm text-gray-500">All validation checks passed.</p>
              </div>
            </div>
            <button className="mt-5 text-sm font-semibold text-blue-700 transition hover:text-blue-900 hover:underline">
              View details
            </button>
          </section>
        </aside>
      </div>

      {viewedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">File Browser</p>
                <h2 className="mt-2 text-xl font-bold text-gray-950">{viewedFile.fileName}</h2>
                <p className="mt-1 text-sm text-gray-500">{viewedFile.type} · Uploaded {viewedFile.uploadedAt}</p>
              </div>
              <button className="text-2xl leading-none text-gray-400 transition hover:text-gray-700" onClick={() => setViewedFile(null)} type="button">
                ×
              </button>
            </div>
            <div className="overflow-auto p-6">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Field</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewedFileRows.map(row => (
                    <tr key={row.Field}>
                      <td className="px-4 py-4 font-medium text-gray-600">{row.Field}</td>
                      <td className="px-4 py-4 text-gray-700">{row.Value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {statusImportFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Update Status</p>
                <h2 className="mt-2 text-xl font-bold text-gray-950">Update Import Status</h2>
              </div>
              <button className="text-2xl leading-none text-gray-400 transition hover:text-gray-700" onClick={closeStatusModal} type="button">
                ×
              </button>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-gray-500">File Name</p>
                <p className="mt-1 break-all font-bold text-gray-950">{statusImportFile.fileName}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500">Current Status</p>
                <div className="mt-2">
                  <Badge className={statusBadgeStyles[statusImportFile.status]}>{statusImportFile.status}</Badge>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">New Status</span>
                <select
                  className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  value={newImportStatus}
                  onChange={event => setNewImportStatus(event.target.value)}
                >
                  <option value="Validated">Validated</option>
                  <option value="Pending Review">Pending Review</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-gray-500">Comment <span className="font-normal">(Optional)</span></span>
                <textarea
                  className="mt-2 h-28 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  maxLength={300}
                  placeholder="Add a comment about this status update..."
                  value={statusComment}
                  onChange={event => setStatusComment(event.target.value)}
                />
                <span className="mt-1 block text-right text-xs font-medium text-gray-400">{statusComment.length} / 300</span>
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="rounded-lg border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                onClick={closeStatusModal}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                onClick={updateImportStatus}
                type="button"
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

function buildDownloadHref(importFile) {
  const rows = fileContents[importFile.fileName] || buildFallbackFileRows(importFile);
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csvRows = [columns.join(','), ...rows.map(row => columns.map(column => `"${String(row[column]).replaceAll('"', '""')}"`).join(','))];

  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvRows.join('\n'))}`;
}

function buildFileBrowserRows(importFile) {
  return [
    { Field: 'File Name', Value: importFile.fileName },
    { Field: 'Type', Value: importFile.type },
    { Field: 'Uploaded By', Value: importFile.uploadedBy },
    { Field: 'Uploaded At', Value: importFile.uploadedAt },
    { Field: 'Status', Value: importFile.status },
  ];
}

function buildFallbackFileRows(importFile) {
  return [
    { Field: 'File Name', Value: importFile.fileName },
    { Field: 'Type', Value: importFile.type },
    { Field: 'Uploaded By', Value: importFile.uploadedBy },
    { Field: 'Uploaded At', Value: importFile.uploadedAt },
    { Field: 'Status', Value: importFile.status },
  ];
}

function Badge({ children, className }) {
  return <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-center text-xs font-bold leading-tight ${className}`}>{children}</span>;
}

function TipItem({ children }) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
      <p className="text-sm leading-5 text-gray-600">{children}</p>
    </div>
  );
}

function FileTypeIcon({ name, small = false }) {
  const iconClass = small ? 'h-4 w-4' : 'h-6 w-6';

  if (name === 'chart') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m0 14h16M8 17V9m4 8V6m4 11v-5" />
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

  if (name === 'arrows') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h11m0 0l-3-3m3 3l-3 3M17 17H6m0 0l3 3m-3-3l3-3" />
      </svg>
    );
  }

  if (name === 'bank') {
    return (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V9m4 12V9m6 12V9m4 12V9M3 9h18L12 3 3 9z" />
      </svg>
    );
  }

  return (
    <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6h6M9 10h6M9 14h3M5 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" />
    </svg>
  );
}