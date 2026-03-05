'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUserSession } from '@/lib/auth';
import AppNavbar from '@/components/AppNavbar';

interface BrandInfo {
  company_name: string;
  industry: string;
  contact_name: string;
  email: string;
}

export default function BrandDashboardPage() {
  const router = useRouter();
  const [brand, setBrand] = useState<BrandInfo | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getUserSession();
    if (!session || session.role !== 'brand') {
      router.replace('/login?role=brand');
      return;
    }
    // Extract brand info from token
    setBrand({
      company_name: session.username || 'Your Brand',
      industry: '',
      contact_name: '',
      email: '',
    });
    setLoading(false);
  }, [router]);

  const loadWishlistCount = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setSavedCount((data.wishlist || []).length);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadWishlistCount();
  }, [loadWishlistCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppNavbar savedCount={0} />
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  const companyInitial = (brand?.company_name || 'B')[0].toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar savedCount={savedCount} />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Brand Profile Header */}
        <div className="rounded-xl border border-gray-200 bg-white p-8">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-3xl font-bold text-white shadow-lg">
              {companyInitial}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {brand?.company_name}
              </h1>
              <p className="mt-1 text-gray-500">
                Welcome back to your brand dashboard
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-100">
                <svg className="h-5 w-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{savedCount}</p>
                <p className="text-sm text-gray-500">Saved Creators</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">5</p>
                <p className="text-sm text-gray-500">Conversations</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">50+</p>
                <p className="text-sm text-gray-500">Creators Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/influencer-search"
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 transition-colors group-hover:bg-primary-200">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Find Creators</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Search and discover influencers
                </p>
              </div>
            </Link>

            <Link
              href="/brand/wishlist"
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-pink-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 transition-colors group-hover:bg-pink-200">
                <svg className="h-6 w-6 text-pink-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Saved Creators</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  View your shortlisted creators
                </p>
              </div>
            </Link>

            <Link
              href="/messages"
              className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 transition-colors group-hover:bg-blue-200">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Messages</h3>
                <p className="mt-0.5 text-sm text-gray-500">
                  Chat with creators
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8">
          <h2 className="mb-6 text-lg font-semibold text-gray-900">How ReachEzy Works</h2>
          <div className="grid gap-6 sm:grid-cols-4">
            {[
              { step: '1', title: 'Discover', desc: 'Search creators by niche, city, style, and more using AI-powered search' },
              { step: '2', title: 'Shortlist', desc: 'Save your favorite creators to your wishlist for easy comparison' },
              { step: '3', title: 'Connect', desc: 'Send messages directly to creators and discuss collaborations' },
              { step: '4', title: 'Collaborate', desc: 'Finalize deals, send briefs, and launch your campaign' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
