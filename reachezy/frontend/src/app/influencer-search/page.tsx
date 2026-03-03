'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUserSession, getUserRole } from '@/lib/auth';
import { NICHES, FOLLOWER_BUCKETS } from '@/lib/constants';
import CreatorCard from '@/components/CreatorCard';
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

const ENERGIES = ['high', 'moderate', 'calm', 'chaotic', 'intense'] as const;
const AESTHETICS = ['minimal', 'vibrant', 'dark', 'pastel', 'natural', 'luxury', 'corporate', 'streetwear'] as const;
const PRICE_TIERS = [
  { label: '\u20B9', maxAvg: 3000 },
  { label: '\u20B9\u20B9', maxAvg: 8000 },
  { label: '\u20B9\u20B9\u20B9', maxAvg: 20000 },
  { label: '\u20B9\u20B9\u20B9\u20B9', maxAvg: Infinity },
] as const;

type SortOption = 'followers_desc' | 'followers_asc' | 'name_asc';

const PAGE_SIZE = 20;

function getPriceTierIndex(rates: Rates): number {
  const avg = (rates.reel_rate + rates.story_rate + rates.post_rate) / 3;
  if (avg < 3000) return 0;
  if (avg <= 8000) return 1;
  if (avg <= 20000) return 2;
  return 3;
}

interface ParsedQuery {
  niche?: string | null;
  city?: string | null;
  keywords?: string[];
  energy?: string | null;
  aesthetic?: string | null;
  topics?: string[];
}

export default function InfluencerSearchPage() {
  const router = useRouter();
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilter, setNicheFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [followerFilter, setFollowerFilter] = useState<string | null>(null);
  const [energyFilter, setEnergyFilter] = useState<string | null>(null);
  const [aestheticFilter, setAestheticFilter] = useState<string | null>(null);
  const [priceTierFilter, setPriceTierFilter] = useState<number | null>(null);
  const [barterOnly, setBarterOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('followers_desc');
  const [page, setPage] = useState(1);

  const isBrandUser = getUserRole() === 'brand';

  useEffect(() => {
    const session = getUserSession();
    if (!session) {
      router.replace('/login');
    }
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllCreators();
      setAllCreators(data.results || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }

    if (isBrandUser) {
      try {
        const data = await api.getWishlist();
        const ids = new Set<string>(
          (data.wishlist || []).map((c: Creator) => c.creator_id)
        );
        setSavedIds(ids);
      } catch {
        // ignore
      }
    }
  }, [isBrandUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // AI search
  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setParsedQuery(null);
      setSearchSource(null);
      loadData();
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchCreators(q);
      setAllCreators(data.results || []);
      setParsedQuery(data.parsed || null);
      setSearchSource(data.source || null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  // Client-side filtering
  const filtered = useMemo(() => {
    let list = [...allCreators];

    if (nicheFilter) {
      list = list.filter((c) => c.niche === nicheFilter);
    }
    if (cityFilter.trim()) {
      const q = cityFilter.trim().toLowerCase();
      list = list.filter((c) => c.city?.toLowerCase().includes(q));
    }
    if (followerFilter) {
      const bucket = FOLLOWER_BUCKETS.find((b) => b.label === followerFilter);
      if (bucket) {
        list = list.filter(
          (c) => c.followers_count >= bucket.min && c.followers_count < bucket.max
        );
      }
    }
    if (energyFilter) {
      list = list.filter(
        (c) => c.style_profile?.dominant_energy?.toLowerCase().includes(energyFilter.toLowerCase())
      );
    }
    if (aestheticFilter) {
      list = list.filter(
        (c) => c.style_profile?.dominant_aesthetic?.toLowerCase().includes(aestheticFilter.toLowerCase())
      );
    }
    if (priceTierFilter !== null) {
      list = list.filter(
        (c) => c.rates && getPriceTierIndex(c.rates) === priceTierFilter
      );
    }
    if (barterOnly) {
      list = list.filter((c) => c.rates?.accepts_barter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'followers_desc') return b.followers_count - a.followers_count;
      if (sortBy === 'followers_asc') return a.followers_count - b.followers_count;
      return (a.display_name || a.username).localeCompare(
        b.display_name || b.username
      );
    });

    return list;
  }, [
    allCreators,
    nicheFilter,
    cityFilter,
    followerFilter,
    energyFilter,
    aestheticFilter,
    priceTierFilter,
    barterOnly,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [nicheFilter, cityFilter, followerFilter, energyFilter, aestheticFilter, priceTierFilter, barterOnly, sortBy]);

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

  const hasActiveFilters = !!(
    searchQuery || nicheFilter || cityFilter || followerFilter ||
    energyFilter || aestheticFilter || priceTierFilter !== null ||
    barterOnly || sortBy !== 'followers_desc'
  );

  const clearAllFilters = () => {
    setSearchQuery('');
    setNicheFilter(null);
    setCityFilter('');
    setFollowerFilter(null);
    setEnergyFilter(null);
    setAestheticFilter(null);
    setPriceTierFilter(null);
    setBarterOnly(false);
    setSortBy('followers_desc');
    setParsedQuery(null);
    setSearchSource(null);
    loadData();
  };

  const pillClass = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer ${
      active
        ? 'bg-primary-100 font-medium text-primary-700'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar savedCount={savedIds.size} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Find Creators</h1>
          <p className="mt-1 text-gray-600">
            {isBrandUser
              ? 'Discover influencers that match your brand'
              : 'Find creators to collaborate with'}
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Filters */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-8 space-y-6">
              {/* Search */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Search
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="AI search..."
                    className="input-field flex-1 text-sm"
                  />
                  <button type="submit" className="btn-primary shrink-0 px-3 text-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </button>
                </form>
              </div>

              {/* Clear All Filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All Filters
                </button>
              )}

              {/* Niche */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Niche
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setNicheFilter(null)}
                    className={pillClass(!nicheFilter)}
                  >
                    All
                  </button>
                  {NICHES.map((niche) => (
                    <button
                      key={niche}
                      onClick={() =>
                        setNicheFilter(nicheFilter === niche ? null : niche)
                      }
                      className={pillClass(nicheFilter === niche)}
                    >
                      {niche}
                    </button>
                  ))}
                </div>
              </div>

              {/* City */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  City
                </h3>
                <input
                  type="text"
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  placeholder="Filter by city..."
                  className="input-field w-full text-sm"
                />
              </div>

              {/* Followers */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Followers
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setFollowerFilter(null)}
                    className={pillClass(!followerFilter)}
                  >
                    All
                  </button>
                  {FOLLOWER_BUCKETS.map((bucket) => (
                    <button
                      key={bucket.label}
                      onClick={() =>
                        setFollowerFilter(
                          followerFilter === bucket.label ? null : bucket.label
                        )
                      }
                      className={pillClass(followerFilter === bucket.label)}
                    >
                      {bucket.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Energy
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setEnergyFilter(null)}
                    className={pillClass(!energyFilter)}
                  >
                    All
                  </button>
                  {ENERGIES.map((e) => (
                    <button
                      key={e}
                      onClick={() =>
                        setEnergyFilter(energyFilter === e ? null : e)
                      }
                      className={pillClass(energyFilter === e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aesthetic */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Aesthetic
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setAestheticFilter(null)}
                    className={pillClass(!aestheticFilter)}
                  >
                    All
                  </button>
                  {AESTHETICS.map((a) => (
                    <button
                      key={a}
                      onClick={() =>
                        setAestheticFilter(aestheticFilter === a ? null : a)
                      }
                      className={pillClass(aestheticFilter === a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Tier */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Price Tier
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setPriceTierFilter(null)}
                    className={pillClass(priceTierFilter === null)}
                  >
                    All
                  </button>
                  {PRICE_TIERS.map((tier, idx) => (
                    <button
                      key={tier.label}
                      onClick={() =>
                        setPriceTierFilter(priceTierFilter === idx ? null : idx)
                      }
                      className={pillClass(priceTierFilter === idx)}
                    >
                      {tier.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Barter */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={barterOnly}
                    onChange={(e) => setBarterOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Open to Barter</span>
                </label>
              </div>

              {/* Sort */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Sort By
                </h3>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="input-field w-full text-sm"
                >
                  <option value="followers_desc">Followers (high to low)</option>
                  <option value="followers_asc">Followers (low to high)</option>
                  <option value="name_asc">Name A-Z</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="py-16 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                <p className="text-gray-600">Loading creators...</p>
              </div>
            ) : (
              <>
                {/* Parsed query display */}
                {parsedQuery && (parsedQuery.niche || parsedQuery.city || parsedQuery.energy || parsedQuery.aesthetic || (parsedQuery.topics && parsedQuery.topics.length > 0)) && (
                  <div className="mb-4 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <svg className="h-4 w-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                      </svg>
                      <span className="font-medium text-primary-700">
                        {searchSource === 'ai' ? 'AI Parsed' : 'Parsed'}:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {parsedQuery.niche && (
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
                            Niche: {parsedQuery.niche}
                          </span>
                        )}
                        {parsedQuery.city && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            City: {parsedQuery.city}
                          </span>
                        )}
                        {parsedQuery.energy && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            Energy: {parsedQuery.energy}
                          </span>
                        )}
                        {parsedQuery.aesthetic && (
                          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Aesthetic: {parsedQuery.aesthetic}
                          </span>
                        )}
                        {parsedQuery.topics && parsedQuery.topics.length > 0 && parsedQuery.topics.map((t: string) => (
                          <span key={t} className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <p className="mb-4 text-sm text-gray-500">
                  {filtered.length} creator{filtered.length !== 1 ? 's' : ''} found
                </p>

                {filtered.length === 0 ? (
                  <div className="py-16 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-700">No creators found</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                      Try a different search or adjust your filters. Here are some suggestions:
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {['beauty creators in delhi', 'tech creators in bangalore', 'food bloggers in mumbai', 'fitness creators'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={async () => {
                            setSearchQuery(suggestion);
                            setLoading(true);
                            try {
                              const data = await api.searchCreators(suggestion);
                              setAllCreators(data.results || []);
                              setParsedQuery(data.parsed || null);
                              setSearchSource(data.source || null);
                            } catch { /* ignore */ }
                            finally { setLoading(false); setPage(1); }
                          }}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {paginated.map((creator) => (
                        <CreatorCard
                          key={creator.creator_id}
                          creator={creator}
                          isSaved={savedIds.has(creator.creator_id)}
                          onToggleSave={
                            isBrandUser ? handleToggleSave : () => {}
                          }
                          savingId={savingId}
                          showWishlist={isBrandUser}
                        />
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-8 flex items-center justify-center gap-4">
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="btn-secondary text-sm disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-500">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={page === totalPages}
                          className="btn-secondary text-sm disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
