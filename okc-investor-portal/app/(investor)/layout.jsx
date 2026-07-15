import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Dashboard', href: '/investor' },
  { label: 'Funds', href: '/funds' },
  { label: 'Activity', href: '/activity' },
  { label: 'Reports', href: '/reports' },
  { label: 'Documents', href: '/documents' },
];

<<<<<<< HEAD
  const navItems = [
    { label: 'Dashboard', href: '/investor' },
    { label: 'Funds', href: '/funds' },
    { label: 'Documents', href: '/documents' },
    { label: 'Request Transaction', href: '/request-transaction' },
  ];
=======
export default async function DashboardLayout({ children }) {
  const { email } = await requireRoleForPage('investor');
>>>>>>> a8148cf06cea147fd84564756a5438c7dce26888

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
