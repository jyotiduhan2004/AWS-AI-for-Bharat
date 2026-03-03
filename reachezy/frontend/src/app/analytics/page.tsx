'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import StyleDNA from '@/components/StyleDNA';
import TopicCloud from '@/components/TopicCloud';
import DashboardShell from '@/components/DashboardShell';
import VideoAnalysisCard from '@/components/VideoAnalysisCard';
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
  video_count?: number;
}

interface VideoAnalysis {
  video_number: number;
  video_id: string;
  energy_level: string;
  aesthetic: string;
  setting: string;
  production_quality: string;
  content_type: string;
  topics: string[];
  dominant_colors: string[];
  has_text_overlay: boolean;
  face_visible: boolean;
  summary: string;
  analyzed_at: string;
  duration_seconds: number | null;
  uploaded_at: string;
}

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);
  const [videoAnalyses, setVideoAnalyses] = useState<VideoAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState('');

  const loadData = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUsername(profile.username);
      setDisplayName(profile.display_name || profile.username);
      setProfilePic(profile.profile_picture_url || '');

      const [mediaKit, analysesData] = await Promise.all([
        api.getMediaKit(profile.username),
        api.getVideoAnalyses().catch(() => ({ analyses: [] })),
      ]);

      const sp = mediaKit?.creator?.style_profile || profile.style_profile;
      if (sp) {
        setStyleProfile(sp);
      }
      setVideoAnalyses(analysesData.analyses || []);
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await api.deleteVideoAnalysis(videoId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete video analysis:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (!styleProfile) {
    return (
      <DashboardShell username={username} displayName={displayName} profilePictureUrl={profilePic} title="Detailed Analytics">
        <div className="flex h-full items-center justify-center p-8">
          <div className="flex flex-col items-center text-center p-12 bg-white rounded-2xl border border-slate-200">
            <svg
              className="mx-auto mb-4 h-12 w-12 text-slate-300"
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
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              No Analytics Yet
            </h2>
            <p className="text-slate-500 max-w-sm mb-6">
              Upload your content to get AI-powered style analytics.
            </p>
            <Link href="/upload" className="btn-primary">
              Upload Content
            </Link>
          </div>
        </div>
      </DashboardShell>
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
    <DashboardShell username={username} displayName={displayName} profilePictureUrl={profilePic} title="Detailed Analytics">
      <div className="mx-auto max-w-6xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Your Content DNA</h1>
          <p className="text-slate-600">
            AI-powered analysis of your unique content style and production patterns.
          </p>
          {styleProfile.video_count && styleProfile.video_count > 0 && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-sm font-medium text-primary-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125-.504-1.125-1.125v-1.5c0-.621.504-1.125 1.125-1.125M19.125 12h1.5m0 0c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m1.5 3.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125" />
              </svg>
              Based on {styleProfile.video_count} video{styleProfile.video_count > 1 ? 's' : ''} analyzed
            </span>
          )}
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
              <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs font-medium text-blue-700 mb-1">How is this calculated?</p>
                <p className="text-xs text-blue-600 leading-relaxed">
                  Measures how similar your content style is across all videos.
                  Checks 5 dimensions: energy, aesthetic, setting, production quality, and content type.
                  Higher score = more consistent brand identity = more attractive to brands.
                </p>
              </div>
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

        {/* Aggregate explanation banner */}
        {videoAnalyses.length > 1 && (
          <div className="mt-8 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 px-6 py-4">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 text-primary-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-primary-800">
                  Your profile above is computed from all {videoAnalyses.length} videos analyzed.
                </p>
                <p className="mt-1 text-xs text-primary-600">
                  Individual video analyses are preserved below. Each video contributes to your aggregate style profile — no data is overwritten.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Per-video breakdown */}
        {videoAnalyses.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              Video-by-Video Breakdown
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Individual AI analysis for each uploaded video
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {videoAnalyses.map((va) => (
                <VideoAnalysisCard key={va.video_id} analysis={va} onDelete={handleDeleteVideo} />
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
