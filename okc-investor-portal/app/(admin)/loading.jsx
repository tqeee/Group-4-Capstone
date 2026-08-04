import PageSkeleton from '@/components/dashboard/PageSkeleton';

// Suspense fallback for every admin page. Renders inside the shared layout
// (DashboardNav shell), so the sidebar/top bar stay put while the page streams.
export default function Loading() {
  return <PageSkeleton />;
}
