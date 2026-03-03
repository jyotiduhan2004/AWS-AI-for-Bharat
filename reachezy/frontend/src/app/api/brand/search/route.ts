/**
 * GET  /api/brand/search — Returns all creators (pre-load on page mount).
 * POST /api/brand/search — Keyword-based creator search with AI fallback.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query as dbQuery } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

const CREATOR_SELECT = `
  SELECT c.id AS creator_id, c.username, c.display_name, c.bio,
         c.niche, c.city, c.followers_count, c.media_count,
         c.profile_picture_url, c.style_profile,
         r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter
  FROM creators c
  LEFT JOIN rate_cards r ON c.id = r.creator_id`;

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await dbQuery(
      `${CREATOR_SELECT} ORDER BY c.followers_count DESC LIMIT 50`
    );

    return NextResponse.json({
      results: formatResults(result.rows),
      parsed: null,
    });
  } catch (e) {
    console.error('Error in GET /api/brand/search:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// --- Filler words to strip from search queries ---
const FILLER_WORDS = new Set([
  // articles / prepositions / conjunctions
  'a', 'an', 'the', 'in', 'with', 'and', 'or', 'for', 'from',
  'who', 'is', 'are', 'has', 'have', 'that', 'this', 'to',
  'of', 'on', 'at', 'by', 'up', 'be', 'been', 'being',
  'it', 'its', 'will', 'would', 'could', 'should', 'shall',
  'may', 'might', 'also', 'very', 'really', 'just', 'so', 'too',
  'much', 'more',
  // creator-related generic words
  'influencer', 'creator', 'blogger', 'vlogger', 'creators', 'influencers',
  // intent words (user is describing what they want, not what to search)
  'want', 'find', 'looking', 'search', 'need', 'show', 'get',
  'can', 'me', 'my', 'i', 'we', 'they', 'you',
  'which', 'where', 'what', 'about', 'like', 'some', 'all', 'any', 'every',
  'make', 'do',
  // marketing verbs (not searchable attributes)
  'advertise', 'advertize', 'promote', 'sponsor', 'collaboration', 'collab',
  // generic nouns
  'products', 'content', 'videos', 'brand', 'brands',
  'good', 'best', 'top', 'great', 'field', 'technical',
]);

// --- Niche keyword mapping (mirrors Lambda's _basic_parse) ---
const NICHE_MAP: Record<string, string> = {
  beauty: 'Beauty/Cosmetics', cosmetic: 'Beauty/Cosmetics', cosmetics: 'Beauty/Cosmetics',
  skincare: 'Beauty/Cosmetics', 'skin care': 'Beauty/Cosmetics', makeup: 'Beauty/Cosmetics',
  fashion: 'Fashion', style: 'Fashion', clothing: 'Fashion',
  fitness: 'Fitness/Health', health: 'Fitness/Health', gym: 'Fitness/Health', workout: 'Fitness/Health',
  food: 'Food', cooking: 'Food', recipe: 'Food', recipes: 'Food',
  tech: 'Tech', technology: 'Tech', gadget: 'Tech', gadgets: 'Tech',
  travel: 'Travel', travelling: 'Travel', traveling: 'Travel',
  education: 'Education', study: 'Education', learning: 'Education',
  comedy: 'Comedy/Entertainment', funny: 'Comedy/Entertainment', entertainment: 'Comedy/Entertainment',
  lifestyle: 'Lifestyle',
  parenting: 'Parenting', mom: 'Parenting', parent: 'Parenting',
};

// --- City detection ---
const CITY_NAMES = [
  'mumbai', 'delhi', 'new delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata',
  'hyderabad', 'pune', 'ahmedabad', 'jaipur', 'noida', 'gurugram', 'gurgaon',
  'lucknow', 'chandigarh', 'indore', 'kochi', 'surat', 'bhopal', 'patna',
  'nagpur', 'vadodara', 'coimbatore', 'thiruvananthapuram', 'visakhapatnam',
];

/** Structured local parser — extracts niche and city before keyword fallback. */
function localParse(query: string): {
  niche: string | null;
  city: string | null;
  remainingKeywords: string[];
} {
  const q = query.toLowerCase();
  let niche: string | null = null;
  let city: string | null = null;

  // Detect niche
  for (const [keyword, nicheValue] of Object.entries(NICHE_MAP)) {
    if (q.includes(keyword)) {
      niche = nicheValue;
      break;
    }
  }

  // Detect city
  for (const c of CITY_NAMES) {
    if (q.includes(c)) {
      city = c.charAt(0).toUpperCase() + c.slice(1);
      // Normalize Delhi variants
      if (city === 'New delhi') city = 'New Delhi';
      break;
    }
  }

  // Extract remaining keywords after removing filler words, niche words, and city
  const nicheWords = new Set(Object.keys(NICHE_MAP));
  const cityWords = new Set(CITY_NAMES.flatMap((c) => c.split(' ')));

  const remainingKeywords = q
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 1 &&
        !FILLER_WORDS.has(w) &&
        !nicheWords.has(w) &&
        !cityWords.has(w)
    );

  return { niche, city, remainingKeywords };
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const searchQuery = ((body.query as string) || '').trim();

    if (!searchQuery) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    // Try AI-powered Lambda search first (if API URL is configured)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const lambdaRes = await fetch(`${apiUrl}/brand/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({ query: searchQuery }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (lambdaRes.ok) {
          const lambdaData = await lambdaRes.json();
          return NextResponse.json({
            results: lambdaData.results || [],
            parsed: lambdaData.parsed || null,
            source: 'ai',
          });
        }
        console.warn('Lambda search failed, falling back to local parser:', lambdaRes.status);
      } catch (err) {
        console.warn('Lambda search unreachable/timeout, falling back to local parser:', err);
      }
    }

    // Local text-based fallback (embedding search happens in Lambda above)
    const parsed = localParse(searchQuery);

    const orConditions: string[] = [];
    const params: string[] = [];
    let paramIdx = 1;

    // Niche: match in niche, style_profile, or bio
    if (parsed.niche) {
      orConditions.push(`(c.niche ILIKE $${paramIdx} OR COALESCE(c.style_profile::text, '') ILIKE $${paramIdx} OR COALESCE(c.bio, '') ILIKE $${paramIdx})`);
      params.push(`%${parsed.niche}%`);
      paramIdx++;
    }

    // City
    if (parsed.city) {
      orConditions.push(`c.city ILIKE $${paramIdx}`);
      params.push(`%${parsed.city}%`);
      paramIdx++;
    }

    // Remaining keywords: broad text search across all fields
    for (const keyword of parsed.remainingKeywords) {
      orConditions.push(`(c.niche ILIKE $${paramIdx} OR c.city ILIKE $${paramIdx}
          OR c.display_name ILIKE $${paramIdx} OR c.bio ILIKE $${paramIdx}
          OR c.username ILIKE $${paramIdx}
          OR COALESCE(c.style_profile::text, '') ILIKE $${paramIdx})`);
      params.push(`%${keyword}%`);
      paramIdx++;
    }

    if (orConditions.length === 0) {
      const result = await dbQuery(
        `${CREATOR_SELECT} ORDER BY c.followers_count DESC LIMIT 50`
      );
      return NextResponse.json({
        results: formatResults(result.rows),
        parsed: { niche: parsed.niche, city: parsed.city, keywords: [] },
        source: 'local',
      });
    }

    const result = await dbQuery(
      `${CREATOR_SELECT}
       WHERE ${orConditions.join(' OR ')}
       ORDER BY c.followers_count DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({
      results: formatResults(result.rows),
      parsed: {
        niche: parsed.niche,
        city: parsed.city,
        keywords: parsed.remainingKeywords,
      },
      source: 'local',
    });
  } catch (e) {
    console.error('Error in POST /api/brand/search:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatResults(rows: Record<string, unknown>[]) {
  return rows.map((row) => ({
    creator_id: row.creator_id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    niche: row.niche,
    city: row.city,
    followers_count: row.followers_count,
    media_count: row.media_count,
    profile_picture_url: row.profile_picture_url,
    style_profile: row.style_profile || null,
    rates: row.reel_rate != null
      ? {
          reel_rate: row.reel_rate,
          story_rate: row.story_rate,
          post_rate: row.post_rate,
          accepts_barter: row.accepts_barter,
        }
      : null,
  }));
}
