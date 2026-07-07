'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signout } from '@/app/(auth)/login/actions';

// Shared top nav for the investor, operations and admin sections. Each
// server layout passes its own nav items and identity read from verified
// auth claims.
export default function DashboardNav({
  email,
  roleLabel,
  badge,
  brandLetter = 'F',
  navItems,
  searchPath,
  searchPlaceholder = 'Search…',
  children,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const isActive = href => pathname === href || pathname.startsWith(`${href}/`);
  const initials = email ? email.slice(0, 2).toUpperCase() : '?';

  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `${searchPath}?search=${encodeURIComponent(q)}` : searchPath);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {brandLetter}
            </div>
            <span className="font-semibold text-gray-900">OKC Capital</span>
            {badge && (
              <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full ml-1">
                {badge}
              </span>
            )}
          </div>
          <div className="flex gap-6">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`text-sm pb-1 transition ${
                  isActive(item.href)
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
          {searchPath && (
            <form
              onSubmit={submitSearch}
              className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="bg-transparent text-sm text-gray-600 outline-none w-40"
              />
            </form>
          )}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 leading-none">{email ?? 'Signed in'}</p>
              {roleLabel && <p className="text-xs text-gray-400 mt-0.5">{roleLabel}</p>}
            </div>
          </div>
          <Link
            href="/mfa/setup"
            className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
          >
            Security
          </Link>
          <form action={signout}>
            <button
              type="submit"
              className="text-sm font-medium text-gray-500 transition hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main className="px-8 py-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
