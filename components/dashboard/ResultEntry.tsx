// ResultEntry dashboard component
'use client';
// ResultEntry — enter/edit results for a single student
// BF column rule: Subject | CA | Exam | Total | [BF cols] | Grade | Remark
// 1st Term: no BF; 2nd Term: BF1; 3rd Term: BF1 + BF2
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Save, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS, GRADE_SCALE } from '@/lib/constants';
import type { Result, Student, SubjectResult, AffectiveRecord } from '@/lib/types';

interface Props {
  result?: Result | null;
  defaultClass?: string;
  defaultTerm?: string;
  defaultSession?: string;
  onSaved: () => void;
  onCancel: () => void;
}

// ── School-class shape returned by /api/schools/classes ──────────
interface SchoolClass {
  id: number;
  name: string;
  is_active: boolean;
}

// ── Teacher shape returned by /api/teachers ───────────────────────
interface TeacherRow {
  id: number;
  name: string;
  class: string | null;
  classes?: string[];
  is_class_teacher?: boolean;
}

// ── SSS department helpers (mirrors ClassesModule) ────────────────
const SSS_CLASSES = ['SS 1','SS 2','SS 3','SSS1','SSS2','SSS3','SSS 1','SSS 2','SSS 3'];
const SSS_DEPTS   = ['Science', 'Commercial', 'Arts'] as const;
type SssDept = typeof SSS_DEPTS[number];

function isSSS(cls: string) {
  return SSS_CLASSES.includes(cls);
}

// ── Score scheme presets ──────────────────────────────────────────
interface ScoreComponent { key: string; label: string; max: number; }
interface ScoreScheme { id: string; label: string; components: ScoreComponent[]; }

const SCORE_SCHEMES: ScoreScheme[] = [
  {
    id:    'ca40_exam60',
    label: 'CA 40 + Exam 60 (default)',
    components: [
      { key: 'ca',   label: 'CA',   max: 40 },
      { key: 'exam', label: 'Exam', max: 60 },
    ],
  },
  {
    id:    'ca1_20_ca2_20_exam60',
    label: 'CA1 20 + CA2 20 + Exam 60',
    components: [
      { key: 'ca1',  label: 'CA1',  max: 20 },
      { key: 'ca2',  label: 'CA2',  max: 20 },
      { key: 'exam', label: 'Exam', max: 60 },
    ],
  },
  {
    id:    'ca1_10_ca2_10_ca3_20_exam60',
    label: 'CA1 10 + CA2 10 + CA3 20 + Exam 60',
    components: [
      { key: 'ca1',  label: 'CA1',  max: 10 },
      { key: 'ca2',  label: 'CA2',  max: 10 },
      { key: 'ca3',  label: 'CA3',  max: 20 },
      { key: 'exam', label: 'Exam', max: 60 },
    ],
  },
  {
    id:    'ca40_midterm',
    label: 'CA 40 only (midterm)',
    components: [
      { key: 'ca', label: 'CA', max: 40 },
    ],
  },
  {
    id:    'ca1_20_ca2_20',
    label: 'CA1 20 + CA2 20',
    components: [
      { key: 'ca1', label: 'CA1', max: 20 },
      { key: 'ca2', label: 'CA2', max: 20 },
    ],
  },
];

