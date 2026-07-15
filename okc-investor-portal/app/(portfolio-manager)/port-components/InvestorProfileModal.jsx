export default function InvestorProfileModal({ investor, onClose }) {
  if (!investor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Investor Profile</p>
            <h2 className="mt-2 text-xl font-bold text-gray-950">Account Information</h2>
          </div>
          <button
            className="text-2xl leading-none text-gray-400 transition hover:text-gray-700"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-6 flex items-center gap-4 rounded-xl bg-gray-50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
            {getInitials(investor.name)}
          </div>
          <div>
            <p className="font-bold text-gray-950">{investor.name}</p>
            <p className="mt-1 text-sm text-gray-500">{investor.id}</p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-gray-100">
          <ProfileRow label="Registered Name" value={investor.name} />
          <ProfileRow label="Registered Email" value={investor.email} />
          <ProfileRow label="Investor ID" value={investor.id} />
          <ProfileRow label="Registered Date" value={investor.registeredAt} />
        </div>
      </div>
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