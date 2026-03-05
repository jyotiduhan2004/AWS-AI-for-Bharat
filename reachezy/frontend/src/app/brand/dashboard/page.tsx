'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUserSession } from '@/lib/auth';

export default function BrandDashboardPage() {
  const [savedCount, setSavedCount] = useState(0);
  const [companyName, setCompanyName] = useState('Brand');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const session = getUserSession();
    if (session) {
      setCompanyName(session.username || 'Brand');
      setAvatarUrl(session.avatar_url);
    }
  }, []);

  const loadWishlistCount = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setSavedCount((data.wishlist || []).length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadWishlistCount(); }, [loadWishlistCount]);

  const initial = (companyName || 'B')[0].toUpperCase();

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-8 max-w-5xl mx-auto space-y-8">

        {/* Profile header */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center gap-6">
            <div className={`size-20 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-md flex-shrink-0 overflow-hidden ${avatarUrl ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-primary/70 to-primary text-white'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={companyName} className="h-full w-full object-contain p-2" />
              ) : (
                initial
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{companyName}</h2>
              <p className="text-slate-500 mt-1">Welcome back to your brand dashboard</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <span className="material-symbols-outlined text-xs">verified</span>
                Brand Account
              </span>
            </div>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: 'favorite', label: 'Saved Creators', value: savedCount, color: 'text-rose-500', bg: 'bg-rose-50' },
            { icon: 'chat',     label: 'Conversations',  value: 5,           color: 'text-blue-500', bg: 'bg-blue-50' },
            { icon: 'group',    label: 'Creators Available', value: '50+',   color: 'text-emerald-500', bg: 'bg-emerald-50' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center gap-3">
                <div className={`size-10 rounded-lg ${bg} flex items-center justify-center`}>
                  <span className={`material-symbols-outlined ${color}`}>{icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-sm text-slate-500">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/brand/search"
              className="group bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all"
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary">manage_search</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Find Creators</h3>
                <p className="text-sm text-slate-500 mt-0.5">Search and discover influencers</p>
              </div>
            </Link>

            <Link
              href="/brand/wishlist"
              className="group bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4 hover:border-rose-300 hover:shadow-md transition-all"
            >
              <div className="size-12 rounded-xl bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <span className="material-symbols-outlined text-rose-500">favorite</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Saved Creators</h3>
                <p className="text-sm text-slate-500 mt-0.5">View your shortlisted creators</p>
              </div>
            </Link>

            <Link
              href="/dashboard/messages"
              className="group bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <span className="material-symbols-outlined text-blue-500">chat</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Messages</h3>
                <p className="text-sm text-slate-500 mt-0.5">Chat with creators</p>
              </div>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white rounded-2xl border border-slate-200 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">How ReachEzy Works</h2>
          <div className="grid grid-cols-4 gap-6">
            {[
              { step: '1', icon: 'manage_search', title: 'Discover', desc: 'Search creators by niche, city, style, and more using AI-powered search' },
              { step: '2', icon: 'favorite',      title: 'Shortlist', desc: 'Save your favourite creators to your wishlist for easy comparison' },
              { step: '3', icon: 'chat',          title: 'Connect',   desc: 'Send messages directly to creators and discuss collaborations' },
              { step: '4', icon: 'handshake',     title: 'Collaborate', desc: 'Finalise deals, send briefs, and launch your campaign' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-3 size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">{icon}</span>
                </div>
                <div className="size-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center mx-auto mb-2">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
