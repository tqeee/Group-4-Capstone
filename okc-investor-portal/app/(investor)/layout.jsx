'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/investor' },
    { label: 'Funds', href: '/funds' },
    { label: 'Activity', href: '/activity' },
    { label: 'Reports', href: '/reports' },
    { label: 'Documents', href: '/documents' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              F
            </div>
            <span className="font-semibold text-gray-900">OKC Capital</span>
          </div>
          <div className="flex gap-6">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm pb-1 transition ${
                  pathname === item.href
                    ? 'text-gray-900 font-semibold border-b-2 border-blue-700'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              placeholder="Search funds, dates..."
              className="bg-transparent text-sm text-gray-600 outline-none w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
              FC
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 leading-none">Faye Cheah</p>
              <p className="text-xs text-gray-400 mt-0.5">INV-204812</p>
            </div>
          </div>
        </div>
      </nav>
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}