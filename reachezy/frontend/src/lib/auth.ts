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
