/**
 * GET  /api/auth/demo-brands — Returns the 3 demo brand accounts for the selector modal.
 * POST /api/auth/demo-brands — Logs in as a demo brand by company_name.
 *
 * Mirrors demo-creators/route.ts but for the brand role.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { query } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

const DEMO_BRANDS = [
  {
    company_name: 'Nykaa',
    industry: 'Beauty/Cosmetics',
    contact_name: 'Aditi Kapoor',
    email: 'demo-nykaa@reachezy.com',
    emoji: '💄',
    avatar_url: '/assets/brands/nykaa.svg?v=4'
  },
  {
    company_name: 'boAt',
    industry: 'Electronics',
    contact_name: 'Vikram Mehta',
    email: 'demo-boat@reachezy.com',
    emoji: '🎧',
    avatar_url: '/assets/brands/boat.svg?v=4'
  },
  {
    company_name: 'Mamaearth',
    industry: 'Personal Care',
    contact_name: 'Riya Singh',
    email: 'demo-mamaearth@reachezy.com',
    emoji: '🌿',
    avatar_url: '/assets/brands/mamaearth.jpeg?v=4'
  },
];

function generateSessionToken(
  userId: string,
  role: string,
  companyName: string,
  avatarUrl?: string
): string {
  const cognitoSub = `email_${createHash('sha256').update(userId).digest('hex').slice(0, 16)}`;
  return JSON.stringify({
    user_id: userId,
    creator_id: null,
    role,
    cognito_sub: cognitoSub,
    username: companyName,
    avatar_url: avatarUrl,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    jti: randomUUID(),
  });
}

export async function GET() {
  try {
    const emails = DEMO_BRANDS.map((b) => b.email);
    const result = await query(
      `SELECT email, company_name, industry, contact_name
       FROM users
       WHERE email = ANY($1) AND role = 'brand'
       ORDER BY ARRAY_POSITION($1, email)`,
      [emails]
    );

    const brands = result.rows.map((row) => {
      const meta = DEMO_BRANDS.find((b) => b.email === row.email);
      return {
        company_name: row.company_name,
        industry: row.industry,
        contact_name: row.contact_name,
        email: row.email,
        emoji: meta?.emoji || '🏢',
        avatar_url: meta?.avatar_url,
      };
    });

    // If DB returned all 3, use them; otherwise fall back to hardcoded list
    if (brands.length === DEMO_BRANDS.length) {
      return NextResponse.json({ brands });
    }

    return NextResponse.json({
      brands: DEMO_BRANDS,
    });
  } catch (e) {
    console.error('Error fetching demo brands:', e);
    return NextResponse.json({ brands: DEMO_BRANDS });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const companyName = (body.company_name as string || '').trim();

    if (!companyName) {
      return NextResponse.json({ error: 'company_name is required' }, { status: 400 });
    }

    const meta = DEMO_BRANDS.find(
      (b) => b.company_name.toLowerCase() === companyName.toLowerCase()
    );
    if (!meta) {
      return NextResponse.json({ error: 'Unknown demo brand' }, { status: 404 });
    }

    // Try to find existing user row
    let result = await query(
      `SELECT id, company_name FROM users WHERE email = $1 AND role = 'brand'`,
      [meta.email]
    );

    // If not found, upsert the demo brand so no manual migration is needed
    if (result.rows.length === 0) {
      const passwordHash = createHash('sha256').update('demo').digest('hex');
      result = await query(
        `INSERT INTO users (email, password_hash, role, company_name, industry, contact_name)
         VALUES ($1, $2, 'brand', $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET
           role = 'brand', company_name = EXCLUDED.company_name,
           industry = EXCLUDED.industry, contact_name = EXCLUDED.contact_name
         RETURNING id, company_name`,
        [meta.email, passwordHash, meta.company_name, meta.industry, meta.contact_name]
      );
    }

    const row = result.rows[0];
    const sessionToken = generateSessionToken(row.id, 'brand', row.company_name, meta.avatar_url);

    return NextResponse.json({
      user_id: row.id,
      role: 'brand',
      company_name: row.company_name,
      session_token: sessionToken,
    });
  } catch (e) {
    console.error('Error in demo brand login:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
