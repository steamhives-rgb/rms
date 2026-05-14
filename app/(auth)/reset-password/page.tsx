'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const { success, error: showError } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleReset() {
    if (!token) {
      showError('Invalid or missing reset token.');
      return;
    }
    if (password.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      showError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/password-reset', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? 'Failed to reset password.');
        return;
      }
      success('Password reset! Redirecting to login…');
      setDone(true);
      setTimeout(() => router.push('/login'), 2000);
    } catch {
      showError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/10 backdrop-blur-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white">🔑</div>
          <h1 className="text-3xl font-semibold text-white">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-300">Enter a new password for your account.</p>
        </div>

        {done ? (
          <div className="rounded-2xl bg-emerald-500/10 p-5 text-center text-emerald-200">
            Password reset successfully! Redirecting to login…
          </div>
        ) : !token ? (
          <div className="rounded-2xl bg-red-500/10 p-5 text-center text-red-200">
            Invalid reset link. Please request a new password reset.
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleReset()}
            />
            <Button className="w-full" onClick={handleReset} loading={loading}>
              Reset Password
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-300">Loading…</div>}>
      <ResetForm />
    </Suspense>
  );
}
