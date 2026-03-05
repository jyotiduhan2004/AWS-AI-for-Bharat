'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getUserSession } from '@/lib/auth';
import NotificationsDropdown from './NotificationsDropdown';

interface AppNavbarProps {
  savedCount?: number;
}

export default function AppNavbar({
  savedCount,
}: AppNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = getUserSession();
  const role = session?.role;
  const isBrand = role === 'brand';
  const avatarUrl = session?.avatar_url;
  const initials = (session?.username || 'U')[0].toUpperCase();

  const handleLogout = () => {
    clearToken();
    router.replace('/');
  };

  const linkClass = (href: string) =>
    `text-sm font-medium transition-colors ${
      pathname === href
        ? 'text-primary-600'
        : 'text-gray-600 hover:text-primary-600'
    }`;

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-sm font-bold text-white">R</span>
          </div>
          <span className="text-lg font-bold text-gray-900">ReachEzy</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={isBrand ? '/brand/dashboard' : '/dashboard'}
            className={linkClass(isBrand ? '/brand/dashboard' : '/dashboard')}
          >
            Dashboard
          </Link>
          {isBrand && (
            <Link href="/influencer-search" className={linkClass('/influencer-search')}>
              Find Creators
            </Link>
          )}
          <Link href="/messages" className={linkClass('/messages')}>
            Messages
          </Link>

          {isBrand && (
            <Link
              href="/brand/wishlist"
              className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                pathname === '/brand/wishlist'
                  ? 'text-primary-600'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              <svg
                className="h-4 w-4"
                fill={pathname === '/brand/wishlist' ? 'currentColor' : 'none'}
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              Saved{savedCount ? ` (${savedCount})` : ''}
            </Link>
          )}

          {!isBrand && (
            <Link href="/upload" className={linkClass('/upload')}>
              Upload
            </Link>
          )}

          <div className="mx-2">
            <NotificationsDropdown />
          </div>

          <div className={`flex h-8 w-8 items-center justify-center rounded-full overflow-hidden cursor-pointer ${avatarUrl ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-primary-500 to-primary-600'}`}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-contain p-0.5" />
            ) : (
              <span className="text-sm font-bold text-white">{initials}</span>
            )}
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
