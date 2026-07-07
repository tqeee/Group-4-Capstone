import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Dashboard', href: '/operations' },
  { label: 'Transactions', href: '/ops-transactions' },
  { label: 'Data Import', href: '/data-import' },
  { label: 'Funds', href: '/ops-funds' },
  { label: 'Investors', href: '/investors' },
  { label: 'Operation Log', href: '/operation-log' },
];

export default async function OperationsLayout({ children }) {
  const { email } = await requireRoleForPage('operations');

  return (
    <DashboardNav
      email={email}
      roleLabel="Operations"
      badge="Operations"
      brandLetter="O"
      navItems={navItems}
    >
      {children}
    </DashboardNav>
  );
}
