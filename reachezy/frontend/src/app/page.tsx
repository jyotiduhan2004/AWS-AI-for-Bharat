'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { setToken } from '@/lib/auth';
import { api } from '@/lib/api';

export default function LandingPage() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const data = await api.demoLogin('priyabeauty');
      setToken(data.session_token);
      router.push('/dashboard');
    } catch (err) {
      console.error('Demo login failed:', err);
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light font-display text-slate-900 antialiased">
      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-background-light/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <span className="material-symbols-outlined text-2xl" aria-hidden="true">auto_awesome</span>
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">ReachEzy</h2>
          </div>
          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-10">
            <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#features">Features</a>
            <a className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="#how-it-works">How It Works</a>
            <Link className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors" href="/login?role=brand">For Brands</Link>
          </nav>
          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-bold text-slate-900 px-4 py-2 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              Login
            </Link>
            <Link
              href="/login"
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              {/* Left */}
              <div className="flex flex-col gap-8 lg:max-w-xl">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                  <span className="material-symbols-outlined text-sm leading-none" aria-hidden="true">trending_up</span>
                  Next-Gen Influencer Platform
                </div>

                <h1 className="text-5xl font-black leading-[1.1] tracking-tight text-slate-900 lg:text-7xl">
                  Turn Your Vibe into Your{' '}
                  <span className="text-primary">Brand.</span>
                </h1>

                <p className="text-lg leading-relaxed text-slate-600">
                  Professional media kits and AI-powered insights for India&apos;s next generation of creators.
                  Build credibility, showcase metrics, and land premium brand deals.
                </p>

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/25 hover:-translate-y-0.5 transition-all active:scale-95"
                  >
                    I&apos;m a Creator
                    <span className="material-symbols-outlined text-xl leading-none" aria-hidden="true">arrow_forward</span>
                  </Link>
                  <Link
                    href="/login?role=brand"
                    className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-8 py-4 text-base font-bold text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    I&apos;m a Brand
                  </Link>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <div className="flex -space-x-2">
                    {['/assets/avatar-1.jpg', '/assets/avatar-2.jpg', '/assets/avatar-3.jpg'].map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Creator ${i + 1}`}
                        className="h-10 w-10 rounded-full border-2 border-background-light object-cover"
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-500">Join our <strong className="text-slate-700">growing network</strong></p>
                </div>
              </div>

              {/* Right — Hero Visual Dashboard Card */}
              <div className="relative hidden lg:block">
                <div className="relative rounded-[2.5rem] bg-gradient-to-tr from-primary/20 via-purple-100/40 to-primary/5 p-6">
                  {/* Mock dashboard card */}
                  <div className="rounded-[2rem] bg-white shadow-2xl overflow-hidden border border-slate-100">
                    {/* Card header */}
                    <div className="bg-primary px-6 py-5 flex items-center justify-between">
                      <div>
                        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Media Kit</p>
                        <h3 className="text-white text-xl font-black">Priya Beauty</h3>
                        <p className="text-white/80 text-sm">Beauty & Lifestyle · Mumbai</p>
                      </div>
                      <div className="h-16 w-16 rounded-2xl overflow-hidden border border-white/30">
                        <img src="/assets/creators/priyabeauty.jpg" alt="Priya Beauty" className="h-full w-full object-cover" />
                      </div>
                    </div>
                    {/* Stats row */}
                    <div className="grid grid-cols-3 border-b border-slate-100">
                      {[
                        { label: 'Followers', value: '125K' },
                        { label: 'Engagement', value: '4.8%' },
                        { label: 'Per Reel', value: '₹8K' },
                      ].map(({ label, value }) => (
                        <div key={label} className="py-4 text-center border-r border-slate-100 last:border-0">
                          <p className="text-xl font-black text-slate-900">{value}</p>
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
                        </div>
                      ))}
                    </div>
                    {/* Engagement bar */}
                    <div className="px-6 py-5">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-semibold text-slate-700">Engagement Rate</span>
                        <span className="font-bold text-emerald-500">+12.4%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-primary" style={{ width: '74%' }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Above 74% of creators in Beauty niche</p>
                    </div>
                    {/* Style DNA tags */}
                    <div className="px-6 pb-5 flex flex-wrap gap-2">
                      {['Vibrant', 'High Energy', 'Authentic', 'Skincare'].map(tag => (
                        <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{tag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Floating rate card */}
                  <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-40">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reel Rate</p>
                    <p className="text-2xl font-black text-primary">₹8,000</p>
                    <p className="text-xs text-slate-500 mt-1">Above avg ✓</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features Grid ── */}
        <section id="features" className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-10">
            <div className="mb-16 text-center">
              <h2 className="text-4xl font-black tracking-tight text-slate-900">The Creator Magnet</h2>
              <p className="mt-4 mx-auto max-w-2xl text-lg text-slate-600">
                Stand out with professional assets designed to convert brand deals.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  img: '/assets/feature-media-kits.jpg',
                  title: 'Dynamic Media Kits',
                  desc: 'Live-updating stats from all your social platforms in one shareable link. Impress brands with real-time data accuracy.',
                },
                {
                  img: '/assets/feature-rate-cards.jpg',
                  title: 'Real-time Rate Cards',
                  desc: 'Standardized pricing based on industry benchmarks and your audience engagement. Know your worth and negotiate confidently.',
                },
                {
                  img: '/assets/feature-ai-match.jpg',
                  title: 'AI Vibe Match',
                  desc: 'Our AI matches you with brands that align with your aesthetic and values — so every collaboration feels authentic.',
                },
              ].map((f) => (
                <div key={f.title} className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-background-light p-2 transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="h-48 w-full rounded-2xl overflow-hidden mb-0">
                    <img src={f.img} alt={f.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-6">
                    <h3 className="mb-2 text-xl font-bold text-slate-900">{f.title}</h3>
                    <p className="text-slate-600 leading-relaxed text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how-it-works" className="py-24 px-6 lg:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="mb-16 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary font-bold" aria-hidden="true">temp_preferences_custom</span>
                <span className="text-sm font-black uppercase tracking-widest text-primary">How It Works</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 lg:text-5xl">
                From sign-up to brand deals in minutes
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '01', icon: 'person_add', title: 'Create Account', desc: 'Sign up as a creator and set up your profile with your niche and social handle.' },
                { step: '02', icon: 'upload', title: 'Upload Content', desc: 'Upload 1-5 of your best reels for AI analysis.' },
                { step: '03', icon: 'psychology', title: 'AI Analysis', desc: 'Groq AI analyzes your style, energy, aesthetic, and production quality.' },
                { step: '04', icon: 'description', title: 'Get Your Kit', desc: 'Share your professional media kit URL with brands and start landing deals.' },
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-primary/40 hover:shadow-lg group">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-primary/40 tracking-widest">{item.step}</span>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-3xl" aria-hidden="true">{item.icon}</span>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-slate-900">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Banner ── */}
        <section className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-8 py-20 text-center lg:py-32">
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            <div className="relative z-10 flex flex-col items-center gap-8">
              <h2 className="max-w-3xl text-4xl font-black text-white lg:text-6xl">
                Ready to elevate your content strategy?
              </h2>
              <p className="max-w-xl text-lg text-white/80">
                Join the community of creators and brands shaping the future of digital influence in India.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="rounded-xl bg-white px-10 py-4 text-lg font-bold text-primary transition-all hover:scale-105 active:scale-95 shadow-xl"
                >
                  Start Your Journey
                </Link>
                <button
                  onClick={handleDemo}
                  disabled={demoLoading}
                  className="rounded-xl border border-white/30 bg-white/10 px-10 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-50"
                >
                  {demoLoading ? 'Loading...' : 'Try Demo Account'}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                <span className="material-symbols-outlined text-lg" aria-hidden="true">auto_awesome</span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900">ReachEzy</h2>
            </div>
            <p className="text-sm text-slate-500">© 2024 ReachEzy Technologies. Built for AI for Bharat Hackathon.</p>
            <div className="flex gap-6">
              <button className="text-slate-400 hover:text-primary transition-colors p-1" aria-label="Website">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">public</span>
              </button>
              <button className="text-slate-400 hover:text-primary transition-colors p-1" aria-label="Email">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">alternate_email</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
