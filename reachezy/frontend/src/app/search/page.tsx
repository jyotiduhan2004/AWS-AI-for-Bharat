'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearToken, getUserSession, getUserRole } from '@/lib/auth';
import { NICHES } from '@/lib/constants';
import CreatorCard from '@/components/CreatorCard';
import BrandCard from '@/components/BrandCard';
import AppNavbar from '@/components/AppNavbar';

interface StyleProfile {
  dominant_energy?: string;
  dominant_aesthetic?: string;
  primary_content_type?: string;
  topics?: string[];
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

interface Creator {
  creator_id: string;
  username: string;
  display_name: string;
  bio: string;
  niche: string;
  city: string;
  followers_count: number;
  media_count: number;
  profile_picture_url: string | null;
  style_profile: StyleProfile | null;
  rates: Rates | null;
}

interface Brand {
  user_id: string;
  company_name: string;
  industry: string;
  city: string;
  contact_name: string;
}

type RoleFilter = 'all' | 'creators' | 'brands';

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [nicheFilter, setNicheFilter] = useState<string | null>(null);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const role = getUserRole();
  const isBrandUser = role === 'brand';

  // Auth check
  useEffect(() => {
    const session = getUserSession();
    if (!session) {
      router.replace('/login');
    }
  }, [router]);

  // Load all creators + brands + wishlist on mount
  useEffect(() => {
    const loadAll = async () => {
      setSearching(true);
      try {
        const [creatorsData, brandsData] = await Promise.all([
          api.getAllCreators().catch(() => ({ results: [] })),
          api.searchBrands('').catch(() => ({ brands: [] })),
        ]);
        setCreators(creatorsData.results || []);
        setBrands(brandsData.brands || []);
        setSearchDone(true);
      } finally {
        setSearching(false);
      }

      if (isBrandUser) {
        try {
          const data = await api.getWishlist();
          const ids = new Set<string>(
            (data.wishlist || []).map((c: Creator) => c.creator_id)
          );
          setSavedIds(ids);
        } catch {
          // Ignore
        }
      }
    };
    loadAll();
  }, [isBrandUser]);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setSearching(true);
    setSearchDone(false);

    try {
      const promises: Promise<unknown>[] = [];

      // Search creators if filter allows
      if (roleFilter !== 'brands') {
        promises.push(
          api.searchCreators(q).then((data) => {
            let results = data.results || [];
            if (nicheFilter) {
              results = results.filter(
                (c: Creator) => c.niche?.toLowerCase() === nicheFilter.toLowerCase()
              );
            }
            setCreators(results);
          }).catch(() => setCreators([]))
        );
      } else {
        setCreators([]);
      }

      // Search brands if filter allows
      if (roleFilter !== 'creators') {
        promises.push(
          api.searchBrands(q).then((data) => {
            setBrands(data.brands || []);
          }).catch(() => setBrands([]))
        );
      } else {
        setBrands([]);
      }

      await Promise.all(promises);
      setSearchDone(true);
    } finally {
      setSearching(false);
    }
  };

  const handleToggleSave = async (creatorId: string) => {
    setSavingId(creatorId);
    try {
      if (savedIds.has(creatorId)) {
        await api.removeFromWishlist(creatorId);
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(creatorId);
          return next;
        });
      } else {
        await api.addToWishlist(creatorId);
        setSavedIds((prev) => new Set(prev).add(creatorId));
      }
    } catch (err) {
      console.error('Wishlist toggle error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/');
  };

  const dashboardHref = isBrandUser ? '/brand/dashboard' : '/dashboard';
  const totalResults = creators.length + brands.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Search Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Search ReachEzy
          </h1>
          <p className="mt-2 text-gray-600">
            Find creators and brands across the platform
          </p>
        </div>

        {/* Search Bar */}
        <div className="mx-auto mb-8 max-w-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search creators, brands, niches, cities..."
              className="input-field flex-1 text-base"
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="btn-primary shrink-0"
            >
              {searching ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              )}
            </button>
          </form>
        </div>

        {/* Two-column layout */}
        <div className="flex gap-6">
          {/* Left Sidebar — filters (hidden on mobile) */}
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Role Filter */}
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Type
                </h3>
                <div className="space-y-1">
                  {(
                    [
                      ['all', 'All'],
                      ['creators', 'Creators'],
                      ['brands', 'Brands'],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => {
                        setRoleFilter(value);
                        if (searchDone) handleSearch();
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        roleFilter === value
                          ? 'bg-primary-100 font-medium text-primary-700'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Niche Filter (only when showing creators) */}
              {roleFilter !== 'brands' && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Niche
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setNicheFilter(null);
                        if (searchDone) handleSearch();
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                        !nicheFilter
                          ? 'bg-primary-100 font-medium text-primary-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {NICHES.map((niche) => (
                      <button
                        key={niche}
                        onClick={() => {
                          setNicheFilter(nicheFilter === niche ? null : niche);
                          if (searchDone) handleSearch();
                        }}
                        className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                          nicheFilter === niche
                            ? 'bg-primary-100 font-medium text-primary-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {niche}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right: Results */}
          <div className="min-w-0 flex-1">
            {/* Mobile filter tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
              {(
                [
                  ['all', 'All'],
                  ['creators', 'Creators'],
                  ['brands', 'Brands'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => {
                    setRoleFilter(value);
                    if (searchDone) handleSearch();
                  }}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                    roleFilter === value
                      ? 'bg-primary-600 font-medium text-white'
                      : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {searching && (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="text-gray-600">Searching...</p>
              </div>
            )}

            {/* Results */}
            {!searching && searchDone && (
              <>
                <p className="mb-4 text-sm text-gray-500">
                  {query.trim()
                    ? `${totalResults} result${totalResults !== 1 ? 's' : ''} found`
                    : `Explore (${totalResults})`}
                </p>

                {totalResults === 0 && (
                  <div className="py-16 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                    </svg>
                    <p className="mt-4 text-gray-500">No results found</p>
                    <p className="text-sm text-gray-400">Try a different search term</p>
                  </div>
                )}

                {/* Creators Section */}
                {creators.length > 0 && (
                  <div className="mb-8">
                    {roleFilter === 'all' && (
                      <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Creators ({creators.length})
                      </h2>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {creators.map((creator) => (
                        <CreatorCard
                          key={creator.creator_id}
                          creator={creator}
                          isSaved={savedIds.has(creator.creator_id)}
                          onToggleSave={
                            isBrandUser ? handleToggleSave : () => {}
                          }
                          savingId={savingId}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Brands Section */}
                {brands.length > 0 && (
                  <div>
                    {roleFilter === 'all' && (
                      <h2 className="mb-4 text-lg font-semibold text-gray-900">
                        Brands ({brands.length})
                      </h2>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {brands.map((brand) => (
                        <BrandCard key={brand.user_id} brand={brand} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading state — initial load */}
            {!searching && !searchDone && (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="text-gray-600">Loading...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
