const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const REDIRECT_URI =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : '';

export function getLoginUrl(): string {
  return `https://${COGNITO_DOMAIN}/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid+profile+email&identity_provider=Facebook`;
}

export function getLogoutUrl(): string {
  return `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
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
