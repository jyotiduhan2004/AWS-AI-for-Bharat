'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import VideoUploader from '@/components/VideoUploader';

export default function UploadPage() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await api.getProfile();
        setCreatorId(profile.creator_id);
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleUploadComplete = async () => {
    setIsComplete(true);
    setIsAnalyzing(true);

    // Trigger the video analysis pipeline
    if (creatorId) {
      try {
        await api.startAnalysis({ creator_id: creatorId });
      } catch (err) {
        console.error('Failed to start analysis:', err);
      }
    }

    setTimeout(() => {
      setIsAnalyzing(false);
    }, 5000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Upload Your Best Content
          </h1>
          <p className="mt-2 text-gray-600">
            Select 1-5 of your best Instagram Reels (MP4/MOV, max 60s, max 100MB)
          </p>
        </div>

        {/* Upload Area */}
        {!isComplete && creatorId && (
          <VideoUploader
            creatorId={creatorId}
            onComplete={handleUploadComplete}
          />
        )}

        {/* Analyzing State */}
        {isComplete && isAnalyzing && (
          <div className="card text-center">
            <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Analyzing your content...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Our AI is studying your videos to understand your unique style,
              production quality, and content patterns. This may take a few
              minutes.
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">Videos uploaded successfully</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
                <span className="text-gray-700">Running AI style analysis...</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                <div className="h-5 w-5 rounded-full border-2 border-gray-200" />
                <span className="text-gray-400">Generating media kit</span>
              </div>
            </div>
          </div>
        )}

        {/* Complete State */}
        {isComplete && !isAnalyzing && (
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Upload Complete!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your content is being analyzed. Head to your dashboard to see the
              results as they come in.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-primary mt-6 w-full"
            >
              Go to Dashboard
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
