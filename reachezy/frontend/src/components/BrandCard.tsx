'use client';

interface Brand {
  user_id: string;
  company_name: string;
  industry: string;
  city: string;
  contact_name: string;
}

interface BrandCardProps {
  brand: Brand;
}

const INDUSTRY_COLORS: Record<string, string> = {
  'Beauty & Wellness': 'bg-pink-100 text-pink-700',
  'Fashion & Apparel': 'bg-purple-100 text-purple-700',
  'Electronics & Tech': 'bg-blue-100 text-blue-700',
  'Food & Beverage': 'bg-orange-100 text-orange-700',
  'Health & Fitness': 'bg-green-100 text-green-700',
  'Travel & Hospitality': 'bg-cyan-100 text-cyan-700',
  'Education & EdTech': 'bg-indigo-100 text-indigo-700',
  'Entertainment & Media': 'bg-red-100 text-red-700',
  'Finance & Fintech': 'bg-emerald-100 text-emerald-700',
  'E-commerce & Retail': 'bg-amber-100 text-amber-700',
  'Gaming': 'bg-violet-100 text-violet-700',
  'Automotive': 'bg-slate-100 text-slate-700',
};

export default function BrandCard({ brand }: BrandCardProps) {
  const initial = (brand.company_name || '?')[0].toUpperCase();
  const industryColor = INDUSTRY_COLORS[brand.industry] || 'bg-gray-100 text-gray-700';

  return (
    <div className="card flex flex-col transition-all duration-200 hover:border-primary-200 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-lg font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-gray-900">
            {brand.company_name || 'Unnamed Brand'}
          </h3>
          {brand.contact_name && (
            <p className="text-sm text-gray-500">{brand.contact_name}</p>
          )}
        </div>
      </div>

      {/* Industry + City */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {brand.industry && (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${industryColor}`}>
            {brand.industry}
          </span>
        )}
        {brand.city && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
            </svg>
            {brand.city}
          </span>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action */}
      <div className="mt-4">
        <button className="btn-secondary w-full text-center text-xs">
          View Profile
        </button>
      </div>
    </div>
  );
}
