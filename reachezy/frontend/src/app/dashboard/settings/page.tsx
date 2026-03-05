'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useDashboard } from '@/contexts/DashboardContext';
import NicheSelector from '@/components/NicheSelector';

type Tab = 'profile' | 'rates';

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

export default function DashboardSettingsPage() {
  const searchParams = useSearchParams();
  const { profile, setPageTitle, refreshProfile } = useDashboard();
  const [tab, setTab] = useState<Tab>(() =>
    (searchParams.get('tab') as Tab) || 'profile'
  );
  const [rates, setRates] = useState<Rates | null>(null);

  // Profile form state
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Rates form state
  const [reelRate, setReelRate] = useState('');
  const [storyRate, setStoryRate] = useState('');
  const [postRate, setPostRate] = useState('');
  const [acceptsBarter, setAcceptsBarter] = useState(false);
  const [ratesSaving, setRatesSaving] = useState(false);
  const [ratesMsg, setRatesMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setPageTitle('Profile & Settings');
  }, [setPageTitle]);

  // Sync form from profile context (no extra API call needed)
  useEffect(() => {
    if (profile) {
      setNiche(profile.niche || '');
      setCity(profile.city || '');
    }
  }, [profile]);

  const loadRates = useCallback(async () => {
    if (!profile) return;
    try {
      const r = await api.getRates(profile.creator_id);
      setRates(r);
      setReelRate(String(r.reel_rate || ''));
      setStoryRate(String(r.story_rate || ''));
      setPostRate(String(r.post_rate || ''));
      setAcceptsBarter(r.accepts_barter ?? false);
    } catch { /* no rates yet */ }
  }, [profile]);

  useEffect(() => { loadRates(); }, [loadRates]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !city) return;
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await api.updateProfile({ niche, city });
      await refreshProfile();
      setProfileMsg({ ok: true, text: 'Profile updated successfully!' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleRatesSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const reel = Number(reelRate);
    const story = Number(storyRate);
    const post = Number(postRate);
    if (reel < 100 || story < 100 || post < 100) {
      setRatesMsg({ ok: false, text: 'All rates must be at least ₹100.' });
      return;
    }
    if (!profile) return;
    setRatesSaving(true);
    setRatesMsg(null);
    try {
      await api.submitRates({
        creator_id: profile.creator_id,
        reel_rate: reel,
        story_rate: story,
        post_rate: post,
        accepts_barter: acceptsBarter,
      });
      setRatesMsg({ ok: true, text: 'Rates updated successfully!' });
    } catch (err) {
      setRatesMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save rates.' });
    } finally {
      setRatesSaving(false);
    }
  };

  if (!profile) return null;

  const MSG_CLS = (ok: boolean) =>
    `flex items-center gap-2 rounded-xl p-3 text-sm font-medium border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
        : 'bg-red-50 text-red-600 border-red-100'
    }`;

  return (
    <div className="overflow-y-auto h-full">
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      {/* Tab switcher */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['profile', 'rates'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
              tab === t
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'profile' ? 'Your Profile' : 'Rate Card'}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {tab === 'profile' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Creator Profile</h2>
            <p className="text-sm text-slate-500 mt-1">
              This information is displayed on your public media kit and helps brands find you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Display Name</p>
              <p className="text-sm font-semibold text-slate-700">{profile.display_name}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Username</p>
              <p className="text-sm font-semibold text-slate-700">@{profile.username}</p>
            </div>
          </div>

          <hr className="border-slate-100" />

          <form onSubmit={handleProfileSave} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">Content Niche</label>
              <NicheSelector value={niche} onChange={setNiche} />
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
                  placeholder="e.g. Mumbai, Delhi, Bangalore"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field pl-12 h-12"
                  required
                />
              </div>
            </div>

            {profileMsg && (
              <div className={MSG_CLS(profileMsg.ok)}>
                <span className="material-symbols-outlined text-base">
                  {profileMsg.ok ? 'check_circle' : 'error'}
                </span>
                {profileMsg.text}
              </div>
            )}

            <button type="submit" disabled={profileSaving} className="btn-primary">
              {profileSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Profile
                </>
              )}
            </button>
          </form>
        </section>
      )}

      {/* ── Rates Tab ── */}
      {tab === 'rates' && (
        <section className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Rate Card</h2>
            <p className="text-sm text-slate-500 mt-1">
              Set what you charge per deliverable. These are shown on your media kit.
            </p>
          </div>

          <form onSubmit={handleRatesSave} className="space-y-5">
            {[
              { id: 'reel', label: 'Instagram Reel', icon: 'movie', value: reelRate, set: setReelRate, hint: 'Rate for one Instagram Reel' },
              { id: 'story', label: 'Instagram Story', icon: 'history', value: storyRate, set: setStoryRate, hint: 'Rate for one Instagram Story' },
              { id: 'post', label: 'Feed Post', icon: 'image', value: postRate, set: setPostRate, hint: 'Rate for one static feed post' },
            ].map(({ id, label, icon, value, set, hint }) => (
              <div key={id}>
                <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="material-symbols-outlined text-base text-slate-400">{icon}</span>
                  {label}
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                  <input
                    id={id}
                    type="number"
                    min={100}
                    step={50}
                    placeholder="e.g. 2000"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                    className="input-field pl-9 h-12"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-slate-400">{hint} (min ₹100)</p>
              </div>
            ))}

            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
              <input
                id="barter"
                type="checkbox"
                checked={acceptsBarter}
                onChange={(e) => setAcceptsBarter(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-primary"
              />
              <label htmlFor="barter" className="cursor-pointer">
                <span className="text-sm font-semibold text-slate-700">Open to barter / collaboration</span>
                <p className="text-xs text-slate-400 mt-0.5">Willing to accept products or services in addition to payment.</p>
              </label>
            </div>

            {ratesMsg && (
              <div className={MSG_CLS(ratesMsg.ok)}>
                <span className="material-symbols-outlined text-base">
                  {ratesMsg.ok ? 'check_circle' : 'error'}
                </span>
                {ratesMsg.text}
              </div>
            )}

            <button type="submit" disabled={ratesSaving} className="btn-primary">
              {ratesSaving ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving…
                </span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">save</span>
                  Save Rates
                </>
              )}
            </button>
          </form>
        </section>
      )}
    </div>
    </div>
  );
}
