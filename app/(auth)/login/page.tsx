'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { refetch } = useAuth();
  const { error: showError } = useToast();
  const [schoolId, setSchoolId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!schoolId || !password) {
      showError('School ID and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: schoolId, password }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? 'Login failed.');
        return;
      }
      await refetch();
      router.refresh();
      router.push('/dashboard');
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white font-bold shadow-lg shadow-orange-200">
            S
          </div>
          <h1 className="text-2xl font-bold text-gray-900">School portal</h1>
          <p className="mt-1.5 text-sm text-gray-500">Sign in with your school credentials.</p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              School ID
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              placeholder="e.g. SHS1234"
              value={schoolId}
              onChange={e => setSchoolId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button
          className="mt-6 w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="mt-6 flex flex-col gap-2.5 text-center text-sm">
          <Link href="/teacher-login" className="text-sky-600 hover:underline font-medium">
            Teacher portal →
          </Link>
          <Link href="/onboarding" className="text-orange-500 hover:underline font-medium">
            Register your school
          </Link>
        </div>
      </div>
    </div>
  );
}