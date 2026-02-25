'use client';

import { useState } from 'react';
import { formatINR } from '@/lib/constants';

interface Benchmarks {
  niche_percentile: { reel: number; story: number; post: number };
  overall_percentile: { reel: number; story: number; post: number };
  source: string;
  sample_size?: number;
}

interface BenchmarkDisplayProps {
  benchmarks: Benchmarks | null;
  niche: string;
  followerBucket: string;
  rates?: {
    reel: number;
    story: number;
    post: number;
  };
}

function getPercentileColor(pct: number): string {
  if (pct >= 70) return 'bg-green-500';
  if (pct >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getPercentileTextColor(pct: number): string {
  if (pct >= 70) return 'text-green-700';
  if (pct >= 40) return 'text-yellow-700';
  return 'text-red-700';
}

function getPercentileBgColor(pct: number): string {
  if (pct >= 70) return 'bg-green-50';
  if (pct >= 40) return 'bg-yellow-50';
  return 'bg-red-50';
}

function getPercentileLabel(pct: number): string {
  if (pct >= 80) return 'Premium';
  if (pct >= 60) return 'Above Average';
  if (pct >= 40) return 'Average';
  if (pct >= 20) return 'Below Average';
  return 'Budget';
}

const CONTENT_TYPES: { key: 'reel' | 'story' | 'post'; label: string; icon: React.ReactNode }[] = [
  {
    key: 'reel',
    label: 'Reel',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 12 6 12.504 6 13.125M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'story',
    label: 'Story',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: 'post',
    label: 'Static Post',
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M2.25 15.75V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-2.25" />
      </svg>
    ),
  },
];

export default function BenchmarkDisplay({
  benchmarks,
  niche,
  followerBucket,
  rates,
}: BenchmarkDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!benchmarks) {
    return (
      <div className="rounded-lg bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">
          Benchmarks will be available once we have enough data for your niche
          and follower range.
        </p>
      </div>
    );
  }

  const sourceLabel =
    benchmarks.source === 'community'
      ? `Community Data (based on ${benchmarks.sample_size || 0} creators)`
      : 'Industry Estimate (INCA 2024 + Wobb)';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">
          {niche} | {followerBucket}
        </p>
      </div>

      {CONTENT_TYPES.map((type) => {
        const nichePercentile = benchmarks.niche_percentile[type.key];
        const overallPercentile = benchmarks.overall_percentile[type.key];
        const rate = rates ? rates[type.key] : null;

        return (
          <div
            key={type.key}
            className="rounded-lg border border-gray-100 bg-gray-50 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{type.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {type.label}
                </span>
              </div>
              {rate !== null && (
                <span className="text-sm font-semibold text-gray-900">
                  {formatINR(rate)}
                </span>
              )}
            </div>

            {/* Niche Percentile Bar */}
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Niche benchmark
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPercentileBgColor(nichePercentile)} ${getPercentileTextColor(nichePercentile)}`}
                >
                  {nichePercentile}th percentile
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getPercentileColor(nichePercentile)}`}
                  style={{ width: `${nichePercentile}%` }}
                />
              </div>
            </div>

            {/* Overall Percentile Bar */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Overall benchmark
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getPercentileBgColor(overallPercentile)} ${getPercentileTextColor(overallPercentile)}`}
                >
                  {overallPercentile}th percentile
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getPercentileColor(overallPercentile)}`}
                  style={{ width: `${overallPercentile}%` }}
                />
              </div>
            </div>

            {/* Percentile Label */}
            <p className="mt-2 text-center text-xs text-gray-400">
              {getPercentileLabel(nichePercentile)} for {niche}
            </p>
          </div>
        );
      })}

      {/* Source */}
      <div className="relative flex items-center justify-center gap-1 pt-2">
        <div
          className="group relative cursor-help"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <p className="text-center text-xs text-gray-400">
            <svg
              className="mr-1 inline-block h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            {sourceLabel}
          </p>

          {showTooltip && benchmarks.source !== 'community' && (
            <div className="absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-4 py-3 text-xs text-gray-200 shadow-lg">
              <p>
                Rate benchmarks are estimated using INCA India Influencer Report
                2024 and Wobb pricing data, adjusted for niche, follower count,
                and city tier. As more creators share their rates, estimates will
                be replaced with real community data.
              </p>
              <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
