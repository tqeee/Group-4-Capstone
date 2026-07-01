import { createClient } from '@/lib/supabase/server';
import DashboardNav from './DashboardNav';

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email ?? null;

  return <DashboardNav email={email}>{children}</DashboardNav>;
}
