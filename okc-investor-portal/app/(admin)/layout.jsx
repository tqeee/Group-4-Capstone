import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Overview', href: '/admin' },
  { label: 'Users', href: '/users' },
  { label: 'Audit Logs', href: '/audit-logs' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Settings', href: '/settings' },
];

export default async function AdminLayout({ children }) {
  const { email } = await requireRoleForPage('admin');

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
