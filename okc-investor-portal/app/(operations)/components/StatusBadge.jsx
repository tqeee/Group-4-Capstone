const statusStyles = {
  Pending: 'bg-amber-100 text-amber-800 ring-amber-200 hover:bg-amber-200 hover:shadow-amber-100',
  Review: 'bg-sky-100 text-sky-800 ring-sky-200 hover:bg-sky-200 hover:shadow-sky-100',
  Complete: 'bg-emerald-100 text-emerald-800 ring-emerald-200 hover:bg-emerald-200 hover:shadow-emerald-100',
  Open: 'bg-violet-100 text-violet-800 ring-violet-200 hover:bg-violet-200 hover:shadow-violet-100',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex cursor-default items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        statusStyles[status] || 'bg-gray-100 text-gray-700 ring-gray-200 hover:bg-gray-200 hover:shadow-gray-100'
      }`}
    >
      {status}
    </span>
  );
}