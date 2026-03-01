/**
 * Server-side token parser for Next.js API routes.
 * Extracts user info from the Bearer token in request headers.
 * The token is a JSON string (set during email/password login).
 */
import { NextRequest } from 'next/server';

export interface SessionUser {
  user_id: string;
  creator_id: string | null;
  role: 'creator' | 'brand';
  username: string;
  cognito_sub: string;
}

export function getUserFromRequest(req: NextRequest): SessionUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    const parsed = JSON.parse(token);

    // Check expiry
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      user_id: parsed.user_id,
      creator_id: parsed.creator_id || null,
      role: parsed.role || 'creator',
      username: parsed.username || '',
      cognito_sub: parsed.cognito_sub || '',
    };
  } catch {
    return null;
  }
}
