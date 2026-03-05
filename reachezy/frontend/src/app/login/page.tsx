'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { NICHES, INDUSTRIES } from '@/lib/constants';

type Role = 'brand' | 'creator';
type Mode = 'login' | 'signup';

interface DemoCreator {
  username: string;
  display_name: string;
  niche: string;
  city: string;
  followers_count: number;
  tier: string;
  emoji: string;
  avatar_url?: string;
  bio: string;
}

interface DemoBrand {
  company_name: string;
  industry: string;
  contact_name: string;
  email: string;
  emoji: string;
  avatar_url?: string;
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<Role>('creator');
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoCreators, setDemoCreators] = useState<DemoCreator[]>([]);
  const [demoBrands, setDemoBrands] = useState<DemoBrand[]>([]);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [followersCount, setFollowersCount] = useState('');
  const [bio, setBio] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactName, setContactName] = useState('');

  useEffect(() => {
    if (searchParams.get('role') === 'brand') setRole('brand');
  }, [searchParams]);

  const openDemoModal = async () => {
    setShowDemoModal(true);
    if (role === 'brand') {
      if (demoBrands.length === 0) {
        try {
          const res = await fetch('/api/auth/demo-brands');
          if (res.ok) {
            const data = await res.json();
            setDemoBrands(data.brands || []);
          }
        } catch { /* ignore */ }
      }
    } else {
      if (demoCreators.length === 0) {
        try {
          const res = await fetch('/api/auth/demo-creators');
          if (res.ok) {
            const data = await res.json();
            setDemoCreators(data.creators || []);
          }
        } catch { /* ignore */ }
      }
    }
  };

  const handleDemoLogin = async (username: string) => {
    setDemoLoading(username);
    try {
      const data = await api.demoLogin(username);
      setToken(data.session_token);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
      setDemoLoading(null);
    }
  };

  const handleDemoBrandLogin = async (companyName: string) => {
    setDemoLoading(companyName);
    try {
      const data = await api.demoBrandLogin(companyName);
      setToken(data.session_token);
      router.push('/brand/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
      setDemoLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        const data = await api.login({ email, password });
        setToken(data.session_token);
        router.push(data.role === 'brand' ? '/brand/dashboard' : '/dashboard');
      } else {
        const payload =
          role === 'creator'
            ? { action: 'signup' as const, email, password, full_name: fullName, instagram_handle: instagramHandle, niche, city, followers_count: parseInt(followersCount) || 0, bio, role: 'creator' as const }
            : { action: 'signup' as const, email, password, full_name: contactName, company_name: companyName, industry, role: 'brand' as const };
        const data = await api.signup(payload);
        setToken(data.session_token);
        router.push(role === 'creator' ? '/onboarding' : '/brand/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-background-light font-display">
      {/* Navigation */}
      <header className="flex items-center justify-between border-b border-primary/10 px-6 md:px-20 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3 text-primary">
          <div className="size-8">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fill="currentColor" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-slate-900 text-xl font-bold tracking-tight">ReachEzy</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-sm text-slate-500">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          </span>
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="flex cursor-pointer items-center justify-center rounded-lg h-10 px-5 border border-primary text-primary hover:bg-primary/5 text-sm font-bold transition-colors"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-10">
        {/* Main Card */}
        <div className="w-full max-w-[640px] bg-white rounded-xl shadow-2xl shadow-primary/5 border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <h1 className="text-3xl font-black text-slate-900 mb-2">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="text-slate-500">
              {mode === 'login' ? 'Sign in to your account' : 'Join the premier creator-brand marketplace'}
            </p>
          </div>

          {/* Role Toggle */}
            <div className="px-8 pb-6">
              <div className="flex h-12 w-full items-center justify-center rounded-xl bg-background-light p-1.5">
                {(['creator', 'brand'] as Role[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex cursor-pointer h-full grow items-center justify-center rounded-lg px-4 transition-all text-sm font-semibold gap-2 ${
                      role === r
                        ? 'bg-white shadow-sm text-primary'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {r === 'creator' ? 'person' : 'corporate_fare'}
                    </span>
                    {r === 'creator' ? 'Creator' : 'Brand'}
                  </button>
                ))}
              </div>
            </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {mode === 'login' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="you@example.com" className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" className="input-field" />
                </div>
              </>
            ) : role === 'creator' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Priya Sharma" className="input-field" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">Social Handle</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} required placeholder="priyabeauty" className="input-field pl-8" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">Content Niche</label>
                    <select value={niche} onChange={e => setNiche(e.target.value)} className="input-field">
                      <option value="">Select niche...</option>
                      {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai, India" className="input-field" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="priya@example.com" className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" className="input-field" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">Company Name</label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)} required placeholder="Acme Corp" className="input-field" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-slate-700 text-sm font-medium">Industry</label>
                    <select value={industry} onChange={e => setIndustry(e.target.value)} className="input-field">
                      <option value="">Select industry...</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Email Address</label>
                  <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="contact@company.com" className="input-field" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-700 text-sm font-medium">Password</label>
                  <input value={password} onChange={e => setPassword(e.target.value)} type="password" required placeholder="••••••••" className="input-field" />
                </div>
              </>
            )}

            {/* Actions */}
            <div className="pt-4 flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Processing...</>
                ) : mode === 'login' ? (
                  <><span>Sign In</span><span className="material-symbols-outlined">arrow_forward</span></>
                ) : (
                  <><span>{role === 'creator' ? 'Create Creator Account' : 'Create Brand Account'}</span><span className="material-symbols-outlined">arrow_forward</span></>
                )}
              </button>

              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <button
                type="button"
                onClick={openDemoModal}
                className="group w-full h-14 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-all border border-primary/20 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_circle</span>
                Try Demo Account
                <span className="text-sm font-normal opacity-70 group-hover:opacity-100 transition-opacity">— pick a {role === 'brand' ? 'brand' : 'creator'}</span>
              </button>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
              By continuing, you agree to our{' '}
              <a className="underline text-primary/80" href="#">Terms of Service</a> and{' '}
              <a className="underline text-primary/80" href="#">Privacy Policy</a>.
            </p>
          </form>
        </div>

        {/* Trust badges */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-[960px] w-full px-4">
          {[
            { icon: 'verified_user', title: 'Verified Brands', desc: 'Work with 500+ top tier global brands directly.' },
            { icon: 'payments', title: 'Secure Escrow', desc: 'Get paid instantly once your content is approved.' },
            { icon: 'trending_up', title: 'Growth Tools', desc: 'Advanced analytics to track your campaign reach.' },
          ].map(b => (
            <div key={b.title} className="flex flex-col items-center text-center">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                <span className="material-symbols-outlined">{b.icon}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1">{b.title}</h3>
              <p className="text-sm text-slate-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-10 text-center border-t border-slate-100">
        <p className="text-sm text-slate-400">© 2024 ReachEzy. All rights reserved.</p>
      </footer>

      {/* Demo Creator Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {role === 'brand' ? 'Choose a Demo Brand' : 'Choose a Demo Creator'}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {role === 'brand' ? 'Explore ReachEzy as a sample brand' : 'Explore ReachEzy as a sample creator'}
                  </p>
                </div>
                <button onClick={() => setShowDemoModal(false)} className="rounded-full p-2 hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-slate-400">close</span>
                </button>
              </div>

              <div className="space-y-3">
                {role === 'brand' ? (
                  demoBrands.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  ) : (
                    demoBrands.map((b) => (
                      <button
                        key={b.company_name}
                        onClick={() => handleDemoBrandLogin(b.company_name)}
                        disabled={!!demoLoading}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                      >
                        <div className={`h-12 w-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${b.avatar_url ? 'bg-white border border-slate-200' : 'border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5'}`}>
                          {b.avatar_url ? (
                            <img src={b.avatar_url} alt={b.company_name} className="h-full w-full object-contain p-1.5" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-2xl">{b.emoji}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{b.company_name}</span>
                            <span className="badge-primary">{b.industry}</span>
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            {b.contact_name} · {b.email}
                          </p>
                        </div>
                        {demoLoading === b.company_name ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary flex-shrink-0" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-300 flex-shrink-0">arrow_forward_ios</span>
                        )}
                      </button>
                    ))
                  )
                ) : (
                  demoCreators.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    </div>
                  ) : (
                    demoCreators.map((c) => (
                      <button
                        key={c.username}
                        onClick={() => handleDemoLogin(c.username)}
                        disabled={!!demoLoading}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-primary/40 hover:bg-primary/5 transition-all text-left disabled:opacity-50"
                      >
                        <div className="h-12 w-12 rounded-full overflow-hidden flex-shrink-0 border border-primary/10 bg-gradient-to-br from-primary/20 to-primary/5">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt={c.display_name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-2xl">{c.emoji}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{c.display_name}</span>
                            <span className="badge-primary">{c.tier} Creator</span>
                          </div>
                          <p className="text-sm text-slate-500 truncate">
                            @{c.username} · {c.niche} · {c.city}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatFollowers(c.followers_count)} followers</p>
                        </div>
                        {demoLoading === c.username ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary flex-shrink-0" />
                        ) : (
                          <span className="material-symbols-outlined text-slate-300 flex-shrink-0">arrow_forward_ios</span>
                        )}
                      </button>
                    ))
                  )
                )}
              </div>

              <p className="text-center text-xs text-slate-400 mt-6">
                Demo accounts have pre-loaded content and analysis data.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
