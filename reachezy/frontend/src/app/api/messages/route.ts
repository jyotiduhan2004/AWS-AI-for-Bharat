import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let sql = '';
    let params: any[] = [];

    if (user.role === 'brand') {
      sql = `
        SELECT c.id, 
               cr.id as person_id, cr.display_name as name, cr.username, cr.niche, cr.city, cr.followers_count as followers, 
               COALESCE(NULLIF(cr.profile_picture_url, ''), '/assets/creators/' || cr.username || '.jpg') as avatar,
               m.text as last_message, m.created_at as last_message_time
        FROM conversations c
        JOIN creators cr ON c.creator_id = cr.id
        LEFT JOIN LATERAL (
          SELECT text, created_at FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
        ) m ON true
        WHERE c.brand_id = $1
        ORDER BY c.updated_at DESC
      `;
      params = [user.user_id];
    } else {
      // creator
      if (!user.creator_id) return NextResponse.json({ error: 'Creator profile missing' }, { status: 400 });
      sql = `
        SELECT c.id, 
               u.id as person_id, u.company_name as name, u.industry as niche, '' as city, null as followers, 
               u.avatar_url as db_avatar,
               m.text as last_message, m.created_at as last_message_time
        FROM conversations c
        JOIN users u ON c.brand_id = u.id
        LEFT JOIN LATERAL (
          SELECT text, created_at FROM messages m2 WHERE m2.conversation_id = c.id ORDER BY created_at DESC LIMIT 1
        ) m ON true
        WHERE c.creator_id = $1
        ORDER BY c.updated_at DESC
      `;
      params = [user.creator_id];
    }

    const { rows } = await query(sql, params);

    const formatted = rows.map(r => {
      let finalAvatar = r.avatar || r.db_avatar || '';
      let finalWebsite = '';
      let finalBio = '';
      let finalCompany = '';
      
      // Explicitly map known demo brands since they have mixed extensions (.svg, .webp, .jpeg).
      // If it's a random seeded brand like "Acme Corp", let it remain '' to show initials, preventing 404s.
      if (user.role === 'creator') {
        const cname = (r.name || '').toLowerCase();
        if (cname === 'nykaa') finalAvatar = '/assets/brands/nykaa.svg';
        else if (cname === 'boat') finalAvatar = '/assets/brands/boat.svg';
        else if (cname === 'mamaearth') finalAvatar = '/assets/brands/mamaearth.jpeg';

        finalWebsite = `https://www.${r.name.replace(/\s+/g, '').toLowerCase()}.com`;
        finalBio = `${r.name} is a leading brand in the ${r.niche || 'retail'} industry, dedicated to providing high-quality products to our customers.`;
        finalCompany = r.name;
      }

      return {
        id: r.id,
        person: {
          id: r.person_id,
          name: r.name || r.username || 'Unknown',
          username: r.username || '',
          avatar: finalAvatar,
          niche: r.niche || '',
          location: r.city || '',
          company: finalCompany,
          website: finalWebsite,
          bio: finalBio,
          followers: r.followers ? (r.followers >= 1000 ? (r.followers/1000).toFixed(1)+'K' : r.followers) : '',
          role: user.role === 'brand' ? 'Creator' : 'Brand',
        },
        lastMessage: r.last_message || 'Started a conversation',
        lastMessageTime: r.last_message_time ? new Date(r.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
      };
    });

    return NextResponse.json(formatted);
  } catch (e) {
    console.error('Error GET /api/messages:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, target_id } = await req.json(); // target_id is creator_id (if brand sends) or brand user_id (if creator sends)

    if (!text || !target_id) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    let brandId, creatorId;
    let recipientUserId;

    if (user.role === 'brand') {
      brandId = user.user_id;
      creatorId = target_id;
      // Get the user ID of the creator for the notification
      const cUser = await query('SELECT id FROM users WHERE creator_id = $1', [creatorId]);
      recipientUserId = cUser.rows[0]?.id;
    } else {
      brandId = target_id;
      creatorId = user.creator_id;
      recipientUserId = brandId; // brand ID is the user's ID
      
      if (!creatorId) return NextResponse.json({ error: 'No creator linked' }, { status: 400 });
    }

    // Upsert conversation
    const convRes = await query(`
      INSERT INTO conversations (brand_id, creator_id, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (brand_id, creator_id) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `, [brandId, creatorId]);
    const conversationId = convRes.rows[0].id;

    // Insert message
    const msgRes = await query(`
      INSERT INTO messages (conversation_id, sender_id, text)
      VALUES ($1, $2, $3) RETURNING id, created_at
    `, [conversationId, user.user_id, text]);
    
    // Create notification
    if (recipientUserId || user.role === 'brand') {
      const isBrandSender = user.role === 'brand';
      const nData = {
        col: isBrandSender ? 'creator_id' : 'user_id',
        val: isBrandSender ? creatorId : recipientUserId,
        title: isBrandSender ? 'New Message from a Brand' : 'New Message from a Creator',
        content: text.substring(0, 100) + (text.length > 100 ? '...' : '')
      };

      await query(`
        INSERT INTO notifications (${nData.col}, type, reference_id, title, content)
        VALUES ($1, 'new_message', $2, $3, $4)
      `, [nData.val, conversationId, nData.title, nData.content]);
    }

    return NextResponse.json({ 
      success: true, 
      message: {
        id: msgRes.rows[0].id,
        conversation_id: conversationId,
        text,
        senderId: user.user_id || user.creator_id,
        timestamp: new Date(msgRes.rows[0].created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }
    });

  } catch (e) {
    console.error('Error POST /api/messages:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
