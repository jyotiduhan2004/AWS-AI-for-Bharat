import { Person } from './types';

interface PersonDetailsProps {
  person: Person;
}

function AvatarFallback({ name, src, className }: { name: string; src?: string; className?: string }) {
  const initial = (name || 'U')[0].toUpperCase();
  if (src) {
    return (
      <div className={`flex items-center justify-center rounded-full bg-white border border-slate-200 overflow-hidden flex-shrink-0 ${className || ''}`}>
        <img src={src} alt={name} className="h-full w-full object-contain p-0.5" />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br from-primary/70 to-primary text-white font-bold flex-shrink-0 ${className || ''}`}
    >
      {initial}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="material-symbols-outlined text-slate-400 text-[20px] mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-slate-700 break-words">{value}</p>
      </div>
    </div>
  );
}

export default function PersonDetails({ person }: PersonDetailsProps) {
  return (
    <div className="flex w-80 flex-col border-l border-slate-200 bg-white">
      <div className="flex flex-1 flex-col overflow-y-auto p-6">
        {/* Avatar & name */}
        <div className="flex flex-col items-center text-center mb-6">
          <AvatarFallback
            name={person.name}
            src={person.avatar}
            className="size-20 text-2xl ring-4 ring-slate-100 mb-3"
          />
          <h3 className="text-base font-bold text-slate-900">{person.name}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{person.subtitle}</p>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-slate-400 text-[16px]">location_on</span>
            <span className="text-xs text-slate-400">{person.location}</span>
          </div>
        </div>

        {/* Details */}
        <div className="border-t border-slate-100 pt-4">
          {person.role === 'Brand' ? (
            <>
              {person.company && <DetailRow icon="business" label="Company" value={person.company} />}
              <DetailRow icon="badge" label="Role" value={person.role} />
              {person.website && <DetailRow icon="language" label="Website" value={person.website} />}
              <DetailRow icon="tag" label="Niche" value={person.niche} />
            </>
          ) : (
            <>
              {person.company && <DetailRow icon="business" label="Company" value={person.company} />}
              <DetailRow icon="badge" label="Role" value={person.role} />
              <DetailRow icon="tag" label="Niche" value={person.niche} />
              <DetailRow icon="group" label="Followers" value={person.followers} />
            </>
          )}
        </div>

        {/* Bio */}
        {person.role === 'Brand' && (
          <div className="border-t border-slate-100 pt-4 mt-2">
            <p className="text-xs text-slate-400 mb-1">Bio</p>
            <p className="text-sm text-slate-600 leading-relaxed">{person.bio}</p>
          </div>
        )}

        {/* Button */}
        <div className="mt-auto pt-6">
          {person.role === 'Brand' ? (
            <a 
              href={person.website || '#'} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Checkout Brand
            </a>
          ) : (
            <a 
              href={`/${person.username || person.name.replace(/\s+/g, '').toLowerCase()}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
              Checkout Creator
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
