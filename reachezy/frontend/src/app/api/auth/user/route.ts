/**
 * Next.js API route: POST /api/auth/user
 * Handles signup + login (mirrors lambdas/user_auth/handler.py)
 * Used for local dev before CDK deployment of the Lambda.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { query } from '@/lib/server-db';

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function generateSessionToken(
  userId: string,
  creatorId: string | null,
  role: string,
  username: string
): string {
  const cognitoSub = `email_${createHash('sha256').update(userId).digest('hex').slice(0, 16)}`;
  const payload = {
    user_id: userId,
    creator_id: creatorId,
    role,
    cognito_sub: cognitoSub,
    username: username || '',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    jti: randomUUID(),
  };
  return JSON.stringify(payload);
}

async function handleSignup(body: Record<string, unknown>) {
  const role = body.role as string;
  const email = ((body.email as string) || '').trim().toLowerCase();
  const password = (body.password as string) || '';

  if (!['creator', 'brand'].includes(role)) {
    return NextResponse.json({ error: "role must be 'creator' or 'brand'" }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  // Check if email exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
  }

  let creatorId: string | null = null;
  let username = '';

  if (role === 'creator') {
    const fullName = ((body.full_name as string) || '').trim();
    const instagramHandle = ((body.instagram_handle as string) || '').trim().replace(/^@/, '');
    const niche = (body.niche as string) || '';
    const city = (body.city as string) || '';
    const followersCount = parseInt(body.followers_count as string) || 0;
    const bio = (body.bio as string) || '';

    if (!instagramHandle) {
      return NextResponse.json({ error: 'Instagram handle is required' }, { status: 400 });
    }

    const cognitoSub = `email_${createHash('sha256').update(email).digest('hex').slice(0, 16)}`;

    const creatorResult = await query(
      `INSERT INTO creators (cognito_sub, username, display_name, bio, followers_count, niche, city)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (cognito_sub) DO UPDATE SET
         username = EXCLUDED.username, display_name = EXCLUDED.display_name,
         bio = EXCLUDED.bio, followers_count = EXCLUDED.followers_count,
         niche = EXCLUDED.niche, city = EXCLUDED.city, updated_at = NOW()
       RETURNING id`,
      [cognitoSub, instagramHandle, fullName, bio, followersCount, niche, city]
    );
    creatorId = creatorResult.rows[0].id;
    username = instagramHandle;
  }

  const companyName = role === 'brand' ? ((body.company_name as string) || '').trim() : null;
  const industry = role === 'brand' ? ((body.industry as string) || '').trim() : null;
  const city = ((body.city as string) || '').trim();
  const contactName = role === 'brand' ? ((body.contact_name as string) || '').trim() : null;

  const userResult = await query(
    `INSERT INTO users (email, password_hash, role, creator_id, company_name, industry, city, contact_name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [email, passwordHash, role, creatorId, companyName, industry, city, contactName]
  );
  const userId = userResult.rows[0].id;

  const sessionToken = generateSessionToken(userId, creatorId, role, username);

  const result: Record<string, unknown> = {
    user_id: userId,
    role,
    email,
    session_token: sessionToken,
  };
  if (creatorId) {
    result.creator_id = creatorId;
    result.username = username;
  }

  return NextResponse.json(result);
}

async function handleLogin(body: Record<string, unknown>) {
  const email = ((body.email as string) || '').trim().toLowerCase();
  const password = (body.password as string) || '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  const result = await query(
    `SELECT u.id, u.role, u.creator_id, u.company_name, u.email,
            c.username, c.display_name
     FROM users u
     LEFT JOIN creators c ON u.creator_id = c.id
     WHERE u.email = $1 AND u.password_hash = $2`,
    [email, passwordHash]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const row = result.rows[0];
  const sessionToken = generateSessionToken(row.id, row.creator_id, row.role, row.username);

  const resp: Record<string, unknown> = {
    user_id: row.id,
    role: row.role,
    email: row.email,
    session_token: sessionToken,
  };
  if (row.creator_id) {
    resp.creator_id = row.creator_id;
    resp.username = row.username;
  }
  if (row.company_name) {
    resp.company_name = row.company_name;
  }

  return NextResponse.json(resp);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    if (action === 'signup') {
      return await handleSignup(body);
    } else if (action === 'login') {
      return await handleLogin(body);
    } else {
      return NextResponse.json({ error: "action must be 'signup' or 'login'" }, { status: 400 });
    }
  } catch (e) {
    console.error('Error in /api/auth/user:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
