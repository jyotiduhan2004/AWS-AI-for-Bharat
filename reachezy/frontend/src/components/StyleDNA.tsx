'use client';

interface StyleProfile {
  dominant_energy: string;
  energy_score: number;
  dominant_aesthetic: string;
  primary_content_type: string;
  style_summary: string;
  consistency_score: number;
  topics?: string[];
  face_visible_pct?: number;
  text_overlay_pct?: number;
  settings?: { name: string; pct: number }[];
}

interface StyleDNAProps {
  styleProfile: StyleProfile;
}

function getEnergyColor(energy: string): string {
  const e = energy.toLowerCase();
  if (e.includes('high') || e.includes('energetic') || e.includes('dynamic'))
    return 'from-orange-400 to-red-500';
  if (e.includes('medium') || e.includes('warm') || e.includes('balanced'))
    return 'from-yellow-400 to-orange-400';
  if (e.includes('calm') || e.includes('low') || e.includes('serene'))
    return 'from-blue-400 to-cyan-400';
  return 'from-primary-400 to-purple-500';
}

function getAestheticBadgeColor(aesthetic: string): string {
  const a = aesthetic.toLowerCase();
  if (a.includes('minimal')) return 'bg-gray-100 text-gray-700';
  if (a.includes('bold') || a.includes('vibrant')) return 'bg-pink-100 text-pink-700';
  if (a.includes('warm')) return 'bg-amber-100 text-amber-700';
  if (a.includes('dark') || a.includes('moody')) return 'bg-slate-100 text-slate-700';
  if (a.includes('pastel') || a.includes('soft')) return 'bg-purple-100 text-purple-700';
  if (a.includes('natural') || a.includes('earth')) return 'bg-green-100 text-green-700';
  return 'bg-primary-100 text-primary-700';
}

function getContentTypeBadgeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('tutorial') || t.includes('how')) return 'bg-blue-100 text-blue-700';
  if (t.includes('vlog') || t.includes('day')) return 'bg-green-100 text-green-700';
  if (t.includes('review') || t.includes('unbox')) return 'bg-orange-100 text-orange-700';
  if (t.includes('comedy') || t.includes('skit')) return 'bg-yellow-100 text-yellow-700';
  if (t.includes('trend') || t.includes('dance')) return 'bg-pink-100 text-pink-700';
  return 'bg-primary-100 text-primary-700';
}

export default function StyleDNA({ styleProfile }: StyleDNAProps) {
  return (
    <div className="space-y-5">
      {/* Energy Level */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Dominant Energy
          </span>
          <span className="text-sm font-semibold capitalize text-gray-900">
            {styleProfile.dominant_energy}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${getEnergyColor(styleProfile.dominant_energy)} transition-all duration-700`}
            style={{ width: `${styleProfile.energy_score}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-400">
          <span>Calm</span>
          <span>Energetic</span>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Aesthetic</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getAestheticBadgeColor(styleProfile.dominant_aesthetic)}`}
          >
            {styleProfile.dominant_aesthetic}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-500">Content Type</span>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getContentTypeBadgeColor(styleProfile.primary_content_type)}`}
          >
            {styleProfile.primary_content_type}
          </span>
        </div>
      </div>

      {/* Summary */}
      {styleProfile.style_summary && (
        <div className="rounded-lg bg-gradient-to-r from-primary-50 to-purple-50 p-4">
          <p className="text-sm leading-relaxed text-gray-700">
            {styleProfile.style_summary}
          </p>
        </div>
      )}

      {/* Consistency Score */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <span
            className={`text-lg font-bold ${
              styleProfile.consistency_score >= 70
                ? 'text-green-600'
                : styleProfile.consistency_score >= 40
                  ? 'text-yellow-600'
                  : 'text-red-600'
            }`}
          >
            {styleProfile.consistency_score}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">
            Consistency Score
          </p>
          <p className="text-xs text-gray-500">
            {styleProfile.consistency_score >= 70
              ? 'Highly consistent -- brands love predictable creators.'
              : styleProfile.consistency_score >= 40
                ? 'Good consistency across your content.'
                : 'Varied style -- consider narrowing your focus.'}
          </p>
        </div>
      </div>
    </div>
  );
}
