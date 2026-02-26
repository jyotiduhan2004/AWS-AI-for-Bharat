'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setToken } from '@/lib/auth';
import { api } from '@/lib/api';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Authenticating...');
  const calledRef = useRef(false);

  useEffect(() => {
    async function handleCallback() {
      // Prevent double execution (React 18 Strict Mode)
      if (calledRef.current) return;
      calledRef.current = true;
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
        setStatus('Setting up your account...');

        const redirectUri = `${window.location.origin}/auth/callback`;

        // Send the Facebook auth code to our backend Lambda
        // Lambda will exchange it for a token server-side
        const authResult = await api.authCallback({
          code,
          redirect_uri: redirectUri,
        });

        // Store the session token returned by the Lambda
        if (authResult.session_token) {
          setToken(authResult.session_token);
        }

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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Loading...</h2>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
