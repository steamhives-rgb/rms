// ResultEntryForm teacher component
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS, GRADE_SCALE } from '@/lib/constants';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Student, SubjectResult, AcademicSession } from '@/lib/types';

// TERMS only — classes come from the Classes module API
const TERM_OPTIONS = [{ value: '', label: 'Select term…' }, ...TERMS.map(t => ({ value: t, label: t }))];

function calcGrade(score: number): { grade: string; remark: string } {
  for (const g of GRADE_SCALE) {
    if (score >= g.min) return { grade: g.grade, remark: g.remark };
  }
  return { grade: 'F9', remark: 'Fail' };
}

function emptySubject(): SubjectResult {
  return { name: '', ca: 0, exam: 0, total: 0, grade: '', remark: '' };
}

export default function ResultEntryForm() {
  const { teacher } = useAuth();
  const { success, error: showError } = useToast();
  const router = useRouter();

  // Classes fetched from Classes module — not hardcoded
  const [activeClasses, setActiveClasses] = useState<{ id: number; name: string }[]>([]);

  const [cls,          setCls]          = useState('');
  const [term,         setTerm]         = useState('');
  const [session,      setSession]      = useState('');
  const [sessions,     setSessions]     = useState<AcademicSession[]>([]);
  const [students,     setStudents]     = useState<Student[]>([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [subjects,     setSubjects]     = useState<SubjectResult[]>([emptySubject()]);
  const [loading,      setLoading]      = useState(false);
  const [searching,    setSearching]    = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [uploadedCount, setUploadedCount] = useState<number | null>(null);

  const hasBf1 = term === '2nd Term' || term === '3rd Term';
  const hasBf2 = term === '3rd Term';

  // Fetch classes from the Classes module (not hardcoded ALL_CLASSES)
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const all: { id: number; name: string }[] = d.classes ?? [];
          setActiveClasses(all);
          const allNames = all.map(c => c.name);

          const teacherClass = teacher?.class ?? '';
          if (teacherClass && allNames.includes(teacherClass)) {
            setCls(teacherClass);
          } else if (teacher?.classes?.length) {
            const firstMatch = teacher.classes.find(c => allNames.includes(c));
            if (firstMatch) setCls(firstMatch);
          }
        }
      })
      .catch(() => {});
  }, [teacher]);

  // Fetch sessions and pre-select current
  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        setSessions(d.sessions ?? []);
        const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
        if (cur) { setSession(cur.label); setTerm(cur.current_term ?? ''); }
      }
    });
  }, []);

  // Load students when class/term/session changes; also fetch uploaded count
  useEffect(() => {
    if (!cls || !term || !session) { setStudents([]); setUploadedCount(null); return; }
    setSearching(true);
    const p = new URLSearchParams({ class: cls, term, session });
    fetch(`/api/students?${p}`).then(r => r.json())
      .then(d => { if (d.success) setStudents(d.students ?? []); })
      .finally(() => setSearching(false));

    // Count already-uploaded results by this teacher for this class/term/session
    fetch(`/api/teachers/results?class=${encodeURIComponent(cls)}&term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setUploadedCount((d.results ?? []).length); })
      .catch(() => {});
  }, [cls, term, session]);

  // Pre-fill subjects from class subjects module (preferred), fallback to subject assignments
  useEffect(() => {
    if (!cls || !teacher) return;
    const classObj = activeClasses.find(c => c.name === cls);
    if (!classObj) return;

    fetch(`/api/schools/classes/subjects?class_id=${classObj.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.subjects) && d.subjects.length > 0) {
          setSubjects(d.subjects.map((s: { name: string }) => ({
            name: s.name, ca: 0, exam: 0, total: 0, grade: '', remark: '',
          })));
        } else {
          // Fallback to subject assignments
          const p = new URLSearchParams({ class: cls });
          fetch(`/api/subjects/assignments?${p}`).then(r => r.json()).then(d2 => {
            if (d2.success && d2.assignments?.length) {
              fetch('/api/subjects').then(r => r.json()).then(sData => {
                const subjs: SubjectResult[] = d2.assignments
                  .map((a: { subject_id: number }) => {
                    const sub = (sData.subjects ?? []).find((s: { id: number; name: string }) => s.id === a.subject_id);
                    return { name: sub?.name ?? '', ca: 0, exam: 0, total: 0, grade: '', remark: '' };
                  })
                  .filter((s: SubjectResult) => s.name);
                if (subjs.length) setSubjects(subjs);
              });
            }
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls, activeClasses]);

  const recalc = useCallback((idx: number, field: keyof SubjectResult, val: string | number) => {
    setSubjects(prev => {
      const updated = [...prev];
      const s = { ...updated[idx], [field]: val };
      s.total = (Number(s.ca) || 0) + (Number(s.exam) || 0);
      const { grade, remark } = calcGrade(s.total);
      s.grade = grade; s.remark = remark;
      updated[idx] = s;
      return updated;
    });
  }, []);

  async function handleSave() {
    if (!selectedId) { showError('Select a student.'); return; }
    if (!subjects[0].name) { showError('Add at least one subject.'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/results', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedId, resultType: 'full', subjects }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success(`Result saved! Avg: ${data.avg?.toFixed?.(1) ?? data.avg}`);
      setSaved(true);
      setSelectedId('');
      setSubjects([emptySubject()]);
      setTimeout(() => {
        const params = new URLSearchParams();
        if (cls)     params.set('class', cls);
        if (term)    params.set('term', term);
        if (session) params.set('session', session);
        router.push(`/teacher/results?${params}`);
      }, 1200);
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  const classOptions = [
    { value: '', label: 'Select class…' },
    ...activeClasses.map(c => ({ value: c.name, label: c.name })),
  ];
  const totalObtained   = subjects.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const totalObtainable = subjects.length * 100;
  const avg = subjects.length ? (totalObtained / subjects.length).toFixed(1) : '0.0';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Enter Results</h3>
        <div className="flex items-center gap-2">
          {uploadedCount !== null && cls && term && session && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              📤 {uploadedCount} uploaded
            </span>
          )}
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (cls)     params.set('class', cls);
              if (term)    params.set('term', term);
              if (session) params.set('session', session);
              router.push(`/teacher/results?${params}`);
            }}
            className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
          View Results <ArrowRight size={14} />
        </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        {/* Classes from Classes module, not hardcoded */}
        <Select label="Class" options={classOptions} value={cls}
          onChange={e => { setCls(e.target.value); setSelectedId(''); }} />
        <Select label="Term"  options={TERM_OPTIONS}  value={term}
          onChange={e => { setTerm(e.target.value); setSelectedId(''); }} />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Session</label>
          <select value={session} onChange={e => { setSession(e.target.value); setSelectedId(''); }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500">
            <option value="">Select…</option>
            {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Student</label>
        {searching ? <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Loading…</div> : (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
            className="w-full md:w-80 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500">
            <option value="">— Select student —</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.adm})</option>)}
          </select>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">CA</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">Exam</th>
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">Total</th>
              {hasBf1 && <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">BF 1st</th>}
              {hasBf2 && <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">BF 2nd</th>}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-16">Grade</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {subjects.map((s, i) => (
              <tr key={i} className="bg-white dark:bg-gray-900">
                <td className="px-2 py-1.5">
                  <input className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 min-w-[130px]"
                    placeholder="Subject" value={s.name} onChange={e => recalc(i, 'name', e.target.value)} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} max={100} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                    value={s.ca} onChange={e => recalc(i, 'ca', Number(e.target.value))} />
                </td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} max={100} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                    value={s.exam} onChange={e => recalc(i, 'exam', Number(e.target.value))} />
                </td>
                <td className="px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300">{s.total}</td>
                {hasBf1 && (
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={100} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      value={s.bf1 ?? ''} onChange={e => recalc(i, 'bf1', e.target.value === '' ? undefined as unknown as number : Number(e.target.value))} />
                  </td>
                )}
                {hasBf2 && (
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={100} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      value={s.bf2 ?? ''} onChange={e => recalc(i, 'bf2', e.target.value === '' ? undefined as unknown as number : Number(e.target.value))} />
                  </td>
                )}
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.grade?.startsWith('A') ? 'bg-green-100 text-green-700' : s.grade?.startsWith('B') ? 'bg-blue-100 text-blue-700' : s.grade?.startsWith('F') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.grade || '—'}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  {subjects.length > 1 && (
                    <button onClick={() => setSubjects(p => p.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <td colSpan={hasBf2 ? 8 : hasBf1 ? 7 : 6} className="px-3 py-2">
                <button onClick={() => setSubjects(p => [...p, emptySubject()])} className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium">
                  <Plus size={14} /> Add Subject
                </button>
              </td>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
              <td className="px-3 py-2">{subjects.length} subjects</td>
              <td /><td />
              <td className="px-3 py-2 text-center font-semibold text-gray-700 dark:text-gray-300">{totalObtained}/{totalObtainable}</td>
              {hasBf1 && <td />}{hasBf2 && <td />}
              <td className="px-3 py-2 text-center font-semibold text-orange-600">Avg: {avg}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {saved && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-sm font-medium">
          ✓ Result saved! Redirecting to results…
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleSave} loading={loading} className="w-full md:w-auto">
          <Save size={15} /> Save Result
        </Button>
        <button
          onClick={() => {
            const params = new URLSearchParams();
            if (cls)     params.set('class', cls);
            if (term)    params.set('term', term);
            if (session) params.set('session', session);
            router.push(`/teacher/results?${params}`);
          }}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Go to Results Query →
        </button>
      </div>
    </div>
  );
}