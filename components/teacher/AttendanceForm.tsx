// AttendanceForm teacher component

'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { ALL_CLASSES, TERMS } from '@/lib/constants';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Student, AcademicSession } from '@/lib/types';

const CLASS_OPTIONS = [{ value: '', label: 'Select class…' }, ...ALL_CLASSES.map(c => ({ value: c, label: c }))];
const TERM_OPTIONS  = [{ value: '', label: 'Select term…'  }, ...TERMS.map(t => ({ value: t, label: t }))];
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
type DayStatus = 'present' | 'absent' | 'late';
type DayRecord = { am: DayStatus; pm: DayStatus; late: boolean };
const EMPTY_DAY = (): DayRecord => ({ am: 'present', pm: 'present', late: false });
const CYCLE: DayStatus[] = ['present', 'absent', 'late'];

function statusColor(s: DayStatus) {
  if (s === 'present') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (s === 'absent')  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
}
function statusLabel(s: DayStatus) {
  return s === 'present' ? 'P' : s === 'absent' ? 'A' : 'L';
}

interface WeekOption { value: string; label: string; week_number: number }

export default function AttendanceForm() {
  const { teacher } = useAuth();
  const { success, error: showError } = useToast();
  const [cls,          setCls]         = useState(teacher?.class ?? '');
  const [term,         setTerm]        = useState('');
  const [session,      setSession]     = useState('');
  const [sessions,     setSessions]    = useState<AcademicSession[]>([]);
  const [weeks,        setWeeks]       = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [totalWeeks,   setTotalWeeks]  = useState(14);
  const [students,     setStudents]    = useState<Student[]>([]);
  const [grid,         setGrid]        = useState<Record<string, DayRecord[]>>({});
  const [loadingSt,    setLoadingSt]   = useState(false);
  const [adding,       setAdding]      = useState(false);
  const [saving,       setSaving]      = useState(false);

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        setSessions(d.sessions ?? []);
        const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
        if (cur) { setSession(cur.label); setTerm(cur.current_term ?? ''); setTotalWeeks(cur.attendance_weeks ?? 14); }
      }
    });
  }, []);

  useEffect(() => {
    if (!cls || !term || !session) { setWeeks([]); setSelectedWeek(''); return; }
    fetch(`/api/attendance/config?class=${encodeURIComponent(cls)}&term=${encodeURIComponent(term)}&session=${encodeURIComponent(session)}`)
      .then(r => r.json()).then(d => {
        if (d.success) {
          const ws: WeekOption[] = (d.weeks ?? []).map((w: { week_label: string; week_number: number }) => ({
            value: w.week_label, label: `Week ${w.week_number} of ${d.total_weeks ?? totalWeeks}`, week_number: w.week_number,
          }));
          setWeeks(ws);
          setTotalWeeks(d.total_weeks ?? totalWeeks);
          if (ws.length) setSelectedWeek(ws[ws.length - 1].value);
        }
      });
  }, [cls, term, session]);

  useEffect(() => {
    if (!cls || !term || !session) { setStudents([]); return; }
    setLoadingSt(true);
    const p = new URLSearchParams({ class: cls, term, session });
    fetch(`/api/students?${p}`).then(r => r.json())
      .then(d => {
        if (d.success) {
          const sts: Student[] = d.students ?? [];
          setStudents(sts);
          const init: Record<string, DayRecord[]> = {};
          for (const s of sts) init[s.id] = DAYS.map(() => EMPTY_DAY());
          setGrid(init);
        }
      }).finally(() => setLoadingSt(false));
  }, [cls, term, session]);

  useEffect(() => {
    if (!students.length || !selectedWeek) return;
    const p = new URLSearchParams({ class: cls, term, session, week_label: selectedWeek });
    fetch(`/api/attendance?${p}`).then(r => r.json()).then(d => {
      if (!d.success) return;
      const rows: { student_id: string; days: DayRecord[] | string }[] = d.attendance ?? [];
      if (!rows.length) return;
      setGrid(prev => {
        const next = { ...prev };
        for (const row of rows) {
          let days = row.days;
          if (typeof days === 'string') { try { days = JSON.parse(days); } catch { continue; } }
          if (Array.isArray(days)) next[row.student_id] = DAYS.map((_, i) => days[i] ?? EMPTY_DAY());
        }
        return next;
      });
    });
  }, [students, selectedWeek]);

  const toggleStatus = useCallback((sid: string, di: number, field: 'am' | 'pm') => {
    setGrid(prev => {
      const days = [...(prev[sid] ?? DAYS.map(() => EMPTY_DAY()))];
      const day  = { ...days[di] };
      day[field] = CYCLE[(CYCLE.indexOf(day[field]) + 1) % CYCLE.length];
      days[di] = day;
      return { ...prev, [sid]: days };
    });
  }, []);

  const toggleLate = useCallback((sid: string, di: number) => {
    setGrid(prev => {
      const days = [...(prev[sid] ?? DAYS.map(() => EMPTY_DAY()))];
      days[di] = { ...days[di], late: !days[di].late };
      return { ...prev, [sid]: days };
    });
  }, []);

  async function addWeek() {
    if (!cls || !term || !session) { showError('Select class, term and session.'); return; }
    setAdding(true);
    try {
      const res  = await fetch('/api/attendance/weeks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class: cls, term, session }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      const nw: WeekOption = { value: data.week_label, label: `Week ${data.week_number} of ${totalWeeks}`, week_number: data.week_number };
      setWeeks(prev => prev.find(w => w.value === nw.value) ? prev : [...prev, nw]);
      setSelectedWeek(data.week_label);
      success(data.message ?? 'Week added!');
    } catch { showError('Network error.'); }
    finally { setAdding(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id, class: cls, term, session,
        week_label: selectedWeek, days: grid[s.id] ?? DAYS.map(() => EMPTY_DAY()),
      }));
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      success('Attendance saved!');
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  const weekNum = weeks.find(w => w.value === selectedWeek)?.week_number ?? 0;
  const weekHeader = selectedWeek ? `Week ${weekNum} of ${totalWeeks}` : '';

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">Record Attendance</h3>

      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
        <Select label="Class" options={CLASS_OPTIONS} value={cls} onChange={e => setCls(e.target.value)} wrapperClass="w-36" />
        <Select label="Term"  options={TERM_OPTIONS}  value={term} onChange={e => setTerm(e.target.value)} wrapperClass="w-32" />
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Session</label>
          <select value={session} onChange={e => setSession(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-32">
            <option value="">Select…</option>
            {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Week</label>
          <div className="flex gap-2">
            <select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)} disabled={!weeks.length}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-36 disabled:opacity-50">
              <option value="">No weeks</option>
              {weeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={addWeek} loading={adding} disabled={!cls || !term || !session} title="Add next week">
              <Plus size={14} />
            </Button>
          </div>
        </div>
      </div>

      {loadingSt ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !cls || !term || !session ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📅</p><p className="font-medium">Select class, term and session</p>
        </div>
      ) : !selectedWeek ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600">
          <p className="text-3xl mb-2">📋</p><p className="font-medium">Click + to add Week 1</p>
        </div>
      ) : !students.length ? (
        <div className="text-center py-12 text-gray-400"><p className="font-medium">No students found for {cls}</p></div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{weekHeader} — {cls}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">P = Present</span>
              <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">A = Absent</span>
              <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">L = Late</span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800 min-w-[130px]">Student</th>
                  {DAYS.map(d => <th key={d} colSpan={3} className="px-2 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">{d.slice(0,3)}</th>)}
                </tr>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
                  <th className="px-3 py-1.5 sticky left-0 bg-gray-50 dark:bg-gray-800" />
                  {DAYS.map(d => (
                    <>
                      <th key={`${d}-am`}   className="px-1.5 py-1.5 text-center text-gray-400 font-medium border-l border-gray-200 dark:border-gray-700 w-10">AM</th>
                      <th key={`${d}-pm`}   className="px-1.5 py-1.5 text-center text-gray-400 font-medium w-10">PM</th>
                      <th key={`${d}-late`} className="px-1.5 py-1.5 text-center text-gray-400 font-medium w-8">Late</th>
                    </>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map(student => {
                  const days = grid[student.id] ?? DAYS.map(() => EMPTY_DAY());
                  return (
                    <tr key={student.id} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200 sticky left-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800">
                        <div>{student.name}</div>
                        <div className="text-gray-400 text-xs">{student.adm}</div>
                      </td>
                      {DAYS.map((day, di) => {
                        const d = days[di] ?? EMPTY_DAY();
                        return (
                          <>
                            <td key={`${day}-am`}   className="px-1 py-2 text-center border-l border-gray-100 dark:border-gray-800">
                              <button onClick={() => toggleStatus(student.id, di, 'am')} className={`w-8 h-7 rounded font-bold text-xs transition-colors ${statusColor(d.am)}`}>{statusLabel(d.am)}</button>
                            </td>
                            <td key={`${day}-pm`}   className="px-1 py-2 text-center">
                              <button onClick={() => toggleStatus(student.id, di, 'pm')} className={`w-8 h-7 rounded font-bold text-xs transition-colors ${statusColor(d.pm)}`}>{statusLabel(d.pm)}</button>
                            </td>
                            <td key={`${day}-late`} className="px-1 py-2 text-center">
                              <button onClick={() => toggleLate(student.id, di)} className={`w-7 h-7 rounded text-xs font-bold transition-colors ${d.late ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>{d.late ? '✓' : '·'}</button>
                            </td>
                          </>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} loading={saving}><Save size={15} /> Save Attendance</Button>
          </div>
        </>
      )}
    </div>
  );
}