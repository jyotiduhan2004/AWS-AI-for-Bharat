/**
 * GET  /api/brand/search — Returns all creators (pre-load on page mount).
 * POST /api/brand/search — Keyword-based creator search.
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

    // Parse query into keywords (strip common filler words)
    const fillerWords = new Set([
      'a', 'an', 'the', 'in', 'with', 'and', 'or', 'for', 'from',
      'who', 'is', 'are', 'has', 'have', 'that', 'this', 'to',
      'influencer', 'creator', 'blogger', 'vlogger',
    ]);

    const keywords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 1 && !fillerWords.has(w));

    if (keywords.length === 0) {
      const result = await dbQuery(
        `${CREATOR_SELECT} ORDER BY c.followers_count DESC LIMIT 50`
      );
      return NextResponse.json({
        results: formatResults(result.rows),
        parsed: { keywords: [] },
      });
    }

    // Build ILIKE conditions — each keyword must match at least one field
    const conditions: string[] = [];
    const params: string[] = [];
    let paramIdx = 1;

    for (const keyword of keywords) {
      const pattern = `%${keyword}%`;
      conditions.push(
        `(c.niche ILIKE $${paramIdx} OR c.city ILIKE $${paramIdx}
          OR c.display_name ILIKE $${paramIdx} OR c.bio ILIKE $${paramIdx}
          OR c.username ILIKE $${paramIdx}
          OR COALESCE(c.style_profile::text, '') ILIKE $${paramIdx})`
      );
      params.push(pattern);
      paramIdx++;
    }

    const result = await dbQuery(
      `${CREATOR_SELECT}
       WHERE ${conditions.join(' AND ')}
       ORDER BY c.followers_count DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({
      results: formatResults(result.rows),
      parsed: { keywords },
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
