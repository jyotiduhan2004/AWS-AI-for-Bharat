'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import NicheSelector from '@/components/NicheSelector';
import RateCardForm from '@/components/RateCardForm';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !city) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleRatesSubmit = async (rates: {
    reel_rate: number;
    story_rate: number;
    post_rate: number;
    accepts_barter: boolean;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      await api.updateProfile({ niche, city });

      const profile = await api.getProfile();

      await api.submitRates({
        creator_id: profile.creator_id,
        ...rates,
      });

      router.replace('/upload');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step >= 1
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              1
            </div>
            <div
              className={`h-0.5 w-16 transition-colors ${
                step >= 2 ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            />
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                step >= 2
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              2
            </div>
          </div>
          <div className="mt-3 flex justify-between px-2">
            <span className="text-xs font-medium text-gray-500">About You</span>
            <span className="text-xs font-medium text-gray-500">Your Rates</span>
          </div>
        </div>

        {/* Step 1: Profile */}
        {step === 1 && (
          <div className="card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Tell us about yourself
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                This helps us find the right benchmarks for your niche and location.
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Your Niche
                </label>
                <NicheSelector value={niche} onChange={setNiche} />
              </div>

              <div>
                <label
                  htmlFor="city"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field"
                  required
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button type="submit" className="btn-primary w-full">
                Next: Set Your Rates
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
            </form>
          </div>
        )}

        {/* Step 2: Rates */}
        {step === 2 && (
          <div className="card">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                What do you charge?
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Enter your rates to see how you compare to similar creators.
                This data is anonymized and helps build benchmarks for everyone.
              </p>
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <RateCardForm onSubmit={handleRatesSubmit} isLoading={isLoading} />

            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              &larr; Back to profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
