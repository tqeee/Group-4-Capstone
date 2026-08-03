const statusClasses = {
  Completed: 'bg-green-100 text-green-700 border-green-200',
  Review: 'bg-blue-100 text-blue-700 border-blue-200',
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
};

export default function StatusPill({ status }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[status] || 'border-gray-200 bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}