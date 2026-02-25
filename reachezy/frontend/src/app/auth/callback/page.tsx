'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { api } from '@/lib/api';

const COGNITO_DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Authenticating...');

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`Authentication failed: ${errorParam}`);
        return;
      }

      if (!code) {
        setError('No authorization code received.');
        return;
      }

      try {
        setStatus('Exchanging authorization code...');

        const redirectUri = `${window.location.origin}/auth/callback`;
        const tokenEndpoint = `https://${COGNITO_DOMAIN}/oauth2/token`;

        const tokenResponse = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: CLIENT_ID || '',
            code,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenResponse.ok) {
          throw new Error('Failed to exchange authorization code for tokens.');
        }

        const tokens = await tokenResponse.json();
        const accessToken = tokens.access_token;
        const idToken = tokens.id_token;

        setToken(idToken || accessToken);

        setStatus('Setting up your account...');

        try {
          const authResult = await api.authCallback({
            access_token: accessToken,
          });

          setStatus('Checking your profile...');

          try {
            const profile = await api.getProfile();

            if (profile && profile.niche) {
              router.replace('/dashboard');
            } else {
              router.replace('/onboarding');
            }
          } catch {
            router.replace('/onboarding');
          }
        } catch {
          router.replace('/onboarding');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred.'
        );
      }
    }

    handleCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card mx-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <button
            onClick={() => router.replace('/')}
            className="btn-primary mt-6 w-full"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        <h2 className="text-xl font-semibold text-gray-900">{status}</h2>
        <p className="mt-2 text-sm text-gray-500">
          Please wait while we set things up for you.
        </p>
      </div>
    </div>
  );
}
