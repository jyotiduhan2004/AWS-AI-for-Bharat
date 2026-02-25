'use client';

import { formatINR, getFollowerBucket } from '@/lib/constants';
import BenchmarkDisplay from './BenchmarkDisplay';
import StyleDNA from './StyleDNA';
import TopicCloud from './TopicCloud';

interface Creator {
  username: string;
  full_name: string;
  biography: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
  niche: string;
  city: string;
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

interface Benchmarks {
  niche_percentile: { reel: number; story: number; post: number };
  overall_percentile: { reel: number; story: number; post: number };
  source: string;
  sample_size?: number;
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

interface Video {
  id: string;
  thumbnail_url: string;
  title: string;
}

interface MediaKitProps {
  creator: Creator;
  videos: Video[];
  benchmarks: Benchmarks | null;
  thumbnailUrls: string[];
  rates?: Rates;
  styleProfile?: StyleProfile | null;
}

export default function MediaKit({
  creator,
  videos,
  benchmarks,
  thumbnailUrls,
  rates,
  styleProfile,
}: MediaKitProps) {
  const followerBucket = getFollowerBucket(creator.followers_count);

  const handleDownloadPDF = async () => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${API_URL}/creator/mediakit/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creator_id: creator.username }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Profile Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary-400 via-purple-500 to-pink-500 p-1">
          {creator.profile_picture_url ? (
            <img
              src={creator.profile_picture_url}
              alt={creator.username}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-3xl font-bold text-primary-600">
              {creator.full_name?.[0] || creator.username[0]}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {creator.full_name || `@${creator.username}`}
        </h1>
        <p className="mt-1 text-gray-500">@{creator.username}</p>
        {creator.biography && (
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            {creator.biography}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
            {creator.niche}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
            </svg>
            {creator.city}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">
            {creator.followers_count >= 1000
              ? `${(creator.followers_count / 1000).toFixed(1)}K`
              : creator.followers_count}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Followers</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">&mdash;</p>
          <p className="mt-0.5 text-xs text-gray-500">Engagement</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-gray-900">
            {creator.media_count}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Posts</p>
        </div>
      </div>

      {/* Content Style */}
      {styleProfile && (
        <div className="card mb-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Content Style
          </h2>
          <StyleDNA styleProfile={styleProfile} />

          {styleProfile.topics && styleProfile.topics.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Topics</h3>
              <TopicCloud topics={styleProfile.topics} />
            </div>
          )}
        </div>
      )}

      {/* Top Content */}
      <div className="card mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Top Content
        </h2>
        {thumbnailUrls.length > 0 || videos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {(thumbnailUrls.length > 0
              ? thumbnailUrls.slice(0, 6)
              : videos.slice(0, 6)
            ).map((item, idx) => (
              <div
                key={idx}
                className="aspect-[9/16] overflow-hidden rounded-lg bg-gray-100"
              >
                {typeof item === 'string' ? (
                  <img
                    src={item}
                    alt={`Content ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <svg
                      className="h-8 w-8 text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-[9/16] items-center justify-center rounded-lg bg-gray-100"
              >
                <svg
                  className="h-8 w-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                  />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate Card */}
      {rates && (
        <div className="card mb-8">
          <h2 className="mb-1 text-lg font-semibold text-gray-900">
            Rate Card ({creator.niche})
          </h2>
          <p className="mb-4 text-xs text-gray-400">
            Follower bucket: {followerBucket}
          </p>

          <div className="mb-6 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-gradient-to-br from-primary-50 to-purple-50 p-4 text-center">
              <p className="text-xs font-medium text-gray-500">Reel</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatINR(rates.reel_rate)}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-primary-50 to-purple-50 p-4 text-center">
              <p className="text-xs font-medium text-gray-500">Story</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatINR(rates.story_rate)}
              </p>
            </div>
            <div className="rounded-lg bg-gradient-to-br from-primary-50 to-purple-50 p-4 text-center">
              <p className="text-xs font-medium text-gray-500">Post</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {formatINR(rates.post_rate)}
              </p>
            </div>
          </div>

          {rates.accepts_barter && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2">
              <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm text-green-700">
                Open to barter/collaboration
              </span>
            </div>
          )}

          {benchmarks && (
            <BenchmarkDisplay
              benchmarks={benchmarks}
              niche={creator.niche}
              followerBucket={followerBucket}
              rates={{
                reel: rates.reel_rate,
                story: rates.story_rate,
                post: rates.post_rate,
              }}
            />
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center">
        <button onClick={handleDownloadPDF} className="btn-primary mb-4">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download PDF
        </button>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-600">
            <span className="text-[10px] font-bold text-white">R</span>
          </div>
          Powered by ReachEzy
        </div>
      </div>
    </div>
  );
}
