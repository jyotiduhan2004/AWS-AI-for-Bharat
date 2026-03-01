/**
 * GET /api/search/brands?q=beauty — Search users with role='brand'.
 * Returns brand profiles from the users table.
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

    const q = (req.nextUrl.searchParams.get('q') || '').trim();

    let result;
    if (q) {
      const pattern = `%${q}%`;
      result = await query(
        `SELECT id AS user_id, company_name, industry, city, contact_name
         FROM users
         WHERE role = 'brand'
           AND (company_name ILIKE $1 OR industry ILIKE $1 OR city ILIKE $1 OR contact_name ILIKE $1)
         ORDER BY company_name ASC
         LIMIT 50`,
        [pattern]
      );
    } else {
      result = await query(
        `SELECT id AS user_id, company_name, industry, city, contact_name
         FROM users
         WHERE role = 'brand'
         ORDER BY company_name ASC
         LIMIT 50`
      );
    }

    return NextResponse.json({ brands: result.rows });
  } catch (e) {
    console.error('Error in GET /api/search/brands:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
