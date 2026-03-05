import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { rows } = await query(
      `SELECT id, type, title, content, reference_id, is_read, created_at 
       FROM notifications 
       WHERE (user_id = $1 OR creator_id = $2)
       ORDER BY created_at DESC 
       LIMIT 50`,
      [user.user_id || null, user.creator_id || null]
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.error('Error GET /api/notifications:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    if (id) {
      // Mark specific as read
      await query(
        `UPDATE notifications SET is_read = true WHERE id = $1 AND (user_id = $2 OR creator_id = $3)`,
        [id, user.user_id || null, user.creator_id || null]
      );
    } else {
      // Mark all as read
      await query(
        `UPDATE notifications SET is_read = true WHERE user_id = $1 OR creator_id = $2`,
        [user.user_id || null, user.creator_id || null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error PUT /api/notifications:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
