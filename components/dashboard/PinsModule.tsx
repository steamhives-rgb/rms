'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  KeyRound, Plus, Ban, Copy, Search, RefreshCw,
  CheckCircle2, Clock, AlertCircle, Users, X,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import type { Pin, PinResultType, PinDuration } from '@/lib/types';

// ── helpers ──────────────────────────────────────────────────────

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtDate(ts: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pinStatus(pin: Pin): 'active' | 'used' | 'revoked' | 'expired' {
  if (pin.revoked) return 'revoked';
  if (pin.used) return 'used';
  if (pin.expires_at && new Date(pin.expires_at) < new Date()) return 'expired';
  return 'active';
}

const STATUS_CONFIG = {
  active:  { label: 'Active',   icon: Clock,         cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
  used:    { label: 'Used',     icon: CheckCircle2,  cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' },
  revoked: { label: 'Revoked',  icon: Ban,           cls: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' },
  expired: { label: 'Expired',  icon: AlertCircle,   cls: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
};

const RESULT_TYPE_LABELS: Record<PinResultType, string> = {
  full:    'Full Term',
  midterm: 'Mid-Term',
  both:    'Both',
};

const DURATION_LABELS: Record<PinDuration, string> = {
  session: 'Session (~9 months)',
  term:    'Term (~4 months)',
};

// ── StatusBadge ──────────────────────────────────────────────────

function StatusBadge({ pin }: { pin: Pin }) {
  const s = pinStatus(pin);
  const { label, icon: Icon, cls } = STATUS_CONFIG[s];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      <Icon size={9} /> {label}
    </span>
  );
}

// ── PinCard ──────────────────────────────────────────────────────

function PinCard({ pin, onRevoke }: { pin: Pin; onRevoke: (id: number) => void }) {
  const { success } = useToast();
  const [revoking, setRevoking] = useState(false);
  const status = pinStatus(pin);
  const isActive = status === 'active';
  const dimmed = !isActive;

  function copy() {
    navigator.clipboard?.writeText(pin.pin);
    success('PIN copied to clipboard!');
  }

  async function handleRevoke() {
    if (!confirm(`Revoke PIN ${pin.pin}? The student will no longer be able to use it.`)) return;
    setRevoking(true);
    try {
      const res = await fetch('/api/results/pins', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pin.id }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error ?? 'Failed to revoke.'); return; }
      onRevoke(pin.id);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all ${
      isActive
        ? 'border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-900/10'
        : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
    } ${dimmed ? 'opacity-60' : ''}`}>

      {/* Icon */}
      <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isActive ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-gray-200 dark:bg-gray-700'
      }`}>
        <KeyRound size={14} className={isActive ? 'text-orange-500' : 'text-gray-400'} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* PIN + status */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-sm font-bold tracking-widest text-gray-900 dark:text-gray-100">
            {pin.pin}
          </span>
          <StatusBadge pin={pin} />
        </div>

        {/* Student */}
        {pin.student_name && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 truncate">
            <span className="font-medium">{pin.student_name}</span>
            {pin.student_adm && <span className="text-gray-400 ml-1">· {pin.student_adm}</span>}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-gray-400 dark:text-gray-500">
          <span>{RESULT_TYPE_LABELS[pin.result_type]}</span>
          <span>·</span>
          <span>Expires {fmtDate(pin.expires_at)}</span>
          {pin.used && pin.used_at && (
            <>
              <span>·</span>
              <span>Used {relativeTime(pin.used_at)}</span>
            </>
          )}
          <span>·</span>
          <span>Created {relativeTime(pin.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {isActive && (
          <button
            onClick={copy}
            title="Copy PIN"
            className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
          >
            <Copy size={13} />
          </button>
        )}
        {isActive && (
          <button
            onClick={handleRevoke}
            disabled={revoking}
            title="Revoke PIN"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
          >
            {revoking ? <Spinner size="sm" /> : <Ban size={13} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── GeneratePinModal ─────────────────────────────────────────────

interface GeneratePinModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated: (pin: Pin) => void;
}

function GeneratePinModal({ open, onClose, onGenerated }: GeneratePinModalProps) {
  const { success, error: showError } = useToast();
  const [search, setSearch]           = useState('');
  const [students, setStudents]       = useState<{ id: string; name: string; adm: string; class: string }[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedId, setSelectedId]   = useState('');
  const [resultType, setResultType]   = useState<PinResultType>('both');
  const [duration, setDuration]       = useState<PinDuration>('session');
  const [generating, setGenerating]   = useState(false);
  const [newPin, setNewPin]           = useState<{ pin: string; student_name: string } | null>(null);

  // Fetch students on search change
  const fetchStudents = useCallback(async (q: string) => {
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      const res = await fetch(`/api/students?${params}&limit=30`);
      const d   = await res.json();
      if (d.success) setStudents(d.students ?? []);
    } catch {}
    setLoadingStudents(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchStudents(search);
  }, [open, search, fetchStudents]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelectedId('');
      setResultType('both');
      setDuration('session');
      setNewPin(null);
      setSearch('');
    }
  }, [open]);

  async function handleGenerate() {
    if (!selectedId) { showError('Please select a student.'); return; }
    setGenerating(true);
    try {
      const res = await fetch('/api/results/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedId, resultType, duration }),
      });
      const d = await res.json();
      if (!d.success) { showError(d.error ?? 'Failed to generate PIN.'); return; }
      setNewPin({ pin: d.pin, student_name: d.student_name });
      success(`PIN generated for ${d.student_name}!`);
      onGenerated({ ...d, student_id: selectedId, used: false, revoked: false, id: Date.now() } as Pin);
    } catch {
      showError('Network error. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  function copyPin() {
    if (!newPin) return;
    navigator.clipboard?.writeText(newPin.pin);
    success('PIN copied!');
  }

  const selected = students.find(s => s.id === selectedId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Generate Result PIN"
      subtitle="Create a PIN for a student to access their result online."
      size="md"
      footer={
        newPin ? (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={copyPin} icon={<Copy size={13} />}>Copy PIN</Button>
            <Button size="sm" onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              loading={generating}
              disabled={!selectedId}
              icon={<KeyRound size={13} />}
            >
              Generate PIN
            </Button>
          </div>
        )
      }
    >
      {newPin ? (
        // ── Success state ─────────────────────────────────────
        <div className="text-center py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">PIN generated for</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100 mt-0.5">{newPin.student_name}</p>
          </div>
          <div
            className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            onClick={copyPin}
          >
            <span className="font-mono text-2xl font-bold tracking-[0.25em] text-orange-600 dark:text-orange-400">
              {newPin.pin}
            </span>
            <Copy size={16} className="text-orange-400" />
          </div>
          <p className="text-xs text-gray-400">Click the PIN to copy it. Share it with the student/parent.</p>
        </div>
      ) : (
        // ── Form ─────────────────────────────────────────────
        <div className="space-y-4">
          {/* Student search */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
              Student *
            </label>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 transition placeholder-gray-400"
                placeholder="Search by name or admission no…"
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedId(''); }}
              />
            </div>

            {/* Student list */}
            <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {loadingStudents ? (
                <div className="flex justify-center py-6"><Spinner /></div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-gray-400 text-sm gap-1">
                  <Users size={20} className="opacity-40" />
                  No students found
                </div>
              ) : (
                students.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/10 ${
                      selectedId === s.id
                        ? 'bg-orange-50 dark:bg-orange-900/20'
                        : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{s.name}</p>
                      <p className="text-xs text-gray-400">{s.adm} · {s.class}</p>
                    </div>
                    {selectedId === s.id && (
                      <CheckCircle2 size={15} className="text-orange-500 flex-shrink-0 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>

            {selected && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 size={11} /> Selected: <strong>{selected.name}</strong>
              </p>
            )}
          </div>

          {/* Result type + duration row */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Result Type"
              value={resultType}
              onChange={e => setResultType(e.target.value as PinResultType)}
              options={[
                { value: 'both',    label: 'Both (Full + Mid-Term)' },
                { value: 'full',    label: 'Full Term Only' },
                { value: 'midterm', label: 'Mid-Term Only' },
              ]}
            />
            <Select
              label="PIN Duration"
              value={duration}
              onChange={e => setDuration(e.target.value as PinDuration)}
              options={[
                { value: 'session', label: 'Session (~9 months)' },
                { value: 'term',    label: 'Term (~4 months)' },
              ]}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Main PinsModule ──────────────────────────────────────────────

export default function PinsModule() {
  const [pins, setPins]           = useState<Pin[]>([]);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<'all' | 'active' | 'used' | 'revoked' | 'expired'>('all');
  const [showModal, setShowModal] = useState(false);

  async function fetchPins() {
    setLoading(true);
    try {
      const res = await fetch('/api/results/pins');
      const d   = await res.json();
      if (d.success) setPins(d.pins ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchPins(); }, []);

  function handleRevoke(id: number) {
    setPins(ps => ps.map(p => p.id === id ? { ...p, revoked: true } : p));
  }

  function handleGenerated(pin: Pin) {
    setPins(ps => [pin, ...ps]);
  }

  // Filter + search
  const filtered = pins.filter(p => {
    if (filter !== 'all' && pinStatus(p) !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.pin.toLowerCase().includes(q) ||
        (p.student_name ?? '').toLowerCase().includes(q) ||
        (p.student_adm  ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all:     pins.length,
    active:  pins.filter(p => pinStatus(p) === 'active').length,
    used:    pins.filter(p => pinStatus(p) === 'used').length,
    revoked: pins.filter(p => pinStatus(p) === 'revoked').length,
    expired: pins.filter(p => pinStatus(p) === 'expired').length,
  };

  const FILTER_TABS = [
    { key: 'all' as const,     label: 'All' },
    { key: 'active' as const,  label: 'Active' },
    { key: 'used' as const,    label: 'Used' },
    { key: 'expired' as const, label: 'Expired' },
    { key: 'revoked' as const, label: 'Revoked' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Result PINs</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Generate single-use PINs for students to access their results online.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          icon={<Plus size={14} />}
        >
          Generate PIN
        </Button>
        <button
          onClick={fetchPins}
          title="Refresh"
          className="p-2 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total',   value: counts.all,     color: 'text-gray-700 dark:text-gray-200',    bg: 'bg-gray-100 dark:bg-gray-800' },
          { label: 'Active',  value: counts.active,  color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Used',    value: counts.used,    color: 'text-blue-700 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Revoked', value: counts.revoked, color: 'text-red-700 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl px-4 py-3`}>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30 transition placeholder-gray-400"
            placeholder="Search by PIN, student name or admission no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex-shrink-0 self-start">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.key
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <KeyRound size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {pins.length === 0 ? 'No PINs generated yet' : 'No PINs match your filter'}
          </p>
          {pins.length === 0 && (
            <p className="text-sm mt-1">Click "Generate PIN" to create one for a student.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(pin => (
            <PinCard key={pin.id} pin={pin} onRevoke={handleRevoke} />
          ))}
        </div>
      )}

      {/* Generate modal */}
      <GeneratePinModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onGenerated={handleGenerated}
      />
    </div>
  );
}