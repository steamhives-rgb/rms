// AssignedSubjects teacher component

'use client';
import { useState, useEffect } from 'react';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@/components/providers/AuthProvider';
import type { SubjectAssignment, Subject, AcademicSession } from '@/lib/types';

interface EnrichedAssignment extends SubjectAssignment {
  subject_name?: string;
}

export default function AssignedSubjects() {
  const { teacher } = useAuth();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>([]);
  const [subjects,    setSubjects]    = useState<Subject[]>([]);
  const [session,     setSession]     = useState<AcademicSession | null>(null);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/subjects/assignments').then(r => r.json()),
      fetch('/api/subjects').then(r => r.json()),
      fetch('/api/sessions').then(r => r.json()),
    ]).then(([aData, sData, sessData]) => {
      const allSubjects: Subject[] = sData.subjects ?? [];
      setSubjects(allSubjects);
      const cur: AcademicSession | undefined = (sessData.sessions ?? []).find((s: AcademicSession) => s.is_current);
      if (cur) setSession(cur);
      const assigns: SubjectAssignment[] = aData.assignments ?? [];
      // Filter to teacher's assignments (by teacher_id) if possible
      const mine = teacher
        ? assigns.filter(a => a.teacher_id === teacher.id)
        : assigns;
      setAssignments(mine.map(a => ({
        ...a,
        subject_name: allSubjects.find(s => s.id === a.subject_id)?.name ?? `Subject #${a.subject_id}`,
      })));
    }).catch(e => {
      console.error('[AssignedSubjects] fetch error:', e);
    }).finally(() => setLoading(false));
  }, [teacher]);

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner /></div>;

  const grouped = assignments.reduce<Record<string, EnrichedAssignment[]>>((acc, a) => {
    const key = a.class;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">My Assigned Subjects</h3>
        {session && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {session.current_term} — {session.label}
          </p>
        )}
      </div>

      {!assignments.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">No subjects assigned yet</p>
          <p className="text-sm mt-1">Contact your school admin to assign subjects.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cls, items]) => (
            <div key={cls} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{cls}</span>
                {teacher?.class === cls && <Badge variant="success" className="ml-2 text-xs">Class Teacher</Badge>}
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {items.map(a => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-lg text-sm font-medium">
                    {a.subject_name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}