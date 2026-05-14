// SessionsModule dashboard component
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Plus, Star, Pencil, ArrowRight, Users, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS, PROMOTION_MAP, ALL_CLASSES } from '@/lib/constants';
import type { AcademicSession } from '@/lib/types';

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  try {
    const d = new Date(raw.includes('T') ? raw : raw + 'T00:00:00');
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return raw;
  }
}

function generateSessionOptions() {
  const year = new Date().getFullYear();
  const options: { value: string; label: string }[] = [{ value: '', label: 'Select session' }];
  for (let y = year - 2; y <= year + 5; y++) {
    const label = `${y}/${y + 1}`;
    options.push({ value: label, label });
  }
  return options;
}

const emptyForm = {
  label: '', current_term: '1st Term', days_opened: '', next_term_begins: '', resumption_date: '', attendance_weeks: '',
};

// Class rows used for per-class promotion
const CLASS_ROWS: { from: string; defaultTo: string }[] = ALL_CLASSES
  .filter(c => PROMOTION_MAP[c] !== undefined || true) // show all classes
  .map(c => ({ from: c, defaultTo: PROMOTION_MAP[c] ?? '' }));

export default function SessionsModule() {
  const { success, error: showError } = useToast();
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editSession, setEditSession] = useState<AcademicSession | null>(null);
  const [form, setForm] = useState(emptyForm);
  const SESSION_OPTIONS = useMemo(() => generateSessionOptions(), []);

  // ── Promotion state ──────────────────────────────────────────────
  const [showPromote, setShowPromote]         = useState(false);
  const [promoteFrom, setPromoteFrom]         = useState('');
  const [promoteTo, setPromoteTo]             = useState('');
  const [promoteMode, setPromoteMode]         = useState<'all' | 'class'>('all');
  const [promoteLoading, setPromoteLoading]   = useState(false);
  const [promoteResult, setPromoteResult]     = useState<{ promoted: number; terminal: number; message: string } | null>(null);
  // Per-class custom target map: fromClass → toClass override
  const [classTargets, setClassTargets]       = useState<Record<string, string>>({});
  // Active school classes (from API, falls back to ALL_CLASSES)
  const [schoolClasses, setSchoolClasses]     = useState<string[]>([]);
  const [showClassList, setShowClassList]     = useState(false);

  async function fetchSessions() {
    setLoading(true);
    try {
      const res  = await fetch('/api/sessions');
      const data = await res.json();
      if (data.success) setSessions(data.sessions ?? []);
    } catch (e) {
      console.error('[SessionsModule] fetchSessions network error:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSessions();
    // Load school's active classes for promotion selects
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.classes?.length) {
          setSchoolClasses(d.classes.map((c: { name: string }) => c.name));
        }
      })
      .catch(() => {});
  }, []);

  async function handleAdd() {
    if (!form.label) { showError('Please select an academic session.'); return; }
    const res  = await fetch('/api/sessions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.success) { showError(data.error ?? 'Failed to add session.'); return; }
    success('Session added!');
    setShowAdd(false);
    setForm(emptyForm);
    fetchSessions();
  }

  async function handleEdit() {
    if (!editSession) return;
    const res = await fetch(`/api/sessions?id=${editSession.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_term:     form.current_term,
        days_opened:      form.days_opened ? parseInt(form.days_opened) : null,
        next_term_begins: form.next_term_begins || null,
        resumption_date:  form.resumption_date  || null,
        label:            form.label || editSession.label,
        attendance_weeks: form.attendance_weeks ? parseInt(form.attendance_weeks) : undefined,
      }),
    });
    const data = await res.json();
    if (!data.success) { showError(data.error ?? 'Failed to update.'); return; }
    success('Session updated!');
    setEditSession(null);
    fetchSessions();
  }

  function openEdit(s: AcademicSession) {
    setEditSession(s);
    setForm({
      label:            s.label ?? '',
      current_term:     s.current_term ?? '1st Term',
      days_opened:      s.days_opened ? String(s.days_opened) : '',
      next_term_begins: s.next_term_begins ?? '',
      resumption_date:  s.resumption_date ?? '',
      attendance_weeks: s.attendance_weeks ? String(s.attendance_weeks) : '',
    });
  }

  async function setCurrentSession(id: number) {
    const res  = await fetch(`/api/sessions?id=${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_current: true }),
    });
    const data = await res.json();
    if (!data.success) { showError(data.error ?? 'Failed.'); return; }
    success('Current session updated!');
    fetchSessions();
  }

  // ── Promotion handlers ─────────────────────────────────────────
  function openPromote() {
    setPromoteResult(null);
    setPromoteMode('all');
    setShowClassList(false);
    // Default: from current session → next available
    const cur = sessions.find(s => s.is_current);
    setPromoteFrom(cur?.label ?? '');
    const opts = generateSessionOptions().map(o => o.value).filter(Boolean);
    const curIdx = opts.indexOf(cur?.label ?? '');
    setPromoteTo(curIdx >= 0 && curIdx + 1 < opts.length ? opts[curIdx + 1] : '');
    // Reset class targets to defaults
    const defaults: Record<string, string> = {};
    (schoolClasses.length ? schoolClasses : ALL_CLASSES).forEach(c => {
      defaults[c] = PROMOTION_MAP[c] ?? '';
    });
    setClassTargets(defaults);
    setShowPromote(true);
  }

  async function handlePromoteAll() {
    if (!promoteFrom || !promoteTo) { showError('Select both from and to sessions.'); return; }
    if (promoteFrom === promoteTo)  { showError('From and To sessions must be different.'); return; }
    setPromoteLoading(true);
    setPromoteResult(null);
    try {
      const res  = await fetch('/api/students/promote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_session: promoteFrom, to_session: promoteTo }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Promotion failed.'); return; }
      setPromoteResult(data);
      success(data.message);
      fetchSessions();
    } catch { showError('Network error.'); }
    finally  { setPromoteLoading(false); }
  }

  async function handlePromoteClass(fromClass: string) {
    const toClass = classTargets[fromClass];
    if (!toClass) { showError(`Select a target class for ${fromClass}.`); return; }
    if (!promoteFrom || !promoteTo) { showError('Select both sessions first.'); return; }
    setPromoteLoading(true);
    setPromoteResult(null);
    try {
      const res  = await fetch('/api/students/promote', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_session: promoteFrom, to_session: promoteTo, from_class: fromClass, to_class: toClass }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Promotion failed.'); return; }
      setPromoteResult(data);
      success(data.message);
    } catch { showError('Network error.'); }
    finally  { setPromoteLoading(false); }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const sessionSelectOptions = [
    { value: '', label: 'Select session…' },
    ...sessions.map(s => ({ value: s.label, label: s.label + (s.is_current ? ' (current)' : '') })),
  ];

  const classOptions = [
    { value: '', label: 'Select class…' },
    ...(schoolClasses.length ? schoolClasses : ALL_CLASSES).map(c => ({ value: c, label: c })),
  ];

  const displayClasses = schoolClasses.length ? schoolClasses : ALL_CLASSES;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Academic Sessions</h2>
        <Button size="sm" variant="outline" onClick={openPromote}>
          <ArrowRight size={15} /> Promote Students
        </Button>
        <Button size="sm" onClick={() => { setShowAdd(true); setForm(emptyForm); }}>
          <Plus size={15} /> Add Session
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : !sessions.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium">No sessions yet</p>
          <p className="text-sm mt-1">Add at least one academic session to get started</p>
          <Button size="sm" className="mt-4" onClick={() => setShowAdd(true)}><Plus size={14} /> Add Session</Button>
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Session</Th>
              <Th>Current Term</Th>
              <Th>Days Opened</Th>
              <Th>Next Term</Th>
              <Th>Resumption</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {sessions.map(s => (
              <Tr key={s.id}>
                <Td className="font-semibold font-mono">{s.label}</Td>
                <Td>{s.current_term ?? '—'}</Td>
                <Td>{s.days_opened ?? '—'}</Td>
                <Td>{formatDate(s.next_term_begins)}</Td>
                <Td>{formatDate(s.resumption_date)}</Td>
                <Td>
                  {s.is_current
                    ? <Badge variant="success"><Star size={10} className="inline mr-1" />Current</Badge>
                    : <Badge>Past</Badge>}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(s)} className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1">
                      <Pencil size={11} /> Edit
                    </button>
                    {!s.is_current && (
                      <button onClick={() => setCurrentSession(s.id)} className="text-xs text-blue-500 hover:underline font-medium">
                        Set Current
                      </button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* ── Add Session modal ─────────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Academic Session" size="sm">
        <div className="space-y-4">
          <Select label="Academic Session *" options={SESSION_OPTIONS} value={form.label} onChange={set('label')} />
          {form.label && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2">
              <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                📅 Session: <span className="font-mono font-bold">{form.label}</span>
              </p>
            </div>
          )}
          <Select label="Current Term" options={TERMS.map(t => ({ value: t, label: t }))} value={form.current_term} onChange={set('current_term')} />
          <Input label="Times School Opened" type="number" placeholder="e.g. 90" value={form.days_opened} onChange={set('days_opened')} />
          <Input label="Weeks in This Term" type="number" placeholder="e.g. 14" value={form.attendance_weeks} onChange={set('attendance_weeks')} />
          <Input label="Next Term Begins" type="date" value={form.next_term_begins} onChange={set('next_term_begins')} />
          <Input label="Resumption Date" type="date" value={form.resumption_date} onChange={set('resumption_date')} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAdd} className="flex-1">Add Session</Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Session modal ────────────────────────────────────── */}
      <Modal open={!!editSession} onClose={() => setEditSession(null)} title={`Edit Session — ${editSession?.label}`} size="sm">
        <div className="space-y-4">
          <Select label="Current Term" options={TERMS.map(t => ({ value: t, label: t }))} value={form.current_term} onChange={set('current_term')} />
          <Input label="Times School Opened" type="number" placeholder="e.g. 90" value={form.days_opened} onChange={set('days_opened')} />
          <Input label="Weeks in This Term" type="number" placeholder="e.g. 14" value={form.attendance_weeks} onChange={set('attendance_weeks')} />
          <Input label="Next Term Begins" type="date" value={form.next_term_begins} onChange={set('next_term_begins')} />
          <Input label="Resumption Date" type="date" value={form.resumption_date} onChange={set('resumption_date')} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditSession(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleEdit} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* ── Promote Students modal ───────────────────────────────── */}
      <Modal open={showPromote} onClose={() => { setShowPromote(false); setPromoteResult(null); }} title="Promote Students" size="md">
        <div className="space-y-5">

          {/* Session selectors */}
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="From Session *"
              options={sessionSelectOptions}
              value={promoteFrom}
              onChange={e => setPromoteFrom(e.target.value)}
            />
            <Select
              label="To Session *"
              options={sessionSelectOptions}
              value={promoteTo}
              onChange={e => setPromoteTo(e.target.value)}
            />
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
            <button
              onClick={() => setPromoteMode('all')}
              className={`flex-1 px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors ${
                promoteMode === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Users size={14} /> Promote All Classes
            </button>
            <button
              onClick={() => setPromoteMode('class')}
              className={`flex-1 px-4 py-2.5 font-medium flex items-center justify-center gap-2 transition-colors border-l border-gray-200 dark:border-gray-700 ${
                promoteMode === 'class'
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <ArrowRight size={14} /> Promote by Class
            </button>
          </div>

          {/* ── Promote All ─────────────────────────────────────── */}
          {promoteMode === 'all' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">What this does:</p>
                <p>Every student in <strong>{promoteFrom || '…'}</strong> will be moved to <strong>{promoteTo || '…'}</strong> and promoted to the next class using the default promotion map (e.g. Primary 1 → Primary 2). Students at terminal classes (SS 3) stay in their current class.</p>
              </div>

              {/* Collapsible: show the default promotion map */}
              <button
                onClick={() => setShowClassList(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium"
              >
                {showClassList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {showClassList ? 'Hide' : 'View'} default promotion map
              </button>
              {showClassList && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-xs max-h-52 overflow-y-auto">
                  {displayClasses.map(c => (
                    <div key={c} className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">{c}</span>
                      <ArrowRight size={11} className="text-gray-400 flex-shrink-0" />
                      <span className={PROMOTION_MAP[c] ? 'text-green-600 dark:text-green-400' : 'text-gray-400 italic'}>
                        {PROMOTION_MAP[c] ?? 'Terminal (stays)'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handlePromoteAll}
                loading={promoteLoading}
                disabled={!promoteFrom || !promoteTo || promoteFrom === promoteTo}
                className="w-full"
              >
                <ArrowRight size={15} /> Promote All Students
              </Button>
            </div>
          )}

          {/* ── Promote by Class ──────────────────────────────── */}
          {promoteMode === 'class' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose a class and the target class it should be promoted to. Useful when your school doesn't follow the default sequence — e.g. <em>Kindergarten → Nursery</em> instead of <em>Kindergarten → Nursery 1</em>.
              </p>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-0 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <span>From Class</span>
                  <span />
                  <span>Promote To</span>
                  <span />
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-64 overflow-y-auto">
                  {displayClasses.map(cls => (
                    <div key={cls} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-3 py-2">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{cls}</span>
                      <ArrowRight size={13} className="text-gray-400 flex-shrink-0" />
                      <select
                        value={classTargets[cls] ?? ''}
                        onChange={e => setClassTargets(prev => ({ ...prev, [cls]: e.target.value }))}
                        className="text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-2 py-1 focus:outline-none focus:border-orange-400 w-full"
                      >
                        <option value="">— no change —</option>
                        {classOptions.filter(o => o.value && o.value !== cls).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handlePromoteClass(cls)}
                        disabled={!classTargets[cls] || !promoteFrom || !promoteTo || promoteLoading}
                        className="text-xs px-2.5 py-1 rounded-lg bg-orange-500 text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors flex-shrink-0"
                      >
                        {promoteLoading ? <Spinner size="sm" /> : 'Go'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Result banner */}
          {promoteResult && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-sm">
              <p className="font-semibold text-green-700 dark:text-green-400">✓ {promoteResult.message}</p>
              {promoteResult.terminal > 0 && (
                <p className="text-xs text-gray-500 mt-1">{promoteResult.terminal} student(s) at terminal class — class unchanged.</p>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Button variant="outline" onClick={() => { setShowPromote(false); setPromoteResult(null); }}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}