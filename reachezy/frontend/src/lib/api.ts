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

export const api = {
  // Auth
  authCallback: (data: { access_token: string }) =>
    fetchAPI('/auth/callback', { method: 'POST', body: JSON.stringify(data) }),

  // Profile
  getProfile: () => fetchAPI('/creator/profile'),
  updateProfile: (data: { niche: string; city: string }) =>
    fetchAPI('/creator/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Upload
  getPresignedUrl: (data: {
    creator_id: string;
    filename: string;
    content_type: string;
  }) =>
    fetchAPI('/upload/presign', { method: 'POST', body: JSON.stringify(data) }),

  // Rates
  submitRates: (data: {
    creator_id: string;
    reel_rate: number;
    story_rate: number;
    post_rate: number;
    accepts_barter: boolean;
  }) =>
    fetchAPI('/creator/rates', { method: 'POST', body: JSON.stringify(data) }),
  getRates: (creatorId: string) =>
    fetchAPI(`/creator/rates?creator_id=${creatorId}`),

  // Media Kit
  getMediaKit: (username: string) =>
    fetchAPI(`/creator/mediakit/${username}`),
  generatePDF: (data: { creator_id: string }) =>
    fetchAPI('/creator/mediakit/pdf', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
