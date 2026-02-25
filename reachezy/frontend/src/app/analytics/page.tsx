'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import StyleDNA from '@/components/StyleDNA';
import TopicCloud from '@/components/TopicCloud';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface StyleProfile {
  dominant_energy: string;
  energy_score: number;
  dominant_aesthetic: string;
  primary_content_type: string;
  style_summary: string;
  consistency_score: number;
  topics: string[];
  face_visible_pct: number;
  text_overlay_pct: number;
  settings: { name: string; pct: number }[];
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      const mediaKit = await api.getMediaKit(profile.username);
      if (mediaKit?.style_profile) {
        setStyleProfile(mediaKit.style_profile);
      }
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!styleProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="card max-w-md text-center">
          <svg
            className="mx-auto mb-4 h-12 w-12 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900">
            No Analytics Yet
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Upload your content to get AI-powered style analytics.
          </p>
          <Link href="/upload" className="btn-primary mt-6 inline-block">
            Upload Content
          </Link>
        </div>
      </div>
    );
  }

  const consistencyLabel =
    styleProfile.consistency_score >= 80
      ? 'Excellent! Brands love your predictable style.'
      : styleProfile.consistency_score >= 60
        ? 'Good consistency. Brands can rely on your content.'
        : styleProfile.consistency_score >= 40
          ? 'Moderate. Developing a clearer signature style could help.'
          : 'Evolving style. Consider narrowing your content focus.';

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <span className="text-sm font-bold text-white">R</span>
            </div>
            <span className="text-lg font-bold text-gray-900">ReachEzy</span>
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Dashboard
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Content DNA</h1>
          <p className="mt-1 text-gray-600">
            AI-powered analysis of your unique content style and production
            patterns.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Style DNA Card */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Style DNA
            </h2>
            <StyleDNA styleProfile={styleProfile} />
          </div>

          {/* Consistency Score */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Consistency Score
            </h2>
            <div className="flex flex-col items-center py-4">
              <div className="relative flex h-36 w-36 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-gray-100" />
                <div
                  className="absolute inset-0 rounded-full border-8 border-t-primary-600 border-r-primary-600"
                  style={{
                    borderColor: `${
                      styleProfile.consistency_score >= 70
                        ? '#16a34a'
                        : styleProfile.consistency_score >= 40
                          ? '#ca8a04'
                          : '#dc2626'
                    } transparent transparent transparent`,
                    transform: `rotate(${
                      (styleProfile.consistency_score / 100) * 360
                    }deg)`,
                    borderWidth: '8px',
                    transition: 'transform 1s ease-out',
                  }}
                />
                <div className="relative text-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {styleProfile.consistency_score}
                  </span>
                  <span className="text-lg text-gray-500">%</span>
                </div>
              </div>
              <div className="mt-4 w-full rounded-lg bg-gray-50 p-4">
                <div className="mb-2 flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${styleProfile.consistency_score}%`,
                      background:
                        styleProfile.consistency_score >= 70
                          ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                          : styleProfile.consistency_score >= 40
                            ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                            : 'linear-gradient(90deg, #ef4444, #dc2626)',
                    }}
                  />
                </div>
              </div>
              <p className="mt-4 text-center text-sm text-gray-600">
                {consistencyLabel}
              </p>
            </div>
          </div>

          {/* Topic Cloud */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Topic Cloud
            </h2>
            <TopicCloud topics={styleProfile.topics} />
          </div>

          {/* Production Profile */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Production Profile
            </h2>
            <div className="space-y-5">
              {/* Face Visible */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Face Visible
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {styleProfile.face_visible_pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600 transition-all duration-700"
                    style={{ width: `${styleProfile.face_visible_pct}%` }}
                  />
                </div>
              </div>

              {/* Text Overlay */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Text Overlay
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {styleProfile.text_overlay_pct}%
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-700"
                    style={{ width: `${styleProfile.text_overlay_pct}%` }}
                  />
                </div>
              </div>

              {/* Setting Distribution */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Setting Distribution
                </p>
                {styleProfile.settings && styleProfile.settings.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={styleProfile.settings}
                        layout="vertical"
                        margin={{ top: 0, right: 0, bottom: 0, left: 60 }}
                      >
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 12, fill: '#9ca3af' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          width={55}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, 'Usage']}
                          contentStyle={{
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="pct" radius={[0, 4, 4, 0]} barSize={20}>
                          {styleProfile.settings.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={BAR_COLORS[index % BAR_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No setting data available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
