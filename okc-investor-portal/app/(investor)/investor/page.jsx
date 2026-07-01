import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import InvestorDashboard from './InvestorDashboard';

// The dashboard reads the URL search query via useSearchParams (a client-only
// hook). Wrapping it in Suspense lets the rest of the route prerender while the
// search-dependent part renders on the client. See Next.js "missing-suspense
// -with-csr-bailout".
export default async function InvestorPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email ?? null;

  return (
    <Suspense>
      <InvestorDashboard email={email} />
    </Suspense>
  );
}
