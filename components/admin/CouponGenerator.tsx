'use client';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import type { DevCoupon } from './AdminPanel';

interface Props {
  coupons: DevCoupon[];
  onRefresh: () => void;
}

interface GeneratedCoupon {
  code: string;
  type: string;
  planLabel: string;
  studentLimit: number | null;
}

const TYPE_MAP: Record<string, string> = {
  '100':       '100-students',
  '200':       '200-students',
  'unlimited': 'unlimited',
};

export default function CouponGenerator({ coupons, onRefresh }: Props) {
  const { success: showSuccess, error: showError } = useToast();
  const [type,      setType]     = useState('unlimited');
  const [qty,       setQty]      = useState(1);
  const [loading,   setLoading]  = useState(false);
  const [generated, setGenerated] = useState<GeneratedCoupon[]>([]);

  const totalCoupons = coupons.length;
  const usedCoupons  = coupons.filter(c => c.used).length;

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: TYPE_MAP[type] ?? 'unlimited', qty: Math.max(1, Math.min(100, qty)) }),
      });
      const json = await res.json();
      if (!json.success) { showError(json.error ?? 'Generation failed'); return; }
      setGenerated(json.coupons ?? []);
      showSuccess(`${(json.coupons ?? []).length} coupon(s) generated!`);
      onRefresh();
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  function copyAll() {
    const codes = generated.map(c => c.code).join('\n');
    navigator.clipboard?.writeText(codes);
    showSuccess('All codes copied!');
  }

  function downloadCSV() {
    if (!generated.length) { showError('No coupons to download.'); return; }
    const rows = [
      ['Code', 'Type', 'Plan', 'Student Limit'],
      ...generated.map(c => [c.code, c.planLabel, c.studentLimit ?? 'Unlimited']),
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `coupons-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Generate */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 mb-4">✨ Generate New Coupons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Plan Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
            >
              <option value="100">100 Students</option>
              <option value="200">200 Students</option>
              <option value="unlimited">Unlimited Students</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5 font-semibold uppercase tracking-wide">Quantity (1–100)</label>
            <input
              type="number" min={1} max={100} value={qty}
              onChange={e => setQty(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
        <Button loading={loading} onClick={handleGenerate}>✨ Generate Coupons</Button>

        {/* Generated codes */}
        {generated.length > 0 && (
          <div className="mt-5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3">
              ✅ {generated.length} coupon(s) generated — {generated[0]?.planLabel}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
              {generated.map(c => (
                <div key={c.code} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <code className="text-xs font-mono text-gray-700 dark:text-gray-200">{c.code}</code>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(c.code); showSuccess('Copied!'); }}
                    className="text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 ml-2 text-sm transition-colors"
                  >📋</button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={copyAll}>📋 Copy All</Button>
              <Button size="sm" variant="outline" onClick={downloadCSV}>⬇️ Download CSV</Button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="🎫" value={totalCoupons}              label="Total Generated" accent="bg-emerald-500" />
        <StatCard icon="✅" value={usedCoupons}               label="Used"            accent="bg-blue-500"    />
        <StatCard icon="🟡" value={totalCoupons - usedCoupons} label="Available"      accent="bg-amber-500"   />
      </div>

      {/* All coupons table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <h2 className="font-bold text-gray-900 dark:text-gray-100">📋 All Coupons</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-bold uppercase tracking-wide">Code</th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-bold uppercase tracking-wide">Type</th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-bold uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-bold uppercase tracking-wide">Used By</th>
                <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-bold uppercase tracking-wide">Generated</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">No coupons yet</td></tr>
              ) : coupons.map(c => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-700 dark:text-gray-200">{c.code}</code>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(c.code); }}
                        className="text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 text-xs transition-colors"
                      >📋</button>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{c.plan_label || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      c.used
                        ? 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                        : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    }`}>{c.used ? 'Used' : 'Available'}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{c.used_by_name || '—'}</td>
                  <td className="px-4 py-2.5 text-[11px] text-gray-400 dark:text-gray-500">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, accent }: { icon: string; value: number; label: string; accent: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 relative overflow-hidden shadow-sm">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-2xl font-black text-gray-900 dark:text-gray-100 font-mono">{value}</div>
      <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{label}</div>
    </div>
  );
}