'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Save, Sparkles, Trash2, Upload } from 'lucide-react';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

import { TERMS } from '@/lib/constants';

interface AcademicSession {
  id: number;
  label: string;
  is_current?: boolean;
  current_term?: string;
}

interface Student {
  id: number;
  name: string;
  adm: string;
}

interface SchoolClass {
  id: number;
  name: string;
}

interface StudentResult {
  avg?: number;
  subjects?: {
    name: string;
    total: number;
  }[];
}

const TERM_OPTIONS = [
  { value: '', label: 'Select term…' },
  ...TERMS.map((t) => ({
    value: t,
    label: t,
  })),
];

const COMMENT_BANKS: Record<string, string[]> = {
  high: [
    '{first} has demonstrated exceptional academic performance this term. Keep up the excellent work.',
    '{first} continues to excel academically and shows strong dedication to studies.',
    'Outstanding performance this term, {first}. Your commitment to excellence is commendable.',
  ],
  good: [
    '{first} has performed very well this term. Continued effort will lead to even greater success.',
    '{first} is making commendable progress academically. Keep pushing forward.',
    'A very good effort from {first} this term. Stay focused and consistent.',
  ],
  average: [
    '{first} has shown satisfactory performance this term. More dedication will improve results.',
    '{first} is making fair progress academically. Greater consistency is encouraged.',
    '{first} should devote more time to revision and class participation.',
  ],
  low: [
    '{first} needs to put more effort into studies next term.',
    '{first} must become more focused and committed to academic improvement.',
    'Academic performance requires urgent improvement. Consistent study habits are encouraged for {first}.',
  ],
};

function generateFallbackComment(
  name: string,
  avg: number | null,
  type: 'teacher' | 'principal'
) {
  const first = name.split(' ')[0];

  let tier = 'average';

  if (avg === null || avg < 45) tier = 'low';
  else if (avg >= 70) tier = 'high';
  else if (avg >= 55) tier = 'good';

  const pool = COMMENT_BANKS[tier];
  const text = pool[Math.floor(Math.random() * pool.length)];

  if (type === 'principal') {
    return `Principal's Remark: ${text.replace(/\{first\}/g, first)}`;
  }

  return text.replace(/\{first\}/g, first);
}

