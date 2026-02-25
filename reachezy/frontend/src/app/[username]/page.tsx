import Link from 'next/link';
import MediaKit from '@/components/MediaKit';

export const revalidate = 3600;

interface PageProps {
  params: { username: string };
}

interface MediaKitData {
  creator: {
    username: string;
    full_name: string;
    biography: string;
    profile_picture_url: string;
    followers_count: number;
    media_count: number;
    niche: string;
    city: string;
  };
  rates: {
    reel_rate: number;
    story_rate: number;
    post_rate: number;
    accepts_barter: boolean;
  };
  benchmarks: {
    niche_percentile: { reel: number; story: number; post: number };
    overall_percentile: { reel: number; story: number; post: number };
    source: string;
    sample_size?: number;
  } | null;
  style_profile: {
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
  } | null;
  videos: {
    id: string;
    thumbnail_url: string;
    title: string;
  }[];
  thumbnail_urls: string[];
}

async function getMediaKitData(username: string): Promise<MediaKitData | null> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const res = await fetch(`${API_URL}/creator/mediakit/${username}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PublicMediaKitPage({ params }: PageProps) {
  const data = await getMediaKitData(params.username);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Media Kit Not Found
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This creator hasn&apos;t set up their media kit yet, or the username
            is incorrect.
          </p>
          <Link href="/" className="btn-primary mt-6 inline-block">
            Go to ReachEzy
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MediaKit
        creator={data.creator}
        videos={data.videos || []}
        benchmarks={data.benchmarks}
        thumbnailUrls={data.thumbnail_urls || []}
        rates={data.rates}
        styleProfile={data.style_profile}
      />
    </div>
  );
}
