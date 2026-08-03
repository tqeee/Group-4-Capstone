'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signout } from '@/app/(auth)/login/actions';
import IdleTimeout from './IdleTimeout';

// Shared shell for the investor, operations and admin sections: a sticky
// top bar — brand/search/profile row with tab links below on desktop, a
// scrollable pill strip on mobile. Each server layout passes its own nav
// items and identity read from verified auth claims.

const LABEL_ICONS = {
  Dashboard: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6',
  Overview: 'M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6',
  Funds: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z',
  Activity: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  Reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  Documents: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  Transactions: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
  'Data Import': 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
  Investors: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  Users: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  'Operation Log': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  'Audit Logs': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  Settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
};
const FALLBACK_ICON = 'M4 6h16M4 12h16M4 18h16';

function NavIcon({ label, className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d={LABEL_ICONS[label] ?? FALLBACK_ICON} />
    </svg>
  );
}

// Avatar chip that opens a small account menu (Security settings + Sign out).
function ProfileMenu({ email, roleLabel, compact = false, direction = 'up' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initials = email ? email.slice(0, 2).toUpperCase() : '?';

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition hover:border-gray-200 hover:bg-gray-50 ${
          open ? 'border-gray-200 bg-gray-50' : ''
        }`}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-950 text-xs font-bold text-white">
          {initials}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold leading-tight text-gray-900">
                {email ?? 'Signed in'}
              </span>
              <span className="block text-xs text-gray-400">{roleLabel}</span>
            </span>
            <svg
              className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${
                open === (direction === 'up') ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-40 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl ${
            direction === 'up' ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2'
          }`}
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-400">Signed in as</p>
            <p className="truncate text-sm font-semibold text-gray-900">{email ?? 'Unknown'}</p>
            <p className="mt-0.5 text-xs text-gray-400">{roleLabel}</p>
          </div>
          <Link
            href="/mfa/setup"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
          >
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Security settings
          </Link>
          <form action={signout}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-2.5 text-left text-sm font-medium text-red-500 transition hover:bg-red-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SearchForm({ searchPath, placeholder, className }) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        const q = query.trim();
        router.push(q ? `${searchPath}?search=${encodeURIComponent(q)}` : searchPath);
      }}
      className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 ${className ?? ''}`}
    >
      <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
      />
    </form>
  );
}

function Brand({ brandLetter, badge }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white shadow-sm">
        {brandLetter}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold leading-tight text-gray-900">OKC</p>
        {badge && (
          <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-px text-[11px] font-semibold text-blue-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

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
  const isActive = href => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Every signed-in section renders this shell, so one mount covers all
          four role groups. Enforcement is in the proxy either way. */}
      <IdleTimeout />

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          {/* ── Brand / search / profile row ────────────────────────── */}
          <div className="flex items-center justify-between gap-4 py-3">
            <Brand brandLetter={brandLetter} badge={badge} />
            <div className="flex items-center gap-3">
              {searchPath && (
                <SearchForm
                  searchPath={searchPath}
                  placeholder={searchPlaceholder}
                  className="hidden w-64 md:flex"
                />
              )}
              <ProfileMenu email={email} roleLabel={roleLabel} compact direction="down" />
            </div>
          </div>

          {/* ── Mobile search + pill nav ────────────────────────────── */}
          {searchPath && (
            <div className="pb-3 md:hidden">
              <SearchForm searchPath={searchPath} placeholder={searchPlaceholder} />
            </div>
          )}
          <nav className="flex gap-1 overflow-x-auto pb-3 lg:hidden">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition ${
                  isActive(item.href)
                    ? 'bg-blue-600 font-semibold text-white'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <NavIcon label={item.label} className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* ── Desktop tab nav ─────────────────────────────────────── */}
          <nav className="hidden gap-1 lg:flex">
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                className={`group -mb-px flex items-center gap-2 border-b-2 px-3 pb-3 pt-1 text-sm transition ${
                  isActive(item.href)
                    ? 'border-blue-600 font-semibold text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                <NavIcon
                  label={item.label}
                  className={`h-5 w-5 flex-shrink-0 ${
                    isActive(item.href) ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
