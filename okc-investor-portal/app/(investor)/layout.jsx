import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Dashboard', href: '/investor' },
  { label: 'Funds', href: '/funds' },
  { label: 'Activity', href: '/activity' },
  { label: 'Reports', href: '/reports' },
  { label: 'Documents', href: '/documents' },
];

export default async function DashboardLayout({ children }) {
  const { email } = await requireRoleForPage('investor');

  return (
    <DashboardNav
      email={email}
      roleLabel="Investor"
      navItems={navItems}
      searchPath="/investor"
      searchPlaceholder="Search funds..."
    >
      {children}
    </DashboardNav>
  );
}
