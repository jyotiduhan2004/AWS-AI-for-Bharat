'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUserSession } from '@/lib/auth';
import { api } from '@/lib/api';
import BrandShell from '@/components/BrandShell';

const PAGE_TITLES: Record<string, string> = {
  '/brand/dashboard': 'Dashboard Overview',
  '/brand/search':    'Find Creators',
  '/brand/wishlist':  'Saved Creators',
  '/brand/messages':  'Messages',
};

export default function BrandLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState('Brand');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [savedCount, setSavedCount] = useState(0);
  const [ready, setReady] = useState(false);

  const loadWishlistCount = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setSavedCount((data.wishlist || []).length);
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    const session = getUserSession();
    if (!session || session.role !== 'brand') {
      router.replace('/login?role=brand');
      return;
    }
    setCompanyName(session.username || 'Brand');
    setAvatarUrl(session.avatar_url);
    setReady(true);
    loadWishlistCount();
  }, [router, loadWishlistCount]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  const title = PAGE_TITLES[pathname] ?? 'Brand Dashboard';

  return (
    <BrandShell companyName={companyName} avatarUrl={avatarUrl} title={title} savedCount={savedCount}>
      {children}
    </BrandShell>
  );
}
