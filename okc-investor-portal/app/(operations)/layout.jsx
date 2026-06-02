'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function OperationsLayout({ children }) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/operations' },
    { label: 'Transactions', href: '/ops-transactions' },
    { label: 'Data Import', href: '/data-import' },
    { label: 'Investors', href: '/investors' },
    { label: 'Operation Log', href: '/operation-log' },
  ];

  const isActive = href => pathname === href || (href !== '/operations' && pathname.startsWith(`${href}/`));

  return (
    <div className="min-h-screen bg-gray-50 text-gray-950">
      <nav className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-center gap-8">
          <Link href="/operations" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-700 text-sm font-bold text-white">
              O
            </div>
            <span className="font-semibold text-gray-900">OKC Capital</span>
          </Link>

          <div className="flex gap-6">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`pb-1 text-sm transition ${
                  isActive(item.href)
                    ? 'border-b-2 border-blue-700 font-semibold text-gray-900'
                    : 'text-gray-400 hover:text-gray-700'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              placeholder="Search investors, trades..."
              className="w-44 bg-transparent text-sm text-gray-600 outline-none placeholder:text-gray-400"
            />
          </div>

          <button className="relative rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700" aria-label="Notifications">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white">
              OP
            </div>
            <div>
              <p className="text-sm font-medium leading-none text-gray-900">Operations</p>
              <p className="mt-0.5 text-xs text-gray-400">OPS-1027</p>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-8 py-8">{children}</main>
    </div>
  );
}