import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Overview', href: '/admin' },
  { label: 'Users', href: '/users' },
  { label: 'Audit Logs', href: '/audit-logs' },
  { label: 'Settings', href: '/settings' },
];

export default async function AdminLayout({ children }) {
  const { email } = await requireRoleForPage('admin');
  return (
    <DashboardNav
      email={email}
      roleLabel="Administrator"
      badge="Admin"
      role="admin"
      navItems={navItems}
    >
      {children}
    </DashboardNav>
  );
}