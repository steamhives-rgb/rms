'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import {
  CheckCircle2, Circle, ChevronRight, Upload, X,
  Building2, GraduationCap, Palette, BookOpen, ArrowRight, Sparkles
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────
interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
}

const STEPS: SetupStep[] = [
  {
    id: 'school_info',
    title: 'School Information',
    description: 'Add contact details, motto, and address',
    icon: Building2,
    required: false,
  },
  {
    id: 'branding',
    title: 'Branding & Logo',
    description: 'Upload your school logo, stamp, and signatures',
    icon: Palette,
    required: false,
  },
  {
    id: 'classes',
    title: 'Set Up Classes',
    description: 'Select the classes your school uses',
    icon: GraduationCap,
    required: false,
  },
  {
    id: 'sessions',
    title: 'Academic Session',
    description: 'Create your current academic session and term',
    icon: BookOpen,
    required: false,
  },
];

// ── Image Upload Box ───────────────────────────────────────────────
function ImageBox({
  label, value, onChange, onClear, hint,
}: {
  label: string; value: string | null;
  onChange: (v: string) => void; onClear: () => void; hint?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Image must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  return (
    <div>
      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">{label}</p>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt={label} className="h-16 w-auto max-w-[140px] object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1" />
          <button
            onClick={onClear}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X size={10} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => ref.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 text-xs hover:border-orange-400 hover:text-orange-500 transition-all"
        >
          <Upload size={13} /> Upload {label}
        </button>
      )}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ── Step Panel ─────────────────────────────────────────────────────
function StepPanel({ step, school, onComplete, onSkip }: {
  step: SetupStep;
  school: { school_type: string; abbreviation: string; name: string; [key: string]: unknown };
  onComplete: (data?: Record<string, unknown>) => void;
  onSkip: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // School Info state
  const [info, setInfo] = useState({
    phone: '', email: '', address: '', motto: '',
  });

  // Branding state
  const [logo, setLogo]       = useState<string | null>(null);
  const [stamp, setStamp]     = useState<string | null>(null);
  const [sigPrincipal, setSigPrincipal] = useState<string | null>(null);
  const [sigHead, setSigHead] = useState<string | null>(null);

  // Classes state — grouped
  const CLASS_GROUPS = [
    { label: '🍼 Pre-Basic', classes: ['Creche','Nursery','Nursery 1','Nursery 2','Kindergarten','KG 1','KG 2'] },
    { label: '📚 Primary / Basic', classes: ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Basic 1','Basic 2','Basic 3','Basic 4','Basic 5','Basic 6'] },
    { label: '🏫 Junior Secondary', classes: ['JSS 1','JSS 2','JSS 3'] },
    { label: '🎓 Senior Secondary', classes: ['SS 1','SS 2','SS 3'] },
  ];
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());
  function toggleClass(cls: string) {
    setSelectedClasses(prev => {
      const next = new Set(prev);
      next.has(cls) ? next.delete(cls) : next.add(cls);
      return next;
    });
  }

  // Session state
  const year = new Date().getFullYear();
  const SESSION_OPTIONS = Array.from({ length: 8 }, (_, i) => {
    const y = year - 1 + i;
    return { value: `${y}/${y + 1}`, label: `${y}/${y + 1}` };
  });
  const TERM_OPTIONS = ['1st Term', '2nd Term', '3rd Term'];
  const [session, setSession] = useState({ label: `${year}/${year + 1}`, term: '1st Term' });

  async function saveSchoolInfo() {
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/schools/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(info),
      });
      const data = await res.json();
      if (!data.success) { setErr(data.error ?? 'Failed to save.'); return; }
      onComplete();
    } catch { setErr('Network error.'); }
    finally { setSaving(false); }
  }

  async function saveBranding() {
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/schools/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_logo: logo, school_stamp: stamp,
          sig_principal: sigPrincipal, head_signature: sigHead,
        }),
      });
      const data = await res.json();
      if (!data.success) { setErr(data.error ?? 'Failed to save.'); return; }
      onComplete();
    } catch { setErr('Network error.'); }
    finally { setSaving(false); }
  }

  async function saveClasses() {
    if (!selectedClasses.size) { onSkip(); return; }
    setSaving(true); setErr('');
    try {
      const res = await fetch('/api/schools/classes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classes: Array.from(selectedClasses) }),
      });
      const data = await res.json();
      if (!data.success) { setErr(data.error ?? 'Failed to save.'); return; }
      onComplete();
    } catch { setErr('Network error.'); }
    finally { setSaving(false); }
  }

  async function saveSession() {
    setSaving(true); setErr('');
    try {
      const [startYear] = session.label.split('/').map(Number);
      const res = await fetch('/api/sessions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: session.label,
          start_year: startYear,
          end_year: startYear + 1,
          current_term: session.term,
          is_current: true,
        }),
      });
      const data = await res.json();
      if (!data.success && !data.error?.includes('already')) { setErr(data.error ?? 'Failed to save.'); return; }
      onComplete();
    } catch { setErr('Network error.'); }
    finally { setSaving(false); }
  }

  const setI = (k: keyof typeof info) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo(prev => ({ ...prev, [k]: e.target.value }));

  const inputCls = "w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400 transition";

  return (
    <div className="space-y-5">
      {step.id === 'school_info' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Phone Number</label>
              <input className={inputCls} placeholder="e.g. 08012345678" value={info.phone} onChange={setI('phone')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
              <input className={inputCls} type="email" placeholder="school@example.com" value={info.email} onChange={setI('email')} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">School Address</label>
            <textarea className={`${inputCls} resize-none`} rows={2} placeholder="Full school address" value={info.address} onChange={setI('address')} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">School Motto</label>
            <input className={inputCls} placeholder="e.g. Excellence in all things" value={info.motto} onChange={setI('motto')} />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Skip for now
            </button>
            <button onClick={saveSchoolInfo} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><CheckCircle2 size={15} /> Save & Continue</>}
            </button>
          </div>
        </>
      )}

      {step.id === 'branding' && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <ImageBox label="School Logo" value={logo} onChange={setLogo} onClear={() => setLogo(null)} hint="Appears on report cards" />
            <ImageBox label="School Stamp" value={stamp} onChange={setStamp} onClear={() => setStamp(null)} hint="Official stamp" />
            <ImageBox label="Principal's Signature" value={sigPrincipal} onChange={setSigPrincipal} onClear={() => setSigPrincipal(null)} hint="For report cards" />
            <ImageBox label="Head Teacher's Signature" value={sigHead} onChange={setSigHead} onClear={() => setSigHead(null)} hint="For report cards" />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Skip for now
            </button>
            <button onClick={saveBranding} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><CheckCircle2 size={15} /> Save & Continue</>}
            </button>
          </div>
        </>
      )}

      {step.id === 'classes' && (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400">Select all the classes your school runs. You can always add or remove classes later.</p>
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
            {CLASS_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
                <div className="flex flex-wrap gap-2">
                  {group.classes.map(cls => {
                    const active = selectedClasses.has(cls);
                    return (
                      <button
                        key={cls}
                        onClick={() => toggleClass(cls)}
                        className={`text-xs px-3 py-1.5 rounded-lg border-2 font-medium transition-all ${
                          active
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-300'
                        }`}
                      >
                        {cls}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          {selectedClasses.size > 0 && (
            <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              {selectedClasses.size} class{selectedClasses.size !== 1 ? 'es' : ''} selected
            </p>
          )}
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Skip for now
            </button>
            <button onClick={saveClasses} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><CheckCircle2 size={15} /> {selectedClasses.size ? 'Save & Continue' : 'Continue'}</>}
            </button>
          </div>
        </>
      )}

      {step.id === 'sessions' && (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Academic Session</label>
            <select
              className={inputCls}
              value={session.label}
              onChange={e => setSession(s => ({ ...s, label: e.target.value }))}
            >
              {SESSION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Current Term</label>
            <div className="flex gap-2">
              {TERM_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setSession(s => ({ ...s, term: t }))}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                    session.term === t
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Skip for now
            </button>
            <button onClick={saveSession} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><CheckCircle2 size={15} /> Save & Continue</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Setup Page ────────────────────────────────────────────────
export default function SetupPage() {
  const router = useRouter();
  const { school } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);

  // Redirect to setup if already logged in but not set up; else stay
  useEffect(() => {
    if (done) {
      const timer = setTimeout(() => router.push('/dashboard'), 1800);
      return () => clearTimeout(timer);
    }
  }, [done, router]);

  function handleComplete() {
    const step = STEPS[currentStep];
    setCompletedSteps(prev => new Set([...prev, step.id]));
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(i => i + 1);
    } else {
      setDone(true);
    }
  }

  function handleSkip() {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(i => i + 1);
    } else {
      setDone(true);
    }
  }

  const progress = Math.round((completedSteps.size / STEPS.length) * 100);

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5 animate-bounce">
            <Sparkles className="text-green-500 w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">You're all set! 🎉</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Taking you to your dashboard…</p>
          <div className="mt-5 h-1 w-40 mx-auto bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 animate-[width_1.8s_ease-in-out]" style={{ width: '100%', transition: 'width 1.8s ease-in-out' }} />
          </div>
        </div>
      </div>
    );
  }

  const activeStep = STEPS[currentStep];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col lg:flex-row">
      {/* ── Left panel: step navigator ── */}
      <aside className="lg:w-72 shrink-0 bg-white dark:bg-gray-900 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 p-6 lg:p-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 lg:mb-10">
          {school?.school_logo ? (
            <img src={school.school_logo} alt="logo" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-base">S</div>
          )}
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{school?.name ?? 'Your School'}</p>
            <p className="text-[11px] text-gray-400">Setup Wizard</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 lg:mb-8">
          <div className="flex justify-between text-[11px] text-gray-500 mb-1.5">
            <span>Setup Progress</span>
            <span className="font-semibold text-orange-500">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps list */}
        <nav className="space-y-1 flex-1">
          {STEPS.map((step, i) => {
            const isComplete = completedSteps.has(step.id);
            const isCurrent  = i === currentStep;
            const isPast     = i < currentStep;
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-orange-50 dark:bg-orange-900/20'
                    : isPast || isComplete
                    ? 'opacity-60'
                    : 'opacity-40'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                }`}>
                  {isComplete
                    ? <CheckCircle2 size={14} />
                    : isCurrent
                    ? <Icon size={13} />
                    : <Circle size={13} />}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold leading-tight truncate ${
                    isCurrent ? 'text-orange-700 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>{step.title}</p>
                  <p className="text-[11px] text-gray-400 truncate">{step.description}</p>
                </div>
                {isCurrent && <ChevronRight size={13} className="text-orange-400 shrink-0 ml-auto" />}
              </div>
            );
          })}
        </nav>

        {/* Skip all */}
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-6 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition text-center w-full"
        >
          Skip setup → go to Dashboard
        </button>
      </aside>

      {/* ── Right panel: active step content ── */}
      <main className="flex-1 flex items-start lg:items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          {/* Step header */}
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-orange-500 uppercase tracking-widest">
                Step {currentStep + 1} of {STEPS.length}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-1">{activeStep.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{activeStep.description}</p>
          </div>

          {/* Step content card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            {school && (
              <StepPanel
                key={activeStep.id}
                step={activeStep}
                school={school as Record<string, unknown> & { school_type: string; abbreviation: string; name: string }}
                onComplete={handleComplete}
                onSkip={handleSkip}
              />
            )}
          </div>

          {/* Next steps preview */}
          {currentStep < STEPS.length - 1 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <ArrowRight size={12} />
              <span>Next: <span className="font-medium text-gray-600 dark:text-gray-300">{STEPS[currentStep + 1].title}</span></span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
