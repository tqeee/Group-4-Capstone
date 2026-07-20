import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Overview', href: '/admin' },
  { label: 'Users', href: '/users' },
  { label: 'Audit Logs', href: '/audit-logs' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Settings', href: '/settings' },
];

<<<<<<< Updated upstream
export default async function AdminLayout({ children }) {
  const { email } = await requireRoleForPage('admin');
=======
  const navItems = [
    { label: 'Overview', href: '/admin' },
    { label: 'Users', href: '/users' },
    { label: 'Audit Logs', href: '/audit-logs' },
    { label: 'Settings', href: '/settings' },
  ];
>>>>>>> Stashed changes

  return (
    <DashboardNav
      email={email}
      roleLabel="Administrator"
      badge="Admin"
      brandLetter="A"
      navItems={navItems}
    >
      {children}
    </DashboardNav>
  );
}
