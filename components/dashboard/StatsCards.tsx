// StatsCards dashboard component

'use client';
import { useEffect, useState } from 'react';
import { Users, BarChart2, BookOpen, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/ui-utils';
import type { DashboardStats } from '@/lib/types';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}

function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/schools/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.stats); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const limit    = stats?.student_limit ?? null;
  const count    = stats?.students ?? 0;
  const plan     = stats?.plan_label ?? 'free';
  const pct      = limit ? Math.min(100, Math.round((count / limit) * 100)) : 0;
  const atLimit  = limit ? count >= limit : false;
  const nearLimit = limit ? pct >= 85 : false;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Student quota card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col gap-3 col-span-2 lg:col-span-1">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <Users size={22} className="text-orange-600" />
          </div>
          <div className="min-w-0">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Students</p>
          </div>
        </div>
        {limit ? (
          <>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={atLimit ? 'text-red-600 font-semibold' : nearLimit ? 'text-orange-600 font-semibold' : 'text-gray-500'}>
                  {count} / {limit} registered
                </span>
                <span className="text-gray-400">{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', atLimit ? 'bg-red-500' : nearLimit ? 'bg-orange-500' : 'bg-green-500')}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <a
              href="?tab=settings"
              className="flex items-center justify-center gap-1.5 text-xs font-semibold text-orange-600 border border-orange-300 dark:border-orange-700 rounded-lg py-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
            >
              <Zap size={12} /> Upgrade Plan
            </a>
          </>
        ) : (
          <span className="text-xs text-green-600 font-semibold capitalize">{plan} · Unlimited</span>
        )}
      </div>

      <StatCard
        icon={<BarChart2 size={22} className="text-blue-600" />}
        label="Results"
        value={stats?.results ?? 0}
        sub="uploaded this term"
        color="bg-blue-100 dark:bg-blue-900/30"
      />
      <StatCard
        icon={<BookOpen size={22} className="text-purple-600" />}
        label="Classes"
        value={stats?.classes ?? 0}
        sub="active classes"
        color="bg-purple-100 dark:bg-purple-900/30"
      />
      <StatCard
        icon={<TrendingUp size={22} className="text-green-600" />}
        label="School Avg"
        value={stats?.school_avg ? `${stats.school_avg.toFixed(1)}%` : '—'}
        sub="current term"
        color="bg-green-100 dark:bg-green-900/30"
      />
    </div>
  );
}