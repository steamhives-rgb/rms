// BroadsheetViewer dashboard component
'use client';
// BroadsheetViewer — tabular view of all students' results for a class/term/session
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { TERMS } from '@/lib/constants';
import type { Result, AcademicSession } from '@/lib/types';

interface Props {
  defaultClass?: string;
  defaultTerm?: string;
  defaultSession?: string;
  onBack: () => void;
}
const TERM_OPTIONS  = [{ value: '', label: 'Select term…'  }, ...TERMS.map(t => ({ value: t, label: t }))];
const TYPE_OPTIONS  = [{ value: 'full', label: 'Full Term' }, { value: 'midterm', label: 'Mid-Term' }];

export default function BroadsheetViewer({ defaultClass, defaultTerm, defaultSession, onBack }: Props) {
  const [results,       setResults]       = useState<Result[]>([]);
  const [sessions,      setSessions]      = useState<AcademicSession[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<{ id: number; name: string }[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [cls,           setCls]           = useState(defaultClass   ?? '');
  const [term,          setTerm]          = useState(defaultTerm    ?? '');
  const [session,       setSession]       = useState(defaultSession ?? '');
  const [rType,         setRType]         = useState('full');
  const printRef = useRef<HTMLDivElement>(null);

  // §1: fetch classes from DB (not hardcoded)
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => { if (d.success) setSchoolClasses(d.classes ?? []); })
      .catch(() => {});
  }, []);

  const CLASS_OPTIONS = [
    { value: '', label: 'Select class…' },
    ...schoolClasses.map(c => ({ value: c.name, label: c.name })),
  ];

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        setSessions(d.sessions ?? []);
        // Bug B: auto-select the active session if no default provided
        if (!defaultSession && !defaultTerm) {
          const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
          if (cur) {
            if (!session) setSession(cur.label);
            if (!term)    setTerm(cur.current_term ?? '');
          }
        }
      }
    });
  }, []);

  async function fetchBroadsheet() {
    if (!cls || !term || !session) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ class: cls, term, session, result_type: rType });
      const res  = await fetch(`/api/results/broadsheet?${p}`);
      const data = await res.json();
      if (data.success) setResults(data.results ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchBroadsheet(); }, [cls, term, session, rType]);

  // Collect all unique subject names across all students
  const allSubjects = Array.from(new Set(
    results.flatMap(r => (r.subjects ?? []).map((s: {name: string}) => s.name))
  )).filter(Boolean);

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Broadsheet — ${cls} ${term} ${session}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; margin: 10mm; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 4px 6px; }
        th { background: #f0f0f0; font-weight: 600; }
        .center { text-align: center; }
      </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Broadsheet</h2>
        {results.length > 0 && (
          <Button size="sm" variant="outline" onClick={handlePrint}><Printer size={15} /> Print</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <Select label="Class" options={CLASS_OPTIONS} value={cls} onChange={e => setCls(e.target.value)} wrapperClass="w-36" />
        <Select label="Term"  options={TERM_OPTIONS}  value={term} onChange={e => setTerm(e.target.value)} wrapperClass="w-32" />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Session</label>
          <select value={session} onChange={e => setSession(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-32"
          >
            <option value="">Select…</option>
            {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <Select label="Type" options={TYPE_OPTIONS} value={rType} onChange={e => setRType(e.target.value)} wrapperClass="w-28" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !cls || !term || !session ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">Select class, term and session above</p>
        </div>
      ) : !results.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No results found</p>
          <p className="text-sm mt-1">Enter results for {cls} students first</p>
        </div>
      ) : (
        <div ref={printRef} className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="p-3 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            {cls} — {term} {session} Broadsheet ({results.length} students)
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 sticky left-0 bg-gray-50 dark:bg-gray-800">#</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 sticky left-6 bg-gray-50 dark:bg-gray-800 min-w-[130px]">Name</th>
                {allSubjects.map(sub => (
                  <th key={sub} className="px-2 py-2 text-center font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 min-w-[60px]">
                    <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 80 }}>{sub}</div>
                  </th>
                ))}
                <th className="px-2 py-2 text-center font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 min-w-[50px]">Total</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 min-w-[50px]">Avg</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 min-w-[50px]">Pos</th>
                <th className="px-2 py-2 text-center font-semibold text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 min-w-[40px]">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {results.map((r, idx) => {
                const subMap = Object.fromEntries((r.subjects ?? []).map((s) => [s.name, s]));
                return (
                  <tr key={r.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-3 py-2 text-gray-500 sticky left-0 bg-white dark:bg-gray-900">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 sticky left-6 bg-white dark:bg-gray-900">{r.student_name}</td>
                    {allSubjects.map(sub => {
                      const s = subMap[sub];
                      return (
                        <td key={sub} className="px-2 py-2 text-center border-l border-gray-100 dark:border-gray-800">
                          {s ? (
                            <span className={`font-medium ${Number(s.total) >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                              {s.total}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="px-2 py-2 text-center font-semibold text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-gray-800">{r.overall_total}</td>
                    <td className="px-2 py-2 text-center font-semibold text-orange-600 border-l border-gray-100 dark:border-gray-800">{Number(r.avg).toFixed(1)}</td>
                    <td className="px-2 py-2 text-center text-gray-600 dark:text-gray-400 border-l border-gray-100 dark:border-gray-800">{r.position ?? '—'}</td>
                    <td className="px-2 py-2 text-center border-l border-gray-100 dark:border-gray-800">
                      <span className={`text-xs font-bold ${r.grade?.startsWith('A') ? 'text-green-600' : r.grade?.startsWith('B') ? 'text-blue-600' : r.grade?.startsWith('F') ? 'text-red-600' : 'text-gray-600'}`}>
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}