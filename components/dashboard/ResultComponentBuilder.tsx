'use client';
// ResultComponentBuilder
// Lets admins define how results are scored for a given class/term/result_type.
// Default: CA 40 + Exam 60 (full term), CA 40 (midterm).
// Schema is stored in localStorage keyed by `rcs:{schoolId}:{class}:{term}:{type}`
// and can be passed into ResultEntry so it renders the correct columns.

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, RotateCcw, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

export interface ScoreComponent {
  id:    string;
  label: string; // e.g. "CA 1", "CA 2", "Exam"
  max:   number; // max score for this component
}

export interface ResultSchema {
  components: ScoreComponent[];
  total: number; // must sum to 100
}

// ── Default presets ──────────────────────────────────────────────
const PRESETS: { label: string; components: Omit<ScoreComponent, 'id'>[] }[] = [
  {
    label: 'CA 40 + Exam 60 (default)',
    components: [
      { label: 'CA',   max: 40 },
      { label: 'Exam', max: 60 },
    ],
  },
  {
    label: 'CA1 20 + CA2 20 + Exam 60',
    components: [
      { label: 'CA 1', max: 20 },
      { label: 'CA 2', max: 20 },
      { label: 'Exam', max: 60 },
    ],
  },
  {
    label: 'CA1 10 + CA2 10 + CA3 20 + Exam 60',
    components: [
      { label: 'CA 1', max: 10 },
      { label: 'CA 2', max: 10 },
      { label: 'CA 3', max: 20 },
      { label: 'Exam', max: 60 },
    ],
  },
  {
    label: 'Midterm — CA 40 only',
    components: [
      { label: 'CA', max: 40 },
    ],
  },
];

function uid() { return Math.random().toString(36).slice(2, 8); }

function withIds(comps: Omit<ScoreComponent, 'id'>[]): ScoreComponent[] {
  return comps.map(c => ({ ...c, id: uid() }));
}

function storageKey(schoolId: string, cls: string, term: string, type: string) {
  return `rcs:${schoolId}:${cls}:${term}:${type}`;
}

/** Load saved schema from localStorage (or return null) */
export function loadResultSchema(schoolId: string, cls: string, term: string, type: string): ResultSchema | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(schoolId, cls, term, type));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Save schema to localStorage */
export function saveResultSchema(schoolId: string, cls: string, term: string, type: string, schema: ResultSchema) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(schoolId, cls, term, type), JSON.stringify(schema));
}

interface Props {
  defaultClass?: string;
  defaultTerm?:  string;
  defaultType?:  'full' | 'midterm';
  /** Called when a schema is saved so ResultEntry can reload */
  onSaved?: (schema: ResultSchema) => void;
}

export default function ResultComponentBuilder({ defaultClass = '', defaultTerm = '', defaultType = 'full', onSaved }: Props) {
  const { success, error: showError } = useToast();
  const { school } = useAuth();

  const [cls,    setCls]    = useState(defaultClass);
  const [term,   setTerm]   = useState(defaultTerm);
  const [rType,  setRType]  = useState<'full' | 'midterm'>(defaultType);
  const [comps,  setComps]  = useState<ScoreComponent[]>(withIds(PRESETS[0].components));
  const [saved,  setSaved]  = useState(false);

  const [activeClasses, setActiveClasses] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveClasses((d.classes ?? []).map((c: { name: string }) => c.name)); })
      .catch(() => {});
  }, []);

  // Reload saved schema when selector changes
  useEffect(() => {
    if (!cls || !term || !school?.id) return;
    const existing = loadResultSchema(school.id, cls, term, rType);
    if (existing) setComps(existing.components);
    else {
      // Default based on type
      const preset = rType === 'midterm' ? PRESETS[3] : PRESETS[0];
      setComps(withIds(preset.components));
    }
    setSaved(false);
  }, [cls, term, rType, school?.id]);

  const total = comps.reduce((s, c) => s + (Number(c.max) || 0), 0);
  const isValid = total === 100 && comps.length > 0 && comps.every(c => c.label.trim() && c.max > 0);

  function applyPreset(idx: number) {
    setComps(withIds(PRESETS[idx].components));
    setSaved(false);
  }

  function addComponent() {
    setComps(prev => [...prev, { id: uid(), label: '', max: 0 }]);
  }

  function updateComp(id: string, field: 'label' | 'max', value: string | number) {
    setComps(prev => prev.map(c => c.id === id ? { ...c, [field]: field === 'max' ? Number(value) : value } : c));
    setSaved(false);
  }

  function removeComp(id: string) {
    setComps(prev => prev.filter(c => c.id !== id));
    setSaved(false);
  }

  function handleSave() {
    if (!cls || !term) { showError('Select a class and term first.'); return; }
    if (!school?.id)    { showError('School not loaded.'); return; }
    if (total !== 100)  { showError(`Components must total 100. Currently: ${total}`); return; }
    const schema: ResultSchema = { components: comps, total: 100 };
    saveResultSchema(school.id, cls, term, rType, schema);
    setSaved(true);
    success('Result schema saved!');
    onSaved?.(schema);
  }

  const TERMS_LIST = ['1st Term', '2nd Term', '3rd Term'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Result component builder</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Define how CA and Exam scores are broken down. Components must total 100.
        </p>
      </div>

      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Class</label>
          <select
            value={cls}
            onChange={e => setCls(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 min-w-[140px]"
          >
            <option value="">Select class…</option>
            {activeClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Term</label>
          <select
            value={term}
            onChange={e => setTerm(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">Select term…</option>
            {TERMS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Result type</label>
          <select
            value={rType}
            onChange={e => setRType(e.target.value as 'full' | 'midterm')}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
          >
            <option value="full">Full Term</option>
            <option value="midterm">Mid-Term</option>
          </select>
        </div>
      </div>

      {/* Presets */}
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => applyPreset(i)}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Component rows */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_40px] gap-0 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <span>Component label</span>
          <span className="text-center">Max score</span>
          <span />
        </div>
        <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
          {comps.map((c, idx) => (
            <div key={c.id} className="grid grid-cols-[1fr_100px_40px] gap-0 items-center px-4 py-2.5">
              <input
                type="text"
                value={c.label}
                onChange={e => updateComp(c.id, 'label', e.target.value)}
                placeholder={`Component ${idx + 1} (e.g. CA 1)`}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-full"
              />
              <div className="flex items-center justify-center">
                <input
                  type="number"
                  min={1} max={100}
                  value={c.max || ''}
                  onChange={e => updateComp(c.id, 'max', e.target.value)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-20 text-center"
                />
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => removeComp(c.id)}
                  disabled={comps.length === 1}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add row + total */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <button
            onClick={addComponent}
            className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus size={15} /> Add component
          </button>
          <div className={`text-sm font-bold ${total === 100 ? 'text-green-600' : total > 100 ? 'text-red-600' : 'text-orange-500'}`}>
            Total: {total} / 100
            {total === 100 && <span className="ml-1">✓</span>}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className="flex items-center gap-2"
        >
          {saved ? <CheckCircle2 size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save schema'}
        </Button>
        <button
          onClick={() => {
            const preset = rType === 'midterm' ? PRESETS[3] : PRESETS[0];
            setComps(withIds(preset.components));
            setSaved(false);
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <RotateCcw size={13} /> Reset to default
        </button>
      </div>

      {saved && (
        <p className="text-xs text-green-600 dark:text-green-400">
          Schema saved for <strong>{cls}</strong> · {term} · {rType === 'midterm' ? 'Mid-Term' : 'Full Term'}.
          ResultEntry will use these columns automatically.
        </p>
      )}
    </div>
  );
}
