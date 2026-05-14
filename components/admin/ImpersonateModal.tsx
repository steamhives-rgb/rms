'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/providers/ToastProvider';
import type { DevSchool } from './AdminPanel';

interface Props {
  school: DevSchool;
  onClose: () => void;
}

export default function ImpersonateModal({ school, onClose }: Props) {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  // Fix #4: require dev username + password before impersonating
  const [devUser, setDevUser]   = useState('');
  const [devPass, setDevPass]   = useState('');

  async function handleImpersonate() {
    if (!devUser.trim()) { showError('Enter your developer username.'); return; }
    if (!devPass.trim()) { showError('Enter your developer password.'); return; }

    setLoading(true);
    try {
      // Step 1: re-verify dev credentials before granting impersonation
      const authRes = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: devUser, key: devPass }),
      });
      const authJson = await authRes.json();
      if (!authJson.success) {
        showError(authJson.error ?? 'Invalid developer credentials.');
        return;
      }

      // Step 2: create school impersonation session
      const res = await fetch('/api/dev/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'impersonate', school_id: school.id }),
      });
      const json = await res.json();
      if (!json.success) { showError(json.error ?? 'Failed to impersonate'); return; }
      window.location.href = '/dashboard';
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">🔑</div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Login As School</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            You will be redirected to the dashboard as{' '}
            <span className="text-orange-500 dark:text-orange-400 font-medium">"{school.name}"</span>
          </p>
        </div>

        {/* School info */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-5 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-500">School ID</span>
            <code className="text-gray-700 dark:text-gray-300 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{school.id}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-500">Plan</span>
            <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">{school.plan_label}</span>
          </div>
          {school.student_limit != null && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-500">Student Limit</span>
              <span className="text-gray-700 dark:text-gray-300 text-xs">{school.student_limit}</span>
            </div>
          )}
        </div>

        {/* Fix #4: Dev credential re-authentication */}
        <div className="space-y-3 mb-5">
          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Confirm Developer Identity
          </p>
          <Input
            label="Developer Username"
            placeholder="dev username"
            value={devUser}
            onChange={e => setDevUser(e.target.value)}
            autoComplete="username"
          />
          <Input
            label="Developer Password / Key"
            type="password"
            placeholder="••••••••"
            value={devPass}
            onChange={e => setDevPass(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-500 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg px-3 py-2 mb-5">
          ⚠️ This will replace your current session. Use dev-logout to return to the admin panel.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button className="flex-1" loading={loading} onClick={handleImpersonate}>
            Confirm & Login →
          </Button>
        </div>
      </div>
    </div>
  );
}
