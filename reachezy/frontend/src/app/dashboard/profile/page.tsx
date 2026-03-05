'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useDashboard } from '@/contexts/DashboardContext';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, setPageTitle, refreshProfile } = useDashboard();

  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setPageTitle('My Account');
  }, [setPageTitle]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setCity(profile.city || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !city.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.updateProfile({ display_name: displayName, city });
      await refreshProfile();
      setMsg({ ok: true, text: 'Profile updated!' });
    } catch {
      setMsg({ ok: false, text: 'Failed to save changes.' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/');
  };

  if (!profile) return null;

  const isDemo = profile.cognito_sub?.startsWith('demo_') ?? false;

  const socials = [
    {
      id: 'instagram',
      label: 'Instagram',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-pink-500">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      connected: isDemo,
    },
    {
      id: 'youtube',
      label: 'YouTube Shorts',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-red-500">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
      connected: false,
    },
  ];

  const MSG_CLS = (ok: boolean) =>
    `flex items-center gap-2 rounded-xl p-3 text-sm font-medium border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-red-50 text-red-600 border-red-100'
    }`;

  return (
    <div className="overflow-y-auto h-full">
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* Avatar + identity */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8">
        <div className="flex items-center gap-6">
          {profile.profile_picture_url ? (
            <img
              src={profile.profile_picture_url}
              alt={profile.display_name}
              className="size-20 rounded-2xl object-cover shadow-md flex-shrink-0"
            />
          ) : (
            <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/70 to-primary flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 shadow-md">
              {(profile.display_name || profile.username || 'U')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{profile.display_name || profile.username}</h2>
            <p className="text-slate-500 text-sm mt-0.5">@{profile.username}</p>
            {profile.city && (
              <p className="text-slate-400 text-xs mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">location_on</span>
                {profile.city}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Editable info */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
        <h3 className="font-bold text-lg text-slate-900">Personal Details</h3>
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label htmlFor="display_name" className="mb-2 block text-sm font-bold text-slate-700">Display Name</label>
            <input
              id="display_name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your public name"
              className="input-field h-12"
              required
            />
          </div>
          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-bold text-slate-700">City</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-xl">location_on</span>
              </div>
              <input
                id="city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Delhi, Bangalore"
                className="input-field pl-12 h-12"
                required
              />
            </div>
          </div>

          {msg && (
            <div className={MSG_CLS(msg.ok)}>
              <span className="material-symbols-outlined text-base">{msg.ok ? 'check_circle' : 'error'}</span>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </span>
            ) : (
              <><span className="material-symbols-outlined text-sm">save</span>Save Changes</>
            )}
          </button>
        </form>
      </section>

      {/* Connected Accounts */}
      <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
        <div>
          <h3 className="font-bold text-lg text-slate-900">Connected Accounts</h3>
          <p className="text-sm text-slate-500 mt-1">Link your social accounts to unlock growth insights and verification.</p>
        </div>
        <div className="space-y-3">
          {socials.map(({ id, label, icon, connected }) => (
            <div key={id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                {icon}
                <span className="font-semibold text-sm text-slate-800">{label}</span>
              </div>
              {connected ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  Connected
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
                  Coming Soon
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Sign Out */}
      <section className="bg-white rounded-2xl border border-red-100 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Sign Out</h3>
            <p className="text-sm text-slate-400 mt-0.5">You will be returned to the home page.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-semibold text-sm transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sign Out
          </button>
        </div>
      </section>
    </div>
    </div>
  );
}