export default function CommentSignature() {
  const { teacher, is_teacher } = useAuth();
  const { success, error: showError } = useToast();

  const [cls, setCls] = useState(teacher?.class ?? '');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');

  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [activeClasses, setActiveClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedId, setSelectedId] = useState('');
  const [selectedStudent, setSelectedStudent] =
    useState<Student | null>(null);

  const [studentResult, setStudentResult] =
    useState<StudentResult | null>(null);

  const [comment, setComment] = useState('');
  const [principal, setPrincipal] = useState('');

  const [sigPreview, setSigPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrincipalLoading, setAiPrincipalLoading] = useState(false);

  const sigRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setActiveClasses(d.classes ?? []);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (teacher?.signature) {
      setSigPreview(teacher.signature);
    }

    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setSessions(d.sessions ?? []);

          const cur = (d.sessions ?? []).find(
            (s: AcademicSession) => s.is_current
          );

          if (cur) {
            setSession(cur.label);
            setTerm(cur.current_term ?? '');
          }
        }
      });
  }, [teacher]);

  useEffect(() => {
    if (!cls || !term || !session) {
      setStudents([]);
      return;
    }

    setSearching(true);

    const p = new URLSearchParams({
      class: cls,
      term,
      session,
    });

    fetch(`/api/students?${p}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setStudents(d.students ?? []);
        }
      })
      .finally(() => setSearching(false));
  }, [cls, term, session]);

  useEffect(() => {
    const s = students.find(
      (st) => String(st.id) === String(selectedId)
    );

    setSelectedStudent(s ?? null);

    if (!selectedId || !term || !session) {
      setComment('');
      setPrincipal('');
      setStudentResult(null);
      return;
    }

    fetch(
      `/api/results?student_id=${selectedId}&term=${encodeURIComponent(
        term
      )}&session=${encodeURIComponent(
        session
      )}&result_type=full`
    )
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.results?.length) {
          const r = d.results[0];

          setComment(r.teacher_comment ?? '');
          setPrincipal(r.principal_comment ?? '');

          setStudentResult({
            avg: r.avg,
            subjects: r.subjects,
          });
        } else {
          setComment('');
          setPrincipal('');
          setStudentResult(null);
        }
      });
  }, [selectedId, term, session, students]);

  function generateTeacherComment() {
    if (!selectedStudent) {
      showError('Select a student first.');
      return;
    }

    setAiLoading(true);

    setTimeout(() => {
      setComment(
        generateFallbackComment(
          selectedStudent.name,
          studentResult?.avg ?? null,
          'teacher'
        )
      );

      setAiLoading(false);
    }, 400);
  }

  function generatePrincipalComment() {
    if (!selectedStudent) {
      showError('Select a student first.');
      return;
    }

    setAiPrincipalLoading(true);

    setTimeout(() => {
      setPrincipal(
        generateFallbackComment(
          selectedStudent.name,
          studentResult?.avg ?? null,
          'principal'
        )
      );

      setAiPrincipalLoading(false);
    }, 400);
  }

  function handleSigUpload(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (file.size > 1.5 * 1024 * 1024) {
      showError('Signature image must be under 1.5MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setSigPreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!selectedId) {
      showError('Select a student.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId: selectedId,
          resultType: 'full',
          subjects: [],
          teacherComment: comment,
          // Only include principalComment when the logged-in user is not a plain teacher
          ...(!is_teacher && { principalComment: principal }),
          teacherName: teacher?.name ?? '',
          _commentOnly: true,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showError(data.error ?? 'Failed to save comment.');
        return;
      }

      if (
        sigPreview &&
        sigPreview !== teacher?.signature
      ) {
        await fetch('/api/teachers/password', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signature: sigPreview,
          }),
        });
      }

      success('Comment saved successfully!');
    } catch {
      showError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  const classOptions = [
    {
      value: '',
      label: 'Select class…',
    },
    ...activeClasses.map((c) => ({
      value: c.name,
      label: c.name,
    })),
  ];

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Comments & Signature
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <Select
          label="Class"
          options={classOptions}
          value={cls}
          onChange={(e) => {
            setCls(e.target.value);
            setSelectedId('');
          }}
        />

        <Select
          label="Term"
          options={TERM_OPTIONS}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setSelectedId('');
          }}
        />

        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Session
          </label>

          <select
            value={session}
            onChange={(e) => {
              setSession(e.target.value);
              setSelectedId('');
            }}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
          >
            <option value="">Select…</option>

            {sessions.map((s) => (
              <option key={s.id} value={s.label}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
          Student
        </label>

        {searching ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner size="sm" />
            Loading…
          </div>
        ) : (
          <select
            value={selectedId}
            onChange={(e) =>
              setSelectedId(e.target.value)
            }
            className="w-full md:w-80 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2"
          >
            <option value="">— Select student —</option>

            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.adm})
              </option>
            ))}
          </select>
        )}

        {selectedStudent &&
          studentResult?.avg != null && (
            <p className="text-xs text-gray-500 mt-1">
              Average:{' '}
              <strong>
                {studentResult.avg.toFixed(1)}%
              </strong>
            </p>
          )}
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Teacher Comment
            </label>

            <button
              onClick={generateTeacherComment}
              disabled={aiLoading || !selectedId}
              className="inline-flex items-center gap-1.5 text-xs text-purple-600"
            >
              {aiLoading ? (
                <Loader2
                  size={12}
                  className="animate-spin"
                />
              ) : (
                <Sparkles size={12} />
              )}

              {aiLoading
                ? 'Generating…'
                : 'AI Generate'}
            </button>
          </div>

          <textarea
            rows={3}
            value={comment}
            onChange={(e) =>
              setComment(e.target.value)
            }
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 resize-none"
          />
        </div>

        {!is_teacher && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Principal Comment
              </label>

              <button
                onClick={generatePrincipalComment}
                disabled={
                  aiPrincipalLoading || !selectedId
                }
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600"
              >
                {aiPrincipalLoading ? (
                  <Loader2
                    size={12}
                    className="animate-spin"
                  />
                ) : (
                  <Sparkles size={12} />
                )}

                {aiPrincipalLoading
                  ? 'Generating…'
                  : 'AI Generate'}
              </button>
            </div>

            <textarea
              rows={3}
              value={principal}
              onChange={(e) =>
                setPrincipal(e.target.value)
              }
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 resize-none"
            />
          </div>
        )}
      </div>

      <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Your Signature
        </p>

        <div className="flex items-center gap-4">
          {sigPreview ? (
            <div className="relative">
              <img
                src={sigPreview}
                alt="signature"
                className="h-14 max-w-[150px] object-contain border border-gray-200 rounded bg-white p-1"
              />

              <button
                onClick={() => {
                  setSigPreview(null);

                  if (sigRef.current) {
                    sigRef.current.value = '';
                  }
                }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"
              >
                <Trash2 size={9} />
              </button>
            </div>
          ) : (
            <div className="w-24 h-14 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
              None
            </div>
          )}

          <div>
            <input
              ref={sigRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleSigUpload}
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                sigRef.current?.click()
              }
            >
              <Upload size={13} />
              Upload Signature
            </Button>
          </div>
        </div>
      </div>

      <Button
        onClick={handleSave}
        loading={loading}
      >
        <Save size={15} />
        Save Comment
      </Button>
    </div>
  );
}
