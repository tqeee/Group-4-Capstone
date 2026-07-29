import { requireRoleForPage } from '@/lib/auth/guards';
import DashboardNav from '@/components/dashboard/DashboardNav';

const navItems = [
  { label: 'Dashboard', href: '/portfolio-manager' },
  { label: 'Performance', href: '/performance' },
  { label: 'Investors', href: '/port-investors' },
  { label: 'Transactions', href: '/port-transactions' },
];

export default async function PortfolioManagerLayout({ children }) {
  const { email } = await requireRoleForPage('portfolio-manager');

  return (
    <DashboardNav
      email={email}
      roleLabel="Portfolio Manager"
      badge="Portfolio Manager"
      brandLetter="P"
      navItems={navItems}
      searchPath="/port-investors"
      searchPlaceholder="Search funds, investors..."
    >
      {children}
    </DashboardNav>
  );
}