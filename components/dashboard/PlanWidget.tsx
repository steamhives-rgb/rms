'use client';
// Plan status widget — shows current plan, student quota, upgrade coupon input
import { useState, useEffect } from 'react';
import { Zap, Users, ChevronRight, Tag, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  students: number;
  student_limit: number | null;
  plan_label: string;
}

const PLAN_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  free:       { bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-700 dark:text-gray-300',   bar: 'bg-gray-400' },
  starter:    { bg: 'bg-blue-50 dark:bg-blue-900/20',     text: 'text-blue-700 dark:text-blue-300',   bar: 'bg-blue-500' },
  basic:      { bg: 'bg-green-50 dark:bg-green-900/20',   text: 'text-green-700 dark:text-green-300', bar: 'bg-green-500' },
  standard:   { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', bar: 'bg-purple-500' },
  premium:    { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', bar: 'bg-orange-500' },
  unlimited:  { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-yellow-500' },
};

function getPlanColor(plan: string) {
  const key = plan.toLowerCase();
  return PLAN_COLORS[key] ?? PLAN_COLORS['starter'];
}

export default function PlanWidget() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [coupon,  setCoupon]  = useState('');
  const [status,  setStatus]  = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [newPlan, setNewPlan] = useState('');

  useEffect(() => {
    fetch('/api/schools/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats); })
      .catch(() => {});
  }, []);

  const limit    = stats?.student_limit ?? null;
  const count    = stats?.students ?? 0;
  const plan     = stats?.plan_label ?? 'free';
  const pct      = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const remaining = limit ? Math.max(0, limit - count) : null;
  const planC    = getPlanColor(plan);
  const nearLimit = limit ? pct >= 85 : false;
  const atLimit   = limit ? count >= limit : false;

  async function handleUpgrade() {
    const code = coupon.trim().toUpperCase();
    if (!code) return;
    setStatus('verifying');
    setMessage('');
    try {
      // First verify
      const vRes = await fetch(`/api/schools/coupon?code=${code}`);
      const vData = await vRes.json();
      if (!vData.success) { setStatus('error'); setMessage(vData.error ?? 'Invalid coupon.'); return; }

      // Then apply
      const uRes = await fetch('/api/schools/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: code }),
      });
      const uData = await uRes.json();
      if (!uData.success) { setStatus('error'); setMessage(uData.error ?? 'Failed to upgrade.'); return; }

      setStatus('success');
      setNewPlan(uData.plan_label ?? 'upgraded');
      setMessage(`Plan upgraded to ${uData.plan_label}!`);
      setCoupon('');
      // Refresh stats
      fetch('/api/schools/stats').then(r => r.json()).then(d => { if (d.success) setStats(d.stats); });
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (!stats) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 animate-pulse h-44" />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${planC.bg}`}>
        <div className="flex items-center gap-2">
          <Zap size={15} className={planC.text} />
          <span className={`text-sm font-bold uppercase tracking-wide ${planC.text}`}>{plan} Plan</span>
        </div>
        <Link href="/dashboard?tab=settings" className="text-xs text-gray-500 hover:text-orange-500 flex items-center gap-0.5 transition-colors">
          Manage <ChevronRight size={12} />
        </Link>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Students registered */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
              <Users size={13} className="text-gray-400" />
              <span className="font-medium">{count}</span>
              <span className="text-gray-400">{limit ? `/ ${limit} students` : 'students registered'}</span>
            </div>
            {limit && (
              <span className={`text-xs font-semibold ${atLimit ? 'text-red-500' : nearLimit ? 'text-yellow-600' : 'text-gray-400'}`}>
                {atLimit ? 'Limit reached' : `${remaining} left`}
              </span>
            )}
          </div>

          {/* Progress bar */}
          {limit && (
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  atLimit ? 'bg-red-500' : nearLimit ? 'bg-yellow-500' : planC.bar
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}

          {/* Warning */}
          {atLimit && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertTriangle size={11} />
              You've reached your student limit. Upgrade to add more.
            </div>
          )}
          {nearLimit && !atLimit && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertTriangle size={11} />
              Approaching limit — consider upgrading soon.
            </div>
          )}
        </div>

        {/* Upgrade coupon */}
        {status !== 'success' && (
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Tag size={10} /> Upgrade with coupon
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={coupon}
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setStatus('idle'); setMessage(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUpgrade()}
                placeholder="Enter coupon code"
                className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2.5 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-orange-400 font-mono uppercase"
              />
              <button
                onClick={handleUpgrade}
                disabled={!coupon.trim() || status === 'verifying'}
                className="px-3 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors shrink-0"
              >
                {status === 'verifying' ? '...' : 'Apply'}
              </button>
            </div>
            {status === 'error' && (
              <p className="text-xs text-red-500 mt-1.5">{message}</p>
            )}
          </div>
        )}

        {/* Success state */}
        {status === 'success' && (
          <div className="pt-1 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 size={15} />
            <span className="font-medium">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}