import Link from 'next/link';
import dynamic from 'next/dynamic';

const MediaKit = dynamic(() => import('@/components/MediaKit'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center p-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});
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
    style_profile?: {
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
    rate_card?: {
      reel_rate: number;
      story_rate: number;
      post_rate: number;
      accepts_barter: boolean;
    } | null;
  };
  benchmarks: {
    niche_percentile: { reel: number; story: number; post: number };
    overall_percentile: { reel: number; story: number; post: number };
    source: string;
    sample_size?: number;
  } | null;
  videos: {
    id: string;
    thumbnail_url: string;
    title: string;
  }[];
  thumbnail_urls: string[];
}

async function getMediaKitData(username: string): Promise<MediaKitData | null> {
  // Use the local Next.js API route; falls back to localhost during build/dev
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';
  try {
    const res = await fetch(`${baseUrl}/api/creator/mediakit/${username}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function PublicMediaKitPage({ params }: PageProps) {
  const data = await getMediaKitData(params.username);

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900 antialiased flex flex-col relative w-full overflow-x-hidden">
      {/* ── Minimal Navbar ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-6 py-4">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white transition-transform group-hover:scale-105">
            <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">auto_awesome</span>
          </div>
          <span className="text-sm tracking-widest text-slate-400 font-bold uppercase group-hover:text-primary transition-colors">
            POWERED BY <strong className="text-slate-600 group-hover:text-primary">REACHEZY</strong>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-xs py-1.5 px-4 rounded-full">
            Create Your Own Kit
          </Link>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full mx-auto pb-20">
        {!data ? (
          <div className="flex flex-col items-center justify-center mt-20 px-4">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-12 max-w-md text-center shadow-xl">
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-slate-50 border border-slate-100">
                <span className="material-symbols-outlined text-5xl text-slate-300">person_off</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Media Kit Not Found</h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                This creator hasn&apos;t generated their media kit yet, or the username is incorrect.
              </p>
              <Link href="/" className="btn-primary w-full shadow-primary-sm group">
                Return Home
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform ml-2">arrow_forward</span>
              </Link>
            </div>
          </div>
        ) : (
          <MediaKit
            creator={data.creator}
            videos={data.videos || []}
            benchmarks={data.benchmarks}
            thumbnailUrls={data.thumbnail_urls || []}
            rates={data.creator?.rate_card ?? undefined}
            styleProfile={data.creator?.style_profile ?? undefined}
          />
        )}
      </main>
    </div>
  );
}
