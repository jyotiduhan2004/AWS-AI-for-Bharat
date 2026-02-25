'use client';

import { useState } from 'react';

interface RateCardFormProps {
  onSubmit: (data: {
    reel_rate: number;
    story_rate: number;
    post_rate: number;
    accepts_barter: boolean;
  }) => void;
  isLoading: boolean;
}

export default function RateCardForm({ onSubmit, isLoading }: RateCardFormProps) {
  const [reelRate, setReelRate] = useState('');
  const [storyRate, setStoryRate] = useState('');
  const [postRate, setPostRate] = useState('');
  const [acceptsBarter, setAcceptsBarter] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reel = Number(reelRate);
    const story = Number(storyRate);
    const post = Number(postRate);

    if (reel < 100 || story < 100 || post < 100) {
      return;
    }

    onSubmit({
      reel_rate: reel,
      story_rate: story,
      post_rate: post,
      accepts_barter: acceptsBarter,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="reel-rate"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Reel Rate
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            &#8377;
          </span>
          <input
            id="reel-rate"
            type="number"
            min={100}
            step={50}
            placeholder="e.g. 2000"
            value={reelRate}
            onChange={(e) => setReelRate(e.target.value)}
            className="input-field pl-8"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Your rate for one Instagram Reel (min &#8377;100)
        </p>
      </div>

      <div>
        <label
          htmlFor="story-rate"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Story Rate
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            &#8377;
          </span>
          <input
            id="story-rate"
            type="number"
            min={100}
            step={50}
            placeholder="e.g. 500"
            value={storyRate}
            onChange={(e) => setStoryRate(e.target.value)}
            className="input-field pl-8"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Your rate for one Instagram Story (min &#8377;100)
        </p>
      </div>

      <div>
        <label
          htmlFor="post-rate"
          className="mb-1.5 block text-sm font-medium text-gray-700"
        >
          Static Post Rate
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
            &#8377;
          </span>
          <input
            id="post-rate"
            type="number"
            min={100}
            step={50}
            placeholder="e.g. 1500"
            value={postRate}
            onChange={(e) => setPostRate(e.target.value)}
            className="input-field pl-8"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Your rate for one static feed post (min &#8377;100)
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
        <input
          id="barter"
          type="checkbox"
          checked={acceptsBarter}
          onChange={(e) => setAcceptsBarter(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="barter" className="cursor-pointer">
          <span className="text-sm font-medium text-gray-700">
            Open to barter/collaboration
          </span>
          <p className="mt-0.5 text-xs text-gray-500">
            You&apos;re willing to accept products or services instead of (or in
            addition to) payment.
          </p>
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            Saving...
          </span>
        ) : (
          <>
            Save &amp; Upload Videos
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
          </>
        )}
      </button>
    </form>
  );
}
