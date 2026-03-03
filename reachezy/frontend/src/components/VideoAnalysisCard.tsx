'use client';

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

const QUALITY_COLORS: Record<string, string> = {
  low: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-green-100 text-green-700',
  professional: 'bg-primary-100 text-primary-700',
};

export default function VideoAnalysisCard({ analysis, onDelete }: { analysis: VideoAnalysis; onDelete?: (videoId: string) => void }) {
  const uploadDate = new Date(analysis.uploaded_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const duration = analysis.duration_seconds
    ? `${Math.floor(analysis.duration_seconds / 60)}:${String(
        Math.round(analysis.duration_seconds % 60)
      ).padStart(2, '0')}`
    : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
            #{analysis.video_number}
          </span>
          <span className="text-sm font-medium text-slate-700">
            Video {analysis.video_number}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {duration && <span>{duration}</span>}
          <span>{uploadDate}</span>
          {onDelete && (
            <button
              onClick={() => {
                if (window.confirm('Delete this video analysis? This cannot be undone.')) {
                  onDelete(analysis.video_id);
                }
              }}
              className="ml-1 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Delete video analysis"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <p className="mb-3 text-sm text-slate-600 leading-relaxed">
        {analysis.summary}
      </p>

      {/* Key attributes */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Energy</p>
          <p className="text-sm font-medium text-slate-700 capitalize">{analysis.energy_level}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aesthetic</p>
          <p className="text-sm font-medium text-slate-700 capitalize">{analysis.aesthetic}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Content Type</p>
          <p className="text-sm font-medium text-slate-700 capitalize">{analysis.content_type}</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Setting</p>
          <p className="text-sm font-medium text-slate-700 capitalize">{analysis.setting}</p>
        </div>
      </div>

      {/* Tags row */}
      <div className="flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${QUALITY_COLORS[analysis.production_quality] || 'bg-slate-100 text-slate-600'}`}>
          {analysis.production_quality} quality
        </span>
        {analysis.face_visible && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
            Face visible
          </span>
        )}
        {analysis.has_text_overlay && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
            Text overlay
          </span>
        )}
      </div>

      {/* Topics */}
      {analysis.topics && analysis.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {analysis.topics.map((topic) => (
            <span key={topic} className="rounded-full bg-primary-50 px-2 py-0.5 text-xs text-primary-600">
              {topic}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
