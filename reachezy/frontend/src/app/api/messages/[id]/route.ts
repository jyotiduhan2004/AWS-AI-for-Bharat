import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conversationId = params.id;

    // Verify user is part of the conversation
    const convCheck = await query(
      `SELECT brand_id, creator_id FROM conversations WHERE id = $1`,
      [conversationId]
    );

    if (convCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conv = convCheck.rows[0];
    const isParticipant =
      (user.role === 'brand' && conv.brand_id === user.user_id) ||
      (user.role === 'creator' && conv.creator_id === user.creator_id);

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark messages as read
    await query(
      `UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
      [conversationId, user.user_id]
    );

    // Fetch messages
    const { rows } = await query(
      `SELECT id, sender_id, text, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversationId]
    );

    const formatted = rows.map((r: any) => ({
      id: r.id,
      senderId: r.sender_id || conv.creator_id,
      text: r.text,
      timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    return NextResponse.json(formatted);
  } catch (e) {
    console.error('Error GET /api/messages/[id]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
