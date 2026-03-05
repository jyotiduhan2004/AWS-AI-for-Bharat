import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query(
      `SELECT COUNT(*) as count FROM notifications WHERE (user_id = $1 OR creator_id = $2) AND is_read = false`,
      [user.user_id || null, user.creator_id || null]
    );

    const count = parseInt(rows[0]?.count || '0', 10);
    return NextResponse.json({ unreadCount: count });
  } catch (e) {
    console.error('Error GET /api/notifications/unread:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
