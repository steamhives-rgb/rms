'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export default function TeacherLoginPage() {
  const router = useRouter();
  const { error: showError } = useToast();
  const { refetch } = useAuth();
  const [identifier, setIdentifier] = useState(''); // email OR employee ID
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!identifier || !password) {
      showError('Employee ID and password are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/teacher-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: identifier, password }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? 'Login failed.');
        return;
      }
      // Refetch auth so AuthProvider has is_teacher=true before the teacher
      // layout mounts — without this it sees the old (unauthenticated) state
      // and immediately redirects back to /teacher-login.
      await refetch();
      router.push('/teacher');
    } catch {
      showError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition";

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white font-bold shadow-lg shadow-sky-100">
            T
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Teacher Portal</h1>
          <p className="mt-1.5 text-sm text-gray-500">Sign in with your Employee ID or email.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Employee ID or Email
            </label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. SHS/TCH01 or teacher@school.com"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <p className="mt-1 text-[11px] text-gray-400">You can use either your Employee ID or email address.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              className={inputCls}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </div>

        <button
          className="mt-6 w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white shadow-md shadow-sky-100 transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="mt-6 flex flex-col gap-2.5 text-center text-sm">
          <Link href="/login" className="text-orange-500 hover:underline font-medium">
            Admin login →
          </Link>
          <Link href="/register" className="text-sky-500 hover:underline font-medium">
            Don't have an account? Register with coupon →
          </Link>
          <span className="text-gray-400 text-xs">Forgot password? Contact your school admin.</span>
        </div>
      </div>
    </div>
  );
}