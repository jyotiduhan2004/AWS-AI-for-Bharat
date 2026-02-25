'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { formatINR, getFollowerBucket } from '@/lib/constants';
import BenchmarkDisplay from '@/components/BenchmarkDisplay';
import StyleDNA from '@/components/StyleDNA';

interface Profile {
  creator_id: string;
  username: string;
  full_name: string;
  followers_count: number;
  media_count: number;
  biography: string;
  profile_picture_url: string;
  niche: string;
  city: string;
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
  benchmarks?: {
    niche_percentile: { reel: number; story: number; post: number };
    overall_percentile: { reel: number; story: number; post: number };
    source: string;
    sample_size?: number;
  };
}

interface StyleProfile {
  dominant_energy: string;
  energy_score: number;
  dominant_aesthetic: string;
  primary_content_type: string;
  style_summary: string;
  consistency_score: number;
  topics: string[];
  face_visible_pct: number;
  text_overlay_pct: number;
  settings: { name: string; pct: number }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rates, setRates] = useState<Rates | null>(null);
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const profileData = await api.getProfile();
      setProfile(profileData);

      try {
        const ratesData = await api.getRates(profileData.creator_id);
        setRates(ratesData);
      } catch {
        /* rates not set yet */
      }

      try {
        const mediaKit = await api.getMediaKit(profileData.username);
        if (mediaKit?.style_profile) {
          setStyleProfile(mediaKit.style_profile);
          setAnalysisReady(true);
        }
      } catch {
        /* analysis not ready yet */
      }
    } catch {
      router.replace('/');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!analysisReady && !loading) {
      const interval = setInterval(async () => {
        if (profile) {
          try {
            const mediaKit = await api.getMediaKit(profile.username);
            if (mediaKit?.style_profile) {
              setStyleProfile(mediaKit.style_profile);
              setAnalysisReady(true);
              clearInterval(interval);
            }
          } catch {
            /* still processing */
          }
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [analysisReady, loading, profile]);

  const handleDownloadPDF = async () => {
    if (!profile) return;
    setPdfLoading(true);
    try {
      const result = await api.generatePDF({
        creator_id: profile.creator_id,
      });
      if (result.url) {
        window.open(result.url, '_blank');
      }
    } catch {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!profile) return null;

  const followerBucket = getFollowerBucket(profile.followers_count);

  return (
    <div className="min-h-screen">
      {/* Top Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ReachEzy</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Profile Header */}
        <div className="card mb-8">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-purple-500 text-2xl font-bold text-white">
              {profile.full_name?.[0] || profile.username[0]}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  @{profile.username}
                </h1>
                <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-0.5 text-xs font-medium text-primary-700">
                  {profile.niche}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  {profile.followers_count.toLocaleString('en-IN')} followers
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
                  </svg>
                  {profile.city}
                </span>
                <span className="text-xs text-gray-400">
                  Bucket: {followerBucket}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Pending Banner */}
        {!analysisReady && (
          <div className="mb-8 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-300 border-t-amber-600" />
            <div>
              <p className="font-medium text-amber-800">
                Analyzing your content...
              </p>
              <p className="text-sm text-amber-600">
                Your AI style analysis is still processing. This page will update
                automatically.
              </p>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Media Kit Card */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Media Kit</h2>
              <Link
                href={`/${profile.username}`}
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View Full Kit &rarr;
              </Link>
            </div>
            <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-purple-500 text-sm font-bold text-white">
                  {profile.full_name?.[0] || profile.username[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    @{profile.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile.niche} | {profile.city}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-white p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {profile.followers_count >= 1000
                      ? `${(profile.followers_count / 1000).toFixed(1)}K`
                      : profile.followers_count}
                  </p>
                  <p className="text-xs text-gray-500">Followers</p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="text-lg font-bold text-gray-900">&mdash;</p>
                  <p className="text-xs text-gray-500">Eng. Rate</p>
                </div>
                <div className="rounded-md bg-white p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {profile.media_count}
                  </p>
                  <p className="text-xs text-gray-500">Posts</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href={`/${profile.username}`}
                className="btn-secondary flex-1 text-center text-sm"
              >
                Share Kit
              </Link>
              <button
                onClick={handleDownloadPDF}
                disabled={pdfLoading}
                className="btn-primary flex-1 text-sm"
              >
                {pdfLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Generating...
                  </span>
                ) : (
                  'Download PDF'
                )}
              </button>
            </div>
          </div>

          {/* Rate Benchmarks Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Rate Benchmarks
            </h2>
            {rates ? (
              <BenchmarkDisplay
                benchmarks={rates.benchmarks || null}
                niche={profile.niche}
                followerBucket={followerBucket}
                rates={{
                  reel: rates.reel_rate,
                  story: rates.story_rate,
                  post: rates.post_rate,
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <p className="text-sm text-gray-500">
                  No rate data yet. Set your rates during onboarding.
                </p>
              </div>
            )}
          </div>

          {/* Content Style Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Content Style
            </h2>
            {analysisReady && styleProfile ? (
              <StyleDNA styleProfile={styleProfile} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {!analysisReady ? (
                  <>
                    <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600" />
                    <p className="text-sm text-gray-500">
                      Style analysis in progress...
                    </p>
                  </>
                ) : (
                  <>
                    <svg className="mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    <p className="text-sm text-gray-500">
                      Upload content to see your style analysis.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Analytics Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Analytics
            </h2>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-50">
                <svg className="h-7 w-7 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                </svg>
              </div>
              <p className="text-sm text-gray-600">
                Dive deep into your content DNA, topic cloud, and production
                profile.
              </p>
              <Link
                href="/analytics"
                className="btn-primary mt-4 text-sm"
              >
                View Full Analytics
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link
            href="/upload"
            className="text-primary-600 hover:text-primary-700"
          >
            Upload More Videos
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href={`/${profile.username}`}
            className="text-primary-600 hover:text-primary-700"
          >
            Preview Public Kit
          </Link>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/${profile.username}`
              );
              alert('Link copied!');
            }}
            className="text-primary-600 hover:text-primary-700"
          >
            Copy Share Link
          </button>
        </div>
      </div>
    </div>
  );
}
