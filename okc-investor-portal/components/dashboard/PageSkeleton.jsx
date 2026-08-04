// Generic dashboard-content skeleton, shown as the Suspense fallback by the
// route-group loading.jsx files while a page streams in. It renders where the
// page normally sits (inside DashboardNav's <main>), so the sidebar/top bar
// stay put and only the content region shimmers. Deliberately layout-agnostic:
// a title block, a stat-card row, and a table/chart block cover every page's
// broad shape closely enough to read as a buffer rather than a blank flash.

const STAT_CARDS = ['a', 'b', 'c', 'd'];
const TABLE_ROWS = ['a', 'b', 'c', 'd', 'e', 'f'];

export default function PageSkeleton() {
  return (
    <div className="animate-pulse" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>

      {/* Page header: title + subtitle, with a trailing action placeholder. */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-8 w-56 rounded-lg bg-gray-200" />
          <div className="h-4 w-72 max-w-full rounded bg-gray-200" />
        </div>
        <div className="hidden h-10 w-32 rounded-lg bg-gray-200 sm:block" />
      </div>

      {/* Stat-card row. */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((key) => (
          <div key={key} className="card p-6">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="mt-4 h-8 w-32 rounded-lg bg-gray-200" />
            <div className="mt-3 h-3 w-20 rounded bg-gray-200" />
          </div>
        ))}
      </div>

      {/* Main content block (stands in for a table or chart). */}
      <div className="card p-6">
        <div className="mb-6 h-5 w-40 rounded bg-gray-200" />
        <div className="space-y-4">
          {TABLE_ROWS.map((key) => (
            <div key={key} className="flex items-center gap-4">
              <div className="h-4 flex-1 rounded bg-gray-200" />
              <div className="hidden h-4 w-24 rounded bg-gray-200 sm:block" />
              <div className="h-4 w-16 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