const TYPE_OPTIONS = [{ value: 'full', label: 'Full Term' }, { value: 'midterm', label: 'Mid-Term' }];
const TERM_OPTIONS = [{ value: '', label: 'Select term…' }, ...TERMS.map(t => ({ value: t, label: t }))];
const AFFECTIVE_TRAITS = ['Punctuality', 'Neatness', 'Cooperation', 'Attentiveness', 'Creativity', 'Leadership', 'Sports', 'Clubs'];
const TRAIT_OPTIONS = ['Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map(v => ({ value: v, label: v }));

function calcGrade(score: number): { grade: string; remark: string } {
  for (const g of GRADE_SCALE) {
    if (score >= g.min) return { grade: g.grade, remark: g.remark };
  }
  return { grade: 'F9', remark: 'Fail' };
}

function emptySubject(): SubjectResult {
  return { name: '', ca: 0, exam: 0, total: 0, grade: '', remark: '', bf1: undefined, bf2: undefined };
}

export default function ResultEntry({ result, defaultClass, defaultTerm, defaultSession, onSaved, onCancel }: Props) {
  const { success, error: showError } = useToast();

  const [loading,     setLoading]    = useState(false);
  const [searching,   setSearching]  = useState(false);
  const [students,    setStudents]   = useState<Student[]>([]);
  const [selectedId,  setSelectedId] = useState(result?.student_id ?? '');

  // ── Class state: picked from dynamic school-class list ───────────
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [cls,  setCls]  = useState(result?.class ?? defaultClass ?? '');

  // ── SSS department (only shown for SS 1/2/3) ─────────────────────
  const [sssDept, setSssDept] = useState<SssDept>('Science');

  const [term,    setTerm]    = useState(result?.term    ?? defaultTerm    ?? '');
  const [session, setSession] = useState(result?.session ?? defaultSession ?? '');
  const [rType,   setRType]   = useState<'full'|'midterm'>(result?.result_type ?? 'full');
  const [subjects,  setSubjects]  = useState<SubjectResult[]>(result?.subjects?.length ? result.subjects : [emptySubject()]);
  const [affective, setAffective] = useState<AffectiveRecord>(result?.affective ?? {});

  // ── Teacher name: auto-detected, not manually typed ───────────────
  const [teacherName,        setTeacherName]        = useState(result?.teacher_name ?? '');
  const [teacherComment,     setTeacherComment]     = useState(result?.teacher_comment ?? '');
  const [principalComment,   setPrincipalComment]   = useState(result?.principal_comment ?? '');
  const [aiTeacherLoading,   setAiTeacherLoading]   = useState(false);
  const [aiPrincipalLoading, setAiPrincipalLoading] = useState(false);

  // §5: subject → assigned teacher name map
  const [subjectAssignments, setSubjectAssignments] = useState<Record<string, string>>({});

  // ── Score scheme ──────────────────────────────────────────────────
  const [activeSchemeId, setActiveSchemeId] = useState(SCORE_SCHEMES[0].id);
  const activeScheme = SCORE_SCHEMES.find(s => s.id === activeSchemeId) ?? SCORE_SCHEMES[0];
  // scoreErrors: { subjectIdx: { componentKey: errorMsg } }
  const [scoreErrors, setScoreErrors] = useState<Record<number, Record<string, string>>>({});

  const hasBf1 = term === '2nd Term' || term === '3rd Term';
  const hasBf2 = term === '3rd Term';
  const showSssDept = isSSS(cls);

  // ── 1. Load school's active classes on mount ─────────────────────
  useEffect(() => {
    setClassesLoading(true);
    // §2d: also fetch active session to auto-fill term/session
    Promise.all([
      fetch('/api/schools/classes').then(r => r.json()),
      fetch('/api/sessions').then(r => r.json()),
    ]).then(([classData, sessData]) => {
      if (classData.success) {
        const active: SchoolClass[] = (classData.classes ?? []).filter((c: SchoolClass) => c.is_active);
        setSchoolClasses(active);
      }
      if (sessData.success) {
        const cur = (sessData.sessions ?? []).find((s: { is_current: boolean; label: string; current_term?: string }) => s.is_current);
        if (cur) {
          setTerm(t  => t  || (cur.current_term ?? ''));
          setSession(s => s || (cur.label        ?? ''));
        }
      }
    }).finally(() => setClassesLoading(false));
  }, []);

  const CLASS_OPTIONS = [
    { value: '', label: classesLoading ? 'Loading classes…' : 'Select class…' },
    ...schoolClasses.map(c => ({ value: c.name, label: c.name })),
  ];

  // ── 2. Auto-detect class teacher when class changes ───────────────
  useEffect(() => {
    if (!cls) {
      setTeacherName('');
      return;
    }
    // Bug E: don't overwrite if editing an existing result that already has a teacher
    // and the class hasn't changed from the original result
    if (result?.teacher_name && cls === result?.class) return;

    fetch('/api/teachers')
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const teachers: TeacherRow[] = d.teachers ?? [];
        const classTeacher = teachers.find(t => {
          if (!t.is_class_teacher) return false;
          const assigned: string[] = t.classes?.length ? t.classes : (t.class ? [t.class] : []);
          return assigned.includes(cls);
        });
        setTeacherName(classTeacher?.name ?? '');
      })
      .catch(() => {/* silently ignore */});
  }, [cls]);

  // ── 3. Load students + subject assignments when class/term/session changes ──
  useEffect(() => {
    if (!cls || !term || !session) { setStudents([]); return; }
    setSearching(true);
    // Students fetched by class only — not filtered by term/session so all enrolled students appear
    const p = new URLSearchParams({ class: cls });
    fetch(`/api/students?${p}`)
      .then(r => r.json())
      .then(d => { if (d.success) setStudents(d.students ?? []); })
      .finally(() => setSearching(false));

    // §5: fetch subject → teacher assignments for display pills
    const ap = new URLSearchParams({ class: cls, term, session });
    Promise.all([
      fetch(`/api/subjects/assignments?${ap}`).then(r => r.json()),
      fetch('/api/teachers').then(r => r.json()),
    ]).then(([aData, tData]) => {
      if (!aData.success || !tData.success) return;
      const teacherMap: Record<number, string> = {};
      for (const t of (tData.teachers ?? [])) teacherMap[t.id] = t.name;
      const map: Record<string, string> = {};
      for (const a of (aData.assignments ?? [])) {
        if (a.subject_name && a.teacher_id) map[a.subject_name] = teacherMap[a.teacher_id] ?? '';
      }
      setSubjectAssignments(map);
    }).catch(() => {});
  }, [cls, term, session]);

  // ── 4. Fetch class subjects and pre-populate table ────────────────
  useEffect(() => {
    if (!cls) return;
    // Only auto-populate when creating a new result (not editing)
    if (result) return;

    const schoolClass = schoolClasses.find(c => c.name === cls);
    if (!schoolClass) return;

    const url = showSssDept
      ? `/api/schools/classes/subjects?class_id=${schoolClass.id}&department=${sssDept}`
      : `/api/schools/classes/subjects?class_id=${schoolClass.id}`;

    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.subjects) && d.subjects.length > 0) {
          setSubjects(d.subjects.map((s: { name: string }) => ({
            ...emptySubject(),
            name: s.name,
          })));
        }
      })
      .catch(() => {/* silently ignore */});
  // Re-run when class or (for SSS) department changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls, sssDept, schoolClasses]);

  const recalcSubject = useCallback((idx: number, field: keyof SubjectResult, val: string | number) => {
    setSubjects(prev => {
      const updated = [...prev];
      const s = { ...updated[idx], [field]: val };
      // Recalculate total from all scheme components
      const compTotal = activeScheme.components.reduce((sum, comp) => {
        return sum + (Number((s as Record<string, unknown>)[comp.key]) || 0);
      }, 0);
      s.total = compTotal;
      // Legacy: keep ca = first component, exam = last if 2 components
      if (activeScheme.components.length >= 2) {
        s.ca   = Number((s as Record<string, unknown>)[activeScheme.components[0].key]) || 0;
        s.exam = Number((s as Record<string, unknown>)[activeScheme.components[activeScheme.components.length - 1].key]) || 0;
      } else if (activeScheme.components.length === 1) {
        s.ca   = Number((s as Record<string, unknown>)[activeScheme.components[0].key]) || 0;
        s.exam = 0;
        s.total = s.ca;
      }
      const { grade, remark } = calcGrade(s.total);
      s.grade  = grade;
      s.remark = remark;
      updated[idx] = s;
      return updated;
    });
  }, [activeScheme]);

  function validateScore(idx: number, compKey: string, val: number, maxVal: number) {
    setScoreErrors(prev => {
      const subErrs = { ...(prev[idx] ?? {}) };
      if (val > maxVal) {
        subErrs[compKey] = `Max ${maxVal}`;
      } else {
        delete subErrs[compKey];
      }
      return { ...prev, [idx]: subErrs };
    });
    // Clamp
    return Math.min(val, maxVal);
  }

  function handleSchemeChange(schemeId: string) {
    setActiveSchemeId(schemeId);
    setScoreErrors({});
    // Reset subject scores to zero for new scheme
    setSubjects(prev => prev.map(s => {
      const reset: SubjectResult = { ...s, ca: 0, exam: 0, total: 0 };
      // Clear extra component keys
      SCORE_SCHEMES.forEach(sc => sc.components.forEach(c => {
        (reset as Record<string, unknown>)[c.key] = 0;
      }));
      return reset;
    }));
  }

  const hasScoreErrors = Object.values(scoreErrors).some(errs => Object.keys(errs).length > 0);

  function addSubject()            { setSubjects(p => [...p, emptySubject()]); }
  function removeSubject(i: number){ setSubjects(p => p.filter((_, idx) => idx !== i)); }

  // ── AI Comment Helpers (local generation — no external API) ─────
  const selectedStudentForAi = students.find(s => String(s.id) === String(selectedId));
  const avgForAi = subjects.length ? subjects.reduce((a, s) => a + (Number(s.total) || 0), 0) / subjects.length : null;

  // Preset comment banks for variety
  const TEACHER_COMMENT_BANKS: Record<string, string[]> = {
    high: [
      '{first} has demonstrated exceptional academic performance this term, excelling across all subjects. Keep up this outstanding work!',
      '{first} has shown remarkable dedication and intellectual ability this term. It is a pleasure having such a committed student in class.',
      'Outstanding work this term, {first}! Your consistent efforts and enthusiasm have resulted in an impressive performance.',
      '{first} has excelled tremendously this term. Your strong grasp of concepts and diligence are truly commendable.',
    ],
    good: [
      '{first} has performed commendably this term. With continued effort and revision, even greater achievements are within reach.',
      'A good performance from {first} this term. I encourage you to maintain this momentum and push for excellence next term.',
      '{first} has shown good understanding across subjects. Sustained dedication will yield outstanding results in future terms.',
      'Well done, {first}! Your hard work is paying off. Continue to stay focused and seek clarification where needed.',
    ],
    average: [
      '{first} has shown satisfactory performance this term. With more consistent study and attention to details, improvement is certain.',
      '{first} performed adequately this term. I encourage more engagement in class activities and regular revision.',
      'A fair performance, {first}. Dedicating more time to studies and seeking teachers\' help will lead to better results.',
      '{first} has made reasonable effort this term. Improvement in weaker subjects will significantly boost overall performance.',
    ],
    low: [
      '{first} needs to put in considerably more effort. Regular study, punctual attendance, and seeking help will make a great difference.',
      '{first} has significant room for improvement. I strongly encourage more dedication, focus during lessons, and consistent study habits.',
      'This term\'s performance falls below expectations for {first}. A more serious approach to academics is urgently needed next term.',
      '{first} must make academic improvement a priority. Attending extra lessons and revising regularly will help turn results around.',
    ],
  };

  const PRINCIPAL_COMMENT_BANKS: Record<string, string[]> = {
    high: [
      '{first}\'s outstanding performance this term is highly commendable. This school is proud of your achievements; maintain this excellence.',
      'It is with great pride that I commend {first}\'s exceptional academic performance. Continue to be an example for your peers.',
      '{first} has excelled remarkably. I encourage you to sustain this excellent standard and aspire to even greater accomplishments.',
      'Congratulations, {first}, on an outstanding term. Your performance reflects hard work, discipline, and dedication.',
    ],
    good: [
      '{first} has performed well this term. I encourage you to remain consistent and channel your efforts towards academic excellence.',
      'A commendable performance from {first}. I urge you to build on this progress and aim for the top in the next term.',
      '{first} shows good promise. With sustained effort and the right attitude, the sky is truly the limit for you.',
      'Well done, {first}. I encourage you to keep up this positive trend and challenge yourself to achieve greater heights.',
    ],
    average: [
      '{first}\'s performance this term is satisfactory, but I know you can do better. I urge a stronger commitment to academic work.',
      '{first} has performed acceptably, but there is clear room for improvement. More discipline and focus are required going forward.',
      'I expect more from {first} in the coming term. The potential is evident; what is needed is consistent hard work and determination.',
      '{first}, your performance shows you are capable. I encourage you to put in the extra effort needed to reach your full potential.',
    ],
    low: [
      '{first}\'s performance this term is a cause for concern. I strongly advise improved study habits and regular engagement with teachers.',
      'I am calling on {first} to take academic responsibilities more seriously. Significant improvement is expected in the next term.',
      '{first} must urgently address the academic challenges evident this term. Seek guidance from teachers and commit to improvement.',
      'The performance recorded for {first} this term must improve. I urge parents and guardians to support {first} in this area.',
    ],
  };

  function pickComment(bank: Record<string, string[]>, name: string, avg: number | null): string {
    const first = name.split(' ')[0];
    let tier = 'average';
    if (!avg || avg < 45) tier = 'low';
    else if (avg >= 70) tier = 'high';
    else if (avg >= 55) tier = 'good';
    const pool = bank[tier] ?? bank['average'];
    const template = pool[Math.floor(Math.random() * pool.length)];
    return template.replace(/\{first\}/g, first);
  }

  function generateAiComment(role: 'teacher' | 'principal') {
    if (!selectedStudentForAi) { showError('Select a student first.'); return; }
    if (role === 'teacher') {
      setAiTeacherLoading(true);
      setTimeout(() => {
        const comment = pickComment(TEACHER_COMMENT_BANKS, selectedStudentForAi.name, avgForAi);
        setTeacherComment(comment);
        setAiTeacherLoading(false);
      }, 300);
    } else {
      setAiPrincipalLoading(true);
      setTimeout(() => {
        const comment = pickComment(PRINCIPAL_COMMENT_BANKS, selectedStudentForAi.name, avgForAi);
        setPrincipalComment(comment);
        setAiPrincipalLoading(false);
      }, 300);
    }
  }

  async function handleSave() {
    if (!selectedId) { showError('Select a student first.'); return; }
    if (!subjects.length || !subjects[0].name) { showError('Add at least one subject.'); return; }
    if (hasScoreErrors) { showError('Fix score errors before saving.'); return; }
    setLoading(true);
    try {
      const body = {
        studentId: selectedId, resultType: rType, subjects,
        affective, teacherName, teacherComment, principalComment,
      };
      const res  = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success(`Result saved! Average: ${data.avg?.toFixed?.(1) ?? data.avg}`);
      onSaved();
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  // ── Selected student (for photo preview) ─────────────────────────
  const selectedStudent = students.find(s => s.id === selectedId);

  const totalObtainable = subjects.length * 100;
  const totalObtained   = subjects.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const average         = subjects.length ? (totalObtained / subjects.length).toFixed(1) : '0.0';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">
          {result ? 'Edit Result' : 'Enter Result'}
        </h2>
        <Button onClick={handleSave} loading={loading}>
          <Save size={15} /> Save Result
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        {/* Class: dynamic from DB, not ALL_CLASSES */}
        <Select
          label="Class *"
          options={CLASS_OPTIONS}
          value={cls}
          onChange={e => { setCls(e.target.value); setSelectedId(''); }}
          disabled={classesLoading}
        />
        <Select label="Term *"  options={TERM_OPTIONS}  value={term} onChange={e => { setTerm(e.target.value); setSelectedId(''); }} />
        <Input  label="Session *" placeholder="e.g. 2025/2026" value={session} onChange={e => { setSession(e.target.value); setSelectedId(''); }} />
        <Select label="Result Type" options={TYPE_OPTIONS} value={rType} onChange={e => setRType(e.target.value as 'full'|'midterm')} />
      </div>

      {/* SSS Department selector (only for SS 1/2/3) */}
      {showSssDept && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Department:</span>
          {SSS_DEPTS.map(dept => (
            <button
              key={dept}
              onClick={() => setSssDept(dept)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                sssDept === dept
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-400'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* Student picker — with photo */}
      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Student *</label>
        {searching ? (
          <div className="flex items-center gap-2 text-sm text-gray-500"><Spinner size="sm" /> Loading students…</div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              className="w-full md:w-80 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            >
              <option value="">— Select student —</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.adm})</option>
              ))}
            </select>

            {/* Student passport photo */}
            {selectedStudent && (
              <div className="flex items-center gap-2">
                {selectedStudent.passport ? (
                  <img
                    src={selectedStudent.passport.startsWith('data:') ? selectedStudent.passport : `data:image/jpeg;base64,${selectedStudent.passport}`}
                    alt={selectedStudent.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-orange-300 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold border-2 border-gray-300 dark:border-gray-600">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">{selectedStudent.adm}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score scheme preset bar */}
      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Score Scheme</p>
        <div className="flex flex-wrap gap-1.5">
          {SCORE_SCHEMES.map(scheme => (
            <button
              key={scheme.id}
              onClick={() => handleSchemeChange(scheme.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                activeSchemeId === scheme.id
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-orange-400'
              }`}
            >
              {scheme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects table */}
      <div className="mb-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
              {activeScheme.components.map(comp => (
                <th key={comp.key} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">
                  {comp.label} <span className="font-normal text-gray-400">/{comp.max}</span>
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">Total</th>
              {hasBf1 && <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">BF 1st</th>}
              {hasBf2 && <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-20">BF 2nd</th>}
              <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase w-16">Grade</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase w-28">Remark</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {subjects.map((s, i) => (
              <tr key={i} className="bg-white dark:bg-gray-900">
                <td className="px-2 py-1.5">
                  <input
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 min-w-[140px]"
                    placeholder="Subject name"
                    value={s.name}
                    onChange={e => recalcSubject(i, 'name', e.target.value)}
                  />
                  {/* §5: show assigned teacher pill */}
                  {s.name && subjectAssignments[s.name] && (
                    <span className="mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                      {subjectAssignments[s.name]}
                    </span>
                  )}
                </td>
                {activeScheme.components.map(comp => {
                  const compVal = Number((s as Record<string, unknown>)[comp.key]) || 0;
                  const compErr = scoreErrors[i]?.[comp.key];
                  return (
                    <td key={comp.key} className="px-2 py-1.5">
                      <div className="relative">
                        <input type="number" min={0} max={comp.max}
                          className={`w-full rounded border px-2 py-1 text-sm text-center focus:outline-none ${
                            compErr
                              ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 focus:border-red-500'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-500'
                          }`}
                          value={compVal || ''}
                          onChange={e => {
                            const raw = Number(e.target.value) || 0;
                            recalcSubject(i, comp.key as keyof SubjectResult, raw);
                          }}
                          onBlur={e => {
                            const raw = Number(e.target.value) || 0;
                            const clamped = validateScore(i, comp.key, raw, comp.max);
                            if (clamped !== raw) recalcSubject(i, comp.key as keyof SubjectResult, clamped);
                          }}
                        />
                        {compErr && (
                          <span className="absolute -bottom-4 left-0 text-[10px] text-red-500 whitespace-nowrap">{compErr}</span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300">{s.total}</td>
                {hasBf1 && (
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={100}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      value={s.bf1 ?? ''} onChange={e => recalcSubject(i, 'bf1', e.target.value === '' ? undefined as unknown as number : Number(e.target.value))}
                    />
                  </td>
                )}
                {hasBf2 && (
                  <td className="px-2 py-1.5">
                    <input type="number" min={0} max={100}
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
                      value={s.bf2 ?? ''} onChange={e => recalcSubject(i, 'bf2', e.target.value === '' ? undefined as unknown as number : Number(e.target.value))}
                    />
                  </td>
                )}
                <td className="px-2 py-1.5 text-center">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${s.grade?.startsWith('A') ? 'bg-green-100 text-green-700' : s.grade?.startsWith('B') ? 'bg-blue-100 text-blue-700' : s.grade?.startsWith('C') ? 'bg-yellow-100 text-yellow-700' : s.grade?.startsWith('F') ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                    {s.grade || '—'}
                  </span>
                </td>
                <td className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">{s.remark || '—'}</td>
                <td className="px-2 py-1.5">
                  {subjects.length > 1 && (
                    <button onClick={() => removeSubject(i)} className="text-red-400 hover:text-red-600 p-0.5"><Trash2 size={13} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 dark:bg-gray-800/50">
              <td colSpan={hasBf2 ? activeScheme.components.length + 5 : hasBf1 ? activeScheme.components.length + 4 : activeScheme.components.length + 3} className="px-3 py-2">
                <button onClick={addSubject} className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium">
                  <Plus size={14} /> Add Subject
                </button>
              </td>
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <td className="px-3 py-2 text-xs text-gray-500">
                Subjects: {subjects.length}
              </td>
              <td colSpan={activeScheme.components.length} />
              <td className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                {totalObtained}/{totalObtainable}
              </td>
              {hasBf1 && <td />}
              {hasBf2 && <td />}
              <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-orange-600">
                Avg: {average}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Affective domain */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Affective Domain</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {AFFECTIVE_TRAITS.map(trait => (
            <div key={trait}>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">{trait}</label>
              <select
                value={(affective as Record<string, string>)[trait.toLowerCase()] ?? ''}
                onChange={e => setAffective(a => ({ ...a, [trait.toLowerCase()]: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs px-2 py-1.5 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              >
                <option value="">—</option>
                {TRAIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Comments — teacher name is auto-detected (read-only display) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Teacher name: auto-detected, not a free-text input */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Class Teacher</label>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 min-h-[38px]">
            {teacherName ? (
              <span className="text-sm text-gray-900 dark:text-gray-100">{teacherName}</span>
            ) : (
              <span className="text-sm text-gray-400 italic">
                {cls ? 'No class teacher assigned' : 'Select a class first'}
              </span>
            )}
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Teacher Comment</label>
            <button
              onClick={() => generateAiComment('teacher')}
              disabled={aiTeacherLoading || !selectedId}
              className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Generate comment based on student's performance"
            >
              <Sparkles size={12} className={aiTeacherLoading ? 'animate-spin' : ''} />
              {aiTeacherLoading ? 'Generating…' : 'AI Generate'}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 resize-none"
            rows={3} value={teacherComment} onChange={e => setTeacherComment(e.target.value)}
            placeholder="Class teacher's comment…"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Principal Comment</label>
            <button
              onClick={() => generateAiComment('principal')}
              disabled={aiPrincipalLoading || !selectedId}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Generate principal remark based on student's performance"
            >
              <Sparkles size={12} className={aiPrincipalLoading ? 'animate-spin' : ''} />
              {aiPrincipalLoading ? 'Generating…' : 'AI Generate'}
            </button>
          </div>
          <textarea
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 resize-none"
            rows={3} value={principalComment} onChange={e => setPrincipalComment(e.target.value)}
            placeholder="Principal's comment…"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSave} loading={loading} className="flex-1">
          <Save size={15} /> Save Result
        </Button>
      </div>
    </div>
  );
}