'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearToken, getUserSession } from '@/lib/auth';
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

interface ParsedQuery {
  niche?: string | null;
  city?: string | null;
  energy?: string | null;
  aesthetic?: string | null;
  topics?: string[];
}

const SUGGESTED_QUERIES = [
  'beauty influencer in mumbai',
  'tech reviewer with calm energy',
  'chaotic comedy creator in delhi',
  'food blogger in bangalore',
  'fashion influencer with vibrant aesthetic',
  'fitness creator in pune',
];

export default function BrandDashboardPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Creator[]>([]);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [savedCreators, setSavedCreators] = useState<Creator[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Auth check
  useEffect(() => {
    const session = getUserSession();
    if (!session || session.role !== 'brand') {
      router.replace('/login?role=brand');
    }
  }, [router]);

  // Load all creators + wishlist IDs on mount
  const loadInitialData = useCallback(async () => {
    try {
      const data = await api.getAllCreators();
      setResults(data.results || []);
      setSearchDone(true);
    } catch {
      // Ignore — will show empty state
    }

    try {
      const data = await api.getWishlist();
      const ids = new Set<string>(
        (data.wishlist || []).map((c: Creator) => c.creator_id)
      );
      setSavedIds(ids);
    } catch {
      // Ignore — wishlist might be empty
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    setQuery(q);
    setSearching(true);
    setError(null);
    setSearchDone(false);
    setShowSaved(false);

    try {
      const data = await api.searchCreators(q);
      setResults(data.results || []);
      setParsed(data.parsed || null);
      setSearchDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
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

  const handleShowSaved = async () => {
    if (showSaved) {
      setShowSaved(false);
      return;
    }
    setLoadingSaved(true);
    try {
      const data = await api.getWishlist();
      setSavedCreators(data.wishlist || []);
      setShowSaved(true);
    } catch (err) {
      console.error('Load wishlist error:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/');
  };

  const parsedBadges = parsed
    ? Object.entries(parsed).filter(
        ([key, val]) =>
          val && key !== 'topics' && key !== 'min_followers' && key !== 'max_followers'
      )
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar
        savedCount={savedIds.size}
        onShowSaved={handleShowSaved}
        showingSaved={showSaved}
      />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Search Section */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Find Your Perfect Creator
          </h1>
          <p className="mt-2 text-gray-600">
            Describe the creator you&apos;re looking for in natural language
          </p>
        </div>

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
              placeholder='e.g. "chaotic beauty influencer in noida"'
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

          {/* Parsed badges */}
          {parsedBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Parsed:</span>
              {parsedBadges.map(([key, val]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700"
                >
                  {key}: {String(val)}
                </span>
              ))}
              {parsed?.topics && parsed.topics.length > 0 && (
                parsed.topics.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  >
                    {t}
                  </span>
                ))
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-auto mb-6 max-w-2xl rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Saved View */}
        {showSaved && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Saved Creators ({savedCreators.length})
              </h2>
              <button
                onClick={() => setShowSaved(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Back to search
              </button>
            </div>
            {savedCreators.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                <p className="mt-4 text-gray-500">No saved creators yet</p>
                <p className="text-sm text-gray-400">Search for creators and click the heart to save them</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {savedCreators.map((creator) => (
                  <CreatorCard
                    key={creator.creator_id}
                    creator={creator}
                    isSaved={true}
                    onToggleSave={handleToggleSave}
                    savingId={savingId}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Search Results / All Creators */}
        {!showSaved && searchDone && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {query.trim()
                  ? `${results.length} creator${results.length !== 1 ? 's' : ''} found`
                  : `Explore Creators (${results.length})`}
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_QUERIES.slice(0, 3).map((sq) => (
                  <button
                    key={sq}
                    onClick={() => {
                      setQuery(sq);
                      handleSearch(sq);
                    }}
                    className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-700"
                  >
                    {sq}
                  </button>
                ))}
              </div>
            </div>
            {results.length === 0 ? (
              <div className="py-16 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                </svg>
                <p className="mt-4 text-gray-500">No creators match your search</p>
                <p className="text-sm text-gray-400">Try a different query or broaden your criteria</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((creator) => (
                  <CreatorCard
                    key={creator.creator_id}
                    creator={creator}
                    isSaved={savedIds.has(creator.creator_id)}
                    onToggleSave={handleToggleSave}
                    savingId={savingId}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Loading state — initial load */}
        {!showSaved && !searchDone && !searching && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-gray-600">Loading creators...</p>
          </div>
        )}

        {/* Loading state */}
        {searching && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-gray-600">Searching creators with AI...</p>
            <p className="text-sm text-gray-400">Parsing your query and finding matches</p>
          </div>
        )}
      </div>
    </div>
  );
}
