'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setToken, getLoginUrl } from '@/lib/auth';
import { NICHES, INDUSTRIES } from '@/lib/constants';

type Role = 'brand' | 'creator';
type Mode = 'login' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [role, setRole] = useState<Role>('creator');
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Creator fields
  const [fullName, setFullName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [followersCount, setFollowersCount] = useState('');
  const [bio, setBio] = useState('');
  // Brand fields
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [contactName, setContactName] = useState('');

  useEffect(() => {
    if (searchParams.get('role') === 'brand') {
      setRole('brand');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const data = await api.login({ email, password });
        setToken(data.session_token);
        if (data.role === 'brand') {
          router.push('/brand/dashboard');
        } else {
          router.push('/dashboard');
        }
      } else {
        // Signup
        const payload: Record<string, unknown> = {
          action: 'signup' as const,
          role,
          email,
          password,
          city,
        };

        if (role === 'creator') {
          payload.full_name = fullName;
          payload.instagram_handle = instagramHandle;
          payload.niche = niche;
          payload.followers_count = parseInt(followersCount) || 0;
          payload.bio = bio;
        } else {
          payload.company_name = companyName;
          payload.industry = industry;
          payload.contact_name = contactName;
        }

        const data = await api.signup(payload as Parameters<typeof api.signup>[0]);
        setToken(data.session_token);
        if (role === 'brand') {
          router.push('/brand/dashboard');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('409')) {
        setError('Email already registered. Try logging in.');
      } else if (msg.includes('401')) {
        setError('Invalid email or password.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const data = await api.demoLogin('priyabeauty');
      setToken(data.session_token);
      router.push('/dashboard');
    } catch {
      setError('Demo login failed. Please try again.');
      setDemoLoading(false);
    }
  };

  const handleFacebookLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-purple-800 px-4 py-12">
      {/* Logo */}
      <Link href="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
          <span className="text-xl font-bold text-primary-600">R</span>
        </div>
        <span className="text-2xl font-bold text-white">ReachEzy</span>
      </Link>

      {/* Card */}
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* Role Toggle */}
        <div className="mb-6 flex rounded-lg bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => { setRole('creator'); setError(null); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              role === 'creator'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Influencer
          </button>
          <button
            type="button"
            onClick={() => { setRole('brand'); setError(null); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
              role === 'brand'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Brand
          </button>
        </div>

        <h2 className="mb-1 text-xl font-bold text-gray-900">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          {mode === 'login'
            ? `Sign in as ${role === 'brand' ? 'a brand' : 'an influencer'}`
            : `Sign up as ${role === 'brand' ? 'a brand' : 'an influencer'}`}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Signup-only fields */}
          {mode === 'signup' && role === 'creator' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="Priya Sharma"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Instagram Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
                  <input
                    type="text"
                    value={instagramHandle}
                    onChange={(e) => setInstagramHandle(e.target.value)}
                    className="input-field pl-8"
                    placeholder="priyabeauty"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {mode === 'signup' && role === 'brand' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="input-field"
                  placeholder="Nykaa"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Contact Person</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="input-field"
                  placeholder="Your name"
                />
              </div>
            </>
          )}

          {/* Email + Password (always shown) */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
              minLength={mode === 'signup' ? 6 : undefined}
              required
            />
          </div>

          {/* Signup-only extra fields */}
          {mode === 'signup' && role === 'creator' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Niche</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select your niche</option>
                  {NICHES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="input-field"
                    placeholder="Mumbai"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Followers</label>
                  <input
                    type="number"
                    value={followersCount}
                    onChange={(e) => setFollowersCount(e.target.value)}
                    className="input-field"
                    placeholder="30000"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input-field resize-none"
                  rows={2}
                  placeholder="Tell brands about yourself..."
                />
              </div>
            </>
          )}

          {mode === 'signup' && role === 'brand' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="input-field"
                  placeholder="Mumbai"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </span>
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Mode Switch */}
        <p className="mt-4 text-center text-sm text-gray-500">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                Sign In
              </button>
            </>
          )}
        </p>

        {/* Divider */}
        <div className="my-5 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">or continue with</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Facebook OAuth (influencer only) */}
        {role === 'creator' && (
          <button
            onClick={handleFacebookLogin}
            className="mb-3 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
            Sign in with Instagram
            <span className="ml-1 text-xs text-gray-400">(requires tester access)</span>
          </button>
        )}

        {/* Demo Login */}
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="btn-secondary w-full"
        >
          {demoLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400/30 border-t-gray-600" />
              Loading demo...
            </span>
          ) : (
            'Try Demo (Creator)'
          )}
        </button>
      </div>

      {/* Back link */}
      <Link
        href="/"
        className="mt-6 text-sm text-primary-200 hover:text-white"
      >
        &larr; Back to home
      </Link>
    </div>
  );
}
