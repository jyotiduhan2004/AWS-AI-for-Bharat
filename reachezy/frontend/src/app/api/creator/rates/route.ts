/**
 * GET  /api/creator/rates?creator_id=X — Returns rates for a creator.
 * POST /api/creator/rates — Upserts rates for the logged-in creator.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorId = req.nextUrl.searchParams.get('creator_id') || user.creator_id;
    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    const result = await query(
      `SELECT creator_id, reel_rate, story_rate, post_rate, accepts_barter
       FROM rate_cards WHERE creator_id = $1`,
      [creatorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No rates found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (e) {
    console.error('Error in GET /api/creator/rates:', e);
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
    const { creator_id, reel_rate, story_rate, post_rate, accepts_barter } = body;

    const targetCreatorId = creator_id || user.creator_id;
    if (!targetCreatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    await query(
      `INSERT INTO rate_cards (creator_id, reel_rate, story_rate, post_rate, accepts_barter)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (creator_id) DO UPDATE SET
         reel_rate = EXCLUDED.reel_rate,
         story_rate = EXCLUDED.story_rate,
         post_rate = EXCLUDED.post_rate,
         accepts_barter = EXCLUDED.accepts_barter`,
      [targetCreatorId, reel_rate || 0, story_rate || 0, post_rate || 0, accepts_barter ?? false]
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in POST /api/creator/rates:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
