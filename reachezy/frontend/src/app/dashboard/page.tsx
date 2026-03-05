'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { getFollowerBucket } from '@/lib/constants';
import { useDashboard, StyleProfile } from '@/contexts/DashboardContext';

const StyleDNA = dynamic(() => import('@/components/StyleDNA'), { ssr: false });

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

function Avatar({ name, src, size = 'md' }: { name: string; src?: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = (name || 'U')[0].toUpperCase();
  const sizeClass = size === 'lg' ? 'size-24' : size === 'sm' ? 'size-8' : 'size-10';
  const shape = size === 'lg' ? 'rounded-2xl' : 'rounded-xl';
  return src ? (
    <img src={src} alt={name} className={`${sizeClass} ${shape} object-cover flex-shrink-0 shadow-primary-sm`} />
  ) : (
    <div className={`${sizeClass} ${shape} bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white font-bold shadow-primary-sm flex-shrink-0`}>
      {initials}
    </div>
  );
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export default function DashboardPage() {
  const router = useRouter();
  const { profile, setPageTitle } = useDashboard();
  const [rates, setRates] = useState<Rates | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [uploadsCount, setUploadsCount] = useState<number | null>(null);
  const [analysisReady, setAnalysisReady] = useState(false);

  useEffect(() => {
    setPageTitle('Dashboard Overview');
  }, [setPageTitle]);

  const loadPageData = useCallback(async () => {
    if (!profile) return;
    try {
      const uploadsData = await api.getUploadsCount().catch(() => ({ count: 0 }));
      setUploadsCount(uploadsData.count ?? 0);

      if (profile.style_profile) {
        setStyleProfile(profile.style_profile);
        setAnalysisReady(true);
      }

      try {
        const ratesData = await api.getRates(profile.creator_id);
        setRates(ratesData);
      } catch { /* rates not set yet */ }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [profile]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  if (!profile) return null;

  const followerBucket = getFollowerBucket(profile.followers_count);
  const isDemo = profile.cognito_sub?.startsWith('demo_') ?? false;

  return (
    <div className="overflow-y-auto h-full">
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Profile Summary Card */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Avatar name={profile.display_name || profile.username} src={profile.profile_picture_url} size="lg" />
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{profile.display_name || profile.username}</h2>
              <p className="text-slate-500">{profile.niche} Creator</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {isDemo && <span className="badge-primary uppercase tracking-wider">Verified</span>}
                {isDemo && <span className="badge-slate uppercase tracking-wider">{followerBucket}</span>}
                {!isDemo && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                    <span className="material-symbols-outlined text-xs">link</span>
                    Connect socials to verify
                  </span>
                )}
                {profile.city && (
                  <span className="badge badge-slate">
                    <span className="material-symbols-outlined text-xs mr-1">location_on</span>
                    {profile.city}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            {[
              { label: 'Followers', value: formatFollowers(profile.followers_count) },
              { label: 'Posts', value: profile.media_count?.toString() || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="px-6 py-4 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center min-w-[90px]">
                <p className="text-2xl font-bold text-slate-900">{value}</p>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profile Completion Banner */}
      {uploadsCount === 0 && !analysisReady && (
        <section className="relative overflow-hidden rounded-2xl bg-primary p-8 text-white">
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none">
            <svg className="h-full w-full" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <path d="M47.5,-57.2C61.4,-49.4,72.4,-34.5,76.5,-18.1C80.6,-1.7,77.7,16.2,69.5,31.2C61.3,46.2,47.8,58.3,32.4,65.3C17,72.3,-0.3,74.2,-17.6,70.1C-34.9,66,-52.1,56,-62.7,41.2C-73.3,26.4,-77.3,6.8,-73.4,-11.1C-69.5,-29,-57.7,-45.3,-42.6,-52.8C-27.5,-60.4,-9.1,-59.2,5.2,-66.3C19.5,-73.4,47.5,-57.2,47.5,-57.2Z" fill="#FFFFFF" transform="translate(100 100)" />
            </svg>
          </div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Complete Your Profile</h3>
              <p className="text-white/80 max-w-md">Unlock deeper insights and brand opportunities by showcasing your content. You haven&apos;t uploaded any videos yet!</p>
            </div>
            <Link href="/upload" className="flex items-center gap-2 bg-white text-primary px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg shadow-black/10 whitespace-nowrap">
              <span className="material-symbols-outlined">upload</span>
              Upload your videos
            </Link>
          </div>
        </section>
      )}

      {uploadsCount !== null && uploadsCount > 0 && !analysisReady && (
        <section className="relative overflow-hidden rounded-2xl bg-amber-500 p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-white/30 border-t-white flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg">Analyzing your content...</h3>
              <p className="text-white/80 text-sm">Your AI style analysis is processing. This usually takes 2-4 minutes.</p>
            </div>
          </div>
        </section>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rate Benchmarks Card */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-bold text-lg text-slate-900">Rate Benchmarks</h3>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">₹ INR</span>
          </div>
          {rates ? (
            <div className="p-6 space-y-6">
              {[
                { label: 'Instagram Reel', value: rates.reel_rate, icon: 'movie' },
                { label: 'Instagram Story', value: rates.story_rate, icon: 'history' },
                { label: 'Feed Post', value: rates.post_rate, icon: 'image' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex justify-between items-center p-4 rounded-lg border border-slate-100 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-slate-400">{icon}</span>
                    <span className="font-semibold text-sm text-slate-900">{label}</span>
                  </div>
                  <span className="text-xl font-bold text-primary">₹{value.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <Link href="/dashboard/settings?tab=rates" className="flex items-center justify-center gap-1 text-sm text-primary font-semibold hover:underline mt-2">
                Edit Rates
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center border-dashed">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <span className="material-symbols-outlined text-4xl">payments</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Set Your Rates</h3>
              <p className="text-slate-500 max-w-xs mb-6">You haven&apos;t set your rates yet. Let brands know what you charge.</p>
              <Link href="/dashboard/settings?tab=rates" className="btn-primary text-sm">
                Set Your Rates
              </Link>
            </div>
          )}
        </section>

        {/* Style DNA card */}
        <section className={`bg-white rounded-2xl border ${analysisReady && styleProfile ? 'border-slate-200' : 'border-dashed border-slate-200'} overflow-hidden flex flex-col`}>
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <span className="material-symbols-outlined">psychology</span>
            </div>
            <h3 className="font-bold text-lg text-slate-900">Style DNA <span className="text-xs font-normal text-slate-400 italic">(AI Analysis)</span></h3>
          </div>
          {analysisReady && styleProfile ? (
            <div className="p-6">
              <StyleDNA styleProfile={styleProfile} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center flex-1">
              <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                <span className="material-symbols-outlined text-4xl">genetics</span>
              </div>
              <h3 className="font-bold text-lg mb-2 text-slate-900">Style DNA</h3>
              {uploadsCount === 0 ? (
                <>
                  <p className="text-slate-500 max-w-xs mb-6">Upload videos to analyze your creative aesthetic and visual identity.</p>
                  <Link href="/upload" className="px-4 py-2 text-primary font-semibold hover:bg-primary/5 rounded-lg transition-colors border border-primary/20">
                    Upload Videos →
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-slate-500 max-w-xs mb-4">Your style analysis is being generated…</p>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Growth Trends */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">Growth Trends</h3>
          {isDemo && <Link href="/analytics" className="text-primary text-sm font-semibold hover:underline">View detailed analytics</Link>}
        </div>
        {isDemo ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'New Followers', value: '2,410', trend: '+12.5%', up: true },
              { label: 'Profile Visits', value: '14.2K', trend: '+5.2%', up: true },
              { label: 'Post Reach', value: '89.4K', trend: '-1.2%', up: false },
            ].map(({ label, value, trend, up }) => (
              <div key={label} className="p-6 bg-white rounded-xl border border-slate-200">
                <div className={`flex items-center gap-2 ${up ? 'text-emerald-500' : 'text-rose-500'} mb-1`}>
                  <span className="material-symbols-outlined text-sm">{up ? 'trending_up' : 'trending_down'}</span>
                  <span className="text-xs font-bold">{trend}</span>
                </div>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-semibold mb-1">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Analytics &amp; Growth</p>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Connect your socials to unlock insights</h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Link your Instagram and YouTube Shorts accounts to see real follower growth, profile visits, and post reach — all in one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 flex-shrink-0">
                <button disabled className="flex items-center gap-3 px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed text-sm font-semibold">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-pink-400">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Instagram — Coming Soon
                </button>
                <button disabled className="flex items-center gap-3 px-5 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed text-sm font-semibold">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-red-400">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube Shorts — Coming Soon
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Quick Links */}
      <div className="flex items-center gap-6 text-sm pb-4">
        <Link href={`/dashboard/media-kit`} className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">open_in_new</span>
          Preview Media Kit
        </Link>
        <button
          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/${profile.username}`); }}
          className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-base">content_copy</span>
          Copy Share Link
        </button>
        <Link href="/upload" className="flex items-center gap-1 text-slate-500 hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-base">video_library</span>
          Upload More Videos
        </Link>
      </div>
    </div>
    </div>
  );
}
