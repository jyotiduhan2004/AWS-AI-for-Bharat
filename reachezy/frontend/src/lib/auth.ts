const FB_APP_ID = process.env.NEXT_PUBLIC_FB_APP_ID;
const FB_CONFIG_ID = process.env.NEXT_PUBLIC_FB_CONFIG_ID;
const REDIRECT_URI =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '';

export function getLoginUrl(): string {
  return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&config_id=${FB_CONFIG_ID}&response_type=code`;
}

export function getLogoutUrl(): string {
  clearToken();
  return '/';
}

export function setToken(token: string) {
  localStorage.setItem('reachezy_token', token);
}

export function getToken(): string | null {
  return typeof window !== 'undefined'
    ? localStorage.getItem('reachezy_token')
    : null;
}

export function clearToken() {
  localStorage.removeItem('reachezy_token');
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ---- New: role-aware session helpers ----

interface UserSession {
  user_id?: string;
  creator_id?: string;
  role?: 'creator' | 'brand';
  cognito_sub?: string;
  username?: string;
  iat?: number;
  exp?: number;
}

export function getUserSession(): UserSession | null {
  const token = getToken();
  if (!token) return null;
  try {
    return JSON.parse(token) as UserSession;
  } catch {
    return null;
  }
}

export function getUserRole(): 'creator' | 'brand' | null {
  const session = getUserSession();
  return session?.role || null;
}

export function isBrand(): boolean {
  return getUserRole() === 'brand';
}

export function isCreator(): boolean {
  const role = getUserRole();
  // If no role field (legacy token from demo/FB login), treat as creator
  return role === 'creator' || role === null;
}
