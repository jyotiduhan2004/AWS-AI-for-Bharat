'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import CreatorCard from '@/components/CreatorCard';

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

export default function BrandWishlistPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setCreators(data.wishlist || []);
    } catch (err) {
      console.error('Load wishlist error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const handleToggleSave = async (creatorId: string) => {
    setSavingId(creatorId);
    try {
      await api.removeFromWishlist(creatorId);
      setCreators((prev) => prev.filter((c) => c.creator_id !== creatorId));
    } catch (err) {
      console.error('Remove from wishlist error:', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-8 max-w-6xl mx-auto">

        {loading && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        )}

        {!loading && creators.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-20 rounded-full bg-rose-50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-rose-300">favorite</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No saved creators yet</h3>
            <p className="text-slate-500 max-w-xs mb-6">
              Search for creators and click the heart to save them to your wishlist
            </p>
            <Link href="/brand/search" className="btn-primary">
              <span className="material-symbols-outlined text-sm">manage_search</span>
              Find Creators
            </Link>
          </div>
        )}

        {!loading && creators.length > 0 && (
          <>
            <p className="mb-6 text-sm text-slate-500 font-medium">
              {creators.length} saved creator{creators.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.creator_id}
                  creator={creator}
                  isSaved={true}
                  onToggleSave={handleToggleSave}
                  savingId={savingId}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
