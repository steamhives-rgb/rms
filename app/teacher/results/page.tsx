// /app/teacher/results/page.tsx
// Teacher results query view — list and search results entered by this teacher
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { AcademicSession } from '@/lib/types';

interface ResultRow {
  id: string;
  student_name: string;
  student_adm: string;
  class: string;
  term: string;
  session: string;
  result_type: string;
  avg: number;
  grade: string;
  position: number | null;
  out_of: number | null;
  created_at: string;
}

export default function TeacherResultsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { teacher } = useAuth();
  const { error: showError } = useToast();

  const [results,  setResults]  = useState<ResultRow[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [sessions, setSessions] = useState<AcademicSession[]>([]);

  // Pre-fill filters from query params (set by ResultEntryForm after save)
  const [filterClass,   setFilterClass]   = useState(params.get('class')   ?? '');
  const [filterTerm,    setFilterTerm]    = useState(params.get('term')    ?? '');
  const [filterSession, setFilterSession] = useState(params.get('session') ?? '');

  // Fetch sessions for the dropdown
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSessions(d.sessions ?? []);
          // Only auto-set if not already set from URL param
          if (!filterSession) {
            const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
            if (cur) {
              setFilterSession(cur.label);
              if (!filterTerm) setFilterTerm(cur.current_term ?? '');
            }
          }
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterClass)   p.set('class',   filterClass);
      if (filterTerm)    p.set('term',    filterTerm);
      if (filterSession) p.set('session', filterSession);
      const res  = await fetch(`/api/teachers/results?${p}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results ?? []);
      } else {
        console.error('[teacher/results] API error:', data.error);
        showError(data.error ?? 'Failed to load results.');
      }
    } catch (err) {
      console.error('[teacher/results] fetch error:', err);
      showError('Network error loading results.');
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterTerm, filterSession]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  const filtered = results.filter(r =>
    !search ||
    r.student_name.toLowerCase().includes(search.toLowerCase()) ||
    r.student_adm.toLowerCase().includes(search.toLowerCase())
  );

  // Derive unique classes from teacher assignment
  const teacherClasses: string[] = teacher?.classes?.length
    ? teacher.classes
    : (teacher?.class ? [teacher.class] : []);

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/teacher')}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Results Query</h1>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        {/* Class */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Class</label>
          <select
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">All classes</option>
            {teacherClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Term */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Term</label>
          <select
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">All terms</option>
            {['1st Term', '2nd Term', '3rd Term'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Session */}
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 block mb-1">Session</label>
          <select
            value={filterSession}
            onChange={e => setFilterSession(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
          >
            <option value="">All sessions</option>
            {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by student name or admission number…"
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Results table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : !filtered.length ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium text-gray-600 dark:text-gray-400">No results found</p>
          <p className="text-sm mt-1">Adjust the filters above or enter results first.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Adm</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Class</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Term</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Avg</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Grade</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(r => (
                <tr key={r.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">{r.student_name}</td>
                  <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 font-mono text-xs">{r.student_adm}</td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.class}</td>
                  <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">{r.term}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800 dark:text-gray-200">
                    {typeof r.avg === 'number' ? r.avg.toFixed(1) : r.avg}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      r.grade?.startsWith('A') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      r.grade?.startsWith('B') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      r.grade?.startsWith('F') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {r.grade || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500 dark:text-gray-400 text-xs">
                    {r.position ? `${r.position}/${r.out_of}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <tr>
                <td colSpan={7} className="px-3 py-2 text-xs text-gray-500">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  {results.length !== filtered.length ? ` (filtered from ${results.length})` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
