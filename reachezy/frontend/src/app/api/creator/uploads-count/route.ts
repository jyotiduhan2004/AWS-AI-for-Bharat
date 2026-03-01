/**
 * GET /api/creator/uploads-count — Returns count of video uploads for the logged-in creator.
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

    if (!user.creator_id) {
      return NextResponse.json({ count: 0 });
    }

    const result = await query(
      'SELECT COUNT(*)::int AS count FROM video_uploads WHERE creator_id = $1',
      [user.creator_id]
    );

    return NextResponse.json({ count: result.rows[0]?.count ?? 0 });
  } catch (e) {
    console.error('Error in GET /api/creator/uploads-count:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
