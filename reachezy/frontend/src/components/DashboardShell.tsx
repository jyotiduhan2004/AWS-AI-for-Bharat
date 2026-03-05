'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';

interface DashboardShellProps {
  children: React.ReactNode;
  username: string;
  displayName: string;
  /** Header title shown in the sticky top bar */
  title: string;
  /** Optional profile picture URL */
  profilePictureUrl?: string;
  /** Optional right-side content in the header */
  headerRight?: React.ReactNode;
}

const NAV = [
  { href: '/dashboard',           icon: 'dashboard',   label: 'Dashboard' },
  { href: '/messages',            icon: 'chat',         label: 'Messages' },
  { href: '/dashboard/media-kit', icon: 'description', label: 'Media Kit' },
  { href: '/analytics',           icon: 'insights',    label: 'Detailed Analysis' },
  { href: '/upload',              icon: 'upload',       label: 'Upload Videos' },
  { href: '/dashboard/settings',  icon: 'payments',    label: 'Rate Settings' },
];

export default function DashboardShell({
  children,
  username,
  displayName,
  title,
  profilePictureUrl,
  headerRight,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const handleLogout = () => { clearToken(); router.replace('/'); };
  const initials = (displayName || username || 'U')[0].toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background-light font-display">
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-white">
            <span className="material-symbols-outlined block">auto_awesome</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">ReachEzy</h2>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'nav-link-active' : 'nav-link'}
              >
                <span className="material-symbols-outlined">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User profile at bottom */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            {profilePictureUrl ? (
              <img src={profilePictureUrl} alt={displayName} className="size-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="size-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {initials}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold truncate">{displayName || username}</p>
              <p className="text-xs text-slate-500 truncate">@{username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Sticky header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10 flex-shrink-0">
          <h1 className="text-lg font-bold text-slate-900">{title}</h1>
          <div className="flex items-center gap-4">
            {headerRight}
            {profilePictureUrl ? (
              <Link href="/dashboard/profile" title="My Account">
                <img src={profilePictureUrl} alt={displayName} className="size-8 rounded-full object-cover ring-2 ring-transparent hover:ring-primary/40 transition-all cursor-pointer" />
              </Link>
            ) : (
              <Link href="/dashboard/profile" title="My Account" className="size-8 rounded-full bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-xs font-bold ring-2 ring-transparent hover:ring-primary/40 transition-all">
                {initials}
              </Link>
            )}
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
