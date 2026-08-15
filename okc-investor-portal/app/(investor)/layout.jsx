import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Dashboard', href: '/investor' },
  { label: 'Funds', href: '/funds' },
  { label: 'Documents', href: '/documents' },
  { label: 'Request Transaction', href: '/request-transaction' },
];

export default async function DashboardLayout({ children }) {
  const { email } = await requireRoleForPage('investor');

  return (
    <DashboardNav
      email={email}
      roleLabel="Investor"
      role="investor"
      navItems={navItems}
      searchPath="/investor"
      searchPlaceholder="Search funds..."
    >
      {children}
    </DashboardNav>
  );
}