/**
 * GET    /api/brand/wishlist — Returns saved creators with full profiles.
 * POST   /api/brand/wishlist — Add creator to wishlist.
 * DELETE /api/brand/wishlist — Remove creator from wishlist.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized — brand role required' }, { status: 401 });
    }

    const result = await query(
      `SELECT c.id AS creator_id, c.username, c.display_name, c.bio,
              c.niche, c.city, c.followers_count, c.media_count,
              c.profile_picture_url, c.style_profile,
              r.reel_rate, r.story_rate, r.post_rate, r.accepts_barter
       FROM brand_wishlists w
       JOIN creators c ON w.creator_id = c.id
       LEFT JOIN rate_cards r ON c.id = r.creator_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [user.user_id]
    );

    const wishlist = result.rows.map((row) => ({
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

    return NextResponse.json({ wishlist });
  } catch (e) {
    console.error('Error in GET /api/brand/wishlist:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized — brand role required' }, { status: 401 });
    }

    const body = await req.json();
    const creatorId = body.creator_id;

    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    await query(
      `INSERT INTO brand_wishlists (user_id, creator_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, creator_id) DO NOTHING`,
      [user.user_id, creatorId]
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in POST /api/brand/wishlist:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user || user.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized — brand role required' }, { status: 401 });
    }

    const body = await req.json();
    const creatorId = body.creator_id;

    if (!creatorId) {
      return NextResponse.json({ error: 'creator_id is required' }, { status: 400 });
    }

    await query(
      `DELETE FROM brand_wishlists WHERE user_id = $1 AND creator_id = $2`,
      [user.user_id, creatorId]
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in DELETE /api/brand/wishlist:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
