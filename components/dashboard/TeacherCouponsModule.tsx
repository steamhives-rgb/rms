'use client';
import { useState, useEffect, useCallback } from 'react';
import { Ticket, Copy, Trash2, Plus, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/providers/ToastProvider';
import type { TeacherCoupon } from '@/lib/types';

function StatusBadge({ coupon }: { coupon: TeacherCoupon }) {
  if (coupon.used) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
        <CheckCircle2 size={10} /> Used
      </span>
    );
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
        <AlertCircle size={10} /> Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
      <Clock size={10} /> Active
    </span>
  );
}

function CouponCard({ coupon, onDelete }: { coupon: TeacherCoupon; onDelete: (id: number) => void }) {
  const { success } = useToast();
  const [deleting, setDeleting] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(coupon.code);
    success('Code copied!');
  }

  async function handleDelete() {
    if (!confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res  = await fetch(`/api/teachers/coupons?id=${coupon.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) { alert(data.error ?? 'Failed to delete'); return; }
      onDelete(coupon.id);
    } finally { setDeleting(false); }
  }

  const isExpired = !!coupon.expires_at && new Date(coupon.expires_at) < new Date();
  const canDelete = !coupon.used;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
      coupon.used || isExpired
        ? 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 opacity-60'
        : 'border-orange-200 dark:border-orange-800/60 bg-orange-50/30 dark:bg-orange-900/10'
    }`}>
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        coupon.used ? 'bg-gray-200 dark:bg-gray-700' : 'bg-orange-100 dark:bg-orange-900/30'
      }`}>
        <Ticket size={15} className={coupon.used ? 'text-gray-400' : 'text-orange-500'} />
      </div>

      {/* Code + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold tracking-wider text-gray-900 dark:text-gray-100">{coupon.code}</span>
          <StatusBadge coupon={coupon} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {coupon.label && (
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">"{coupon.label}"</span>
          )}
          {coupon.used_by_name && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Used by <strong>{coupon.used_by_name}</strong>
            </span>
          )}
          {coupon.expires_at && !coupon.used && (
            <span className={`text-[10px] ${isExpired ? 'text-red-500' : 'text-gray-400'}`}>
              {isExpired ? 'Expired' : 'Expires'} {new Date(coupon.expires_at).toLocaleDateString()}
            </span>
          )}
          <span className="text-[10px] text-gray-300 dark:text-gray-600">
            {new Date(coupon.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {!coupon.used && (
          <button onClick={copy} title="Copy code"
            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
            <Copy size={13} />
          </button>
        )}
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting} title="Delete coupon"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function TeacherCouponsModule() {
  const { success, error: showError } = useToast();
  const [coupons,     setCoupons]     = useState<TeacherCoupon[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [generating,  setGenerating]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [filter,      setFilter]      = useState<'all' | 'active' | 'used'>('all');

  // Generate form state
  const [genLabel,    setGenLabel]    = useState('');
  const [genQty,      setGenQty]      = useState(1);
  const [genExpiry,   setGenExpiry]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/teachers/coupons');
      const data = await res.json();
      if (data.success) setCoupons(data.coupons ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res  = await fetch('/api/teachers/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qty:        genQty,
          label:      genLabel || null,
          expires_at: genExpiry || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to generate.'); return; }
      success(`${(data.coupons ?? []).length} coupon${genQty > 1 ? 's' : ''} generated!`);
      setShowForm(false);
      setGenLabel(''); setGenQty(1); setGenExpiry('');
      await load();
    } catch { showError('Network error.'); }
    finally { setGenerating(false); }
  }

  function handleDelete(id: number) {
    setCoupons(prev => prev.filter(c => c.id !== id));
  }

  function copyAll() {
    const active = coupons.filter(c => !c.used);
    if (!active.length) { showError('No active coupons to copy.'); return; }
    navigator.clipboard?.writeText(active.map(c => c.code).join('\n'));
    success(`${active.length} code${active.length > 1 ? 's' : ''} copied!`);
  }

  const now = new Date();
  const filtered = coupons.filter(c => {
    if (filter === 'active') return !c.used && (!c.expires_at || new Date(c.expires_at) >= now);
    if (filter === 'used')   return c.used;
    return true;
  });

  const activeCount = coupons.filter(c => !c.used && (!c.expires_at || new Date(c.expires_at) >= now)).length;
  const usedCount   = coupons.filter(c => c.used).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Ticket size={20} className="text-orange-500" /> Teacher Coupons
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Generate single-use codes for teacher self-registration. Share a code with a new teacher so they can register themselves.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Refresh"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {activeCount > 0 && (
            <Button size="sm" variant="outline" onClick={copyAll}>
              <Copy size={13} /> Copy all active
            </Button>
          )}
          <Button size="sm" onClick={() => setShowForm(v => !v)}>
            <Plus size={14} /> Generate
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total',  value: coupons.length,  color: 'text-gray-700 dark:text-gray-300' },
          { label: 'Active', value: activeCount,      color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Used',   value: usedCount,        color: 'text-gray-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-4 py-3 text-center border border-gray-100 dark:border-gray-800">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Generate form */}
      {showForm && (
        <div className="border border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-900/10 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Generate Teacher Coupon(s)</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input
                label="Label (optional)"
                placeholder='e.g. "For Mrs. Adebayo" or "Biology dept hire"'
                value={genLabel}
                onChange={e => setGenLabel(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Quantity</label>
              <input
                type="number" min={1} max={20} value={genQty}
                onChange={e => setGenQty(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">Max 20 at once</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Expiry date <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="date"
                value={genExpiry}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setGenExpiry(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          {genQty > 1 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              ℹ️ When generating multiple coupons, the label is not applied (each code is standalone).
            </p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            <Button size="sm" onClick={handleGenerate} loading={generating} className="flex-1">
              Generate {genQty > 1 ? `${genQty} Coupons` : 'Coupon'}
            </Button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {coupons.length > 0 && (
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
          {(['all', 'active', 'used'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Coupon list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center mb-4">
            <Ticket size={28} className="text-orange-300 dark:text-orange-700" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {filter === 'all' ? 'No coupons yet' : `No ${filter} coupons`}
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs">
            {filter === 'all'
              ? 'Generate coupon codes to share with new teachers so they can register themselves.'
              : `Switch to "All" to see other coupons.`}
          </p>
          {filter === 'all' && (
            <Button size="sm" className="mt-4" onClick={() => setShowForm(true)}>
              <Plus size={13} /> Generate first coupon
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(coupon => (
            <CouponCard key={coupon.id} coupon={coupon} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
