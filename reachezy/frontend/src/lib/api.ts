const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

async function fetchAPI(path: string, options?: RequestInit) {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('reachezy_token')
      : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** Call local Next.js API route with auth token. */
async function fetchLocal(path: string, options?: RequestInit) {
  const token =
    typeof window !== 'undefined'
      ? localStorage.getItem('reachezy_token')
      : null;

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  // Auth — these stay on deployed API (Cognito/demo tokens)
  authCallback: (data: { code: string; redirect_uri: string }) =>
    fetchAPI('/auth/callback', { method: 'POST', body: JSON.stringify(data) }),
  demoLogin: (username: string = 'priyabeauty') =>
    fetchAPI('/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ action: 'demo', username }),
    }),

  // Email/password auth (local Next.js route → direct DB)
  signup: (data: {
    action: 'signup';
    role: 'creator' | 'brand';
    email: string;
    password: string;
    [key: string]: unknown;
  }) =>
    fetchLocal('/auth/user', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: { email: string; password: string }) =>
    fetchLocal('/auth/user', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', ...data }),
    }),

  // Profile — switched to local
  getProfile: () => fetchLocal('/creator/profile'),
  updateProfile: (data: { niche: string; city: string }) =>
    fetchLocal('/creator/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Upload — local route (bypasses API Gateway which rejects email-based tokens)
  getPresignedUrl: (data: {
    creator_id: string;
    filename: string;
    content_type: string;
  }) =>
    fetchLocal('/upload/presign', { method: 'POST', body: JSON.stringify(data) }),

  // Analysis trigger — local route
  startAnalysis: (data: { creator_id: string }) =>
    fetchLocal('/upload/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Rates — switched to local
  submitRates: (data: {
    creator_id: string;
    reel_rate: number;
    story_rate: number;
    post_rate: number;
    accepts_barter: boolean;
  }) =>
    fetchLocal('/creator/rates', { method: 'POST', body: JSON.stringify(data) }),
  getRates: (creatorId: string) =>
    fetchLocal(`/creator/rates?creator_id=${creatorId}`),

  // Media Kit — stays on deployed API (Lambda-generated)
  getMediaKit: (username: string) =>
    fetchAPI(`/creator/mediakit/${username}`),
  generatePDF: (data: { creator_id: string }) =>
    fetchAPI('/creator/mediakit/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Upload count — check if creator has uploaded videos
  getUploadsCount: () => fetchLocal('/creator/uploads-count'),

  // Brand search — switched to local
  getAllCreators: () => fetchLocal('/brand/search'),
  searchCreators: (query: string) =>
    fetchLocal('/brand/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  // Wishlist — switched to local
  getWishlist: () => fetchLocal('/brand/wishlist'),
  addToWishlist: (creatorId: string) =>
    fetchLocal('/brand/wishlist', {
      method: 'POST',
      body: JSON.stringify({ creator_id: creatorId }),
    }),
  removeFromWishlist: (creatorId: string) =>
    fetchLocal('/brand/wishlist', {
      method: 'DELETE',
      body: JSON.stringify({ creator_id: creatorId }),
    }),

  // Brand search (universal search)
  searchBrands: (q: string) => fetchLocal(`/search/brands?q=${encodeURIComponent(q)}`),
  getAllBrands: () => fetchLocal('/search/brands'),
};
