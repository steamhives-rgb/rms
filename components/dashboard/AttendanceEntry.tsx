// AttendanceEntry dashboard component
'use client';
// AttendanceEntry — Mon–Fri AM/PM/Late grid for a class week
// days stored as JSON: [{am,pm,late}, ...] per student, 5 days
import { useState, useEffect, useCallback, Fragment } from 'react';
import { Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import type { Student } from '@/lib/types';

interface Props {
  cls: string;
  term: string;
  session: string;
  weekLabel: string;
  weekHeader: string;
}

type DayStatus = 'present' | 'absent' | 'late';
type DayRecord = { am: DayStatus; pm: DayStatus; late: boolean };
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const EMPTY_DAY = (): DayRecord => ({ am: 'present', pm: 'present', late: false });
const STATUS_OPTIONS: { value: DayStatus; label: string; color: string }[] = [
  { value: 'present', label: 'P', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'absent',  label: 'A', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'late',    label: 'L', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
];

function statusColor(s: DayStatus) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color ?? '';
}

export default function AttendanceEntry({ cls, term, session, weekLabel, weekHeader }: Props) {
  const { success, error: showError } = useToast();
  const [students,  setStudents]  = useState<Student[]>([]);
  const [loadingSt, setLoadingSt] = useState(false);
  const [saving,    setSaving]    = useState(false);
  // grid[studentId][dayIndex] = DayRecord
  const [grid, setGrid] = useState<Record<string, DayRecord[]>>({});

  // Load students for the class
  useEffect(() => {
    setLoadingSt(true);
    const p = new URLSearchParams({ class: cls, term, session });
    fetch(`/api/students?${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const sts: Student[] = d.students ?? [];
          setStudents(sts);
          // Init grid with empty days
          const init: Record<string, DayRecord[]> = {};
          for (const s of sts) init[s.id] = DAYS.map(() => EMPTY_DAY());
          setGrid(init);
        }
      })
      .finally(() => setLoadingSt(false));
  }, [cls, term, session]);

  // Load existing attendance for this week
  useEffect(() => {
    if (!students.length) return;
    const p = new URLSearchParams({ class: cls, term, session, week_label: weekLabel });
    fetch(`/api/attendance?${p}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        const rows: { student_id: string; days: DayRecord[] | string }[] = d.attendance ?? [];
        if (!rows.length) return;
        setGrid(prev => {
          const next = { ...prev };
          for (const row of rows) {
            let days = row.days;
            if (typeof days === 'string') { try { days = JSON.parse(days); } catch { continue; } }
            if (Array.isArray(days)) {
              next[row.student_id] = DAYS.map((_, i) => days[i] ?? EMPTY_DAY());
            }
          }
          return next;
        });
      });
  }, [students, weekLabel, cls, term, session]);

  const toggleStatus = useCallback((studentId: string, dayIdx: number, field: 'am' | 'pm') => {
    setGrid(prev => {
      const days = [...(prev[studentId] ?? DAYS.map(() => EMPTY_DAY()))];
      const day  = { ...days[dayIdx] };
      const cycle: DayStatus[] = ['present', 'absent', 'late'];
      day[field] = cycle[(cycle.indexOf(day[field]) + 1) % cycle.length];
      days[dayIdx] = day;
      return { ...prev, [studentId]: days };
    });
  }, []);

  const toggleLate = useCallback((studentId: string, dayIdx: number) => {
    setGrid(prev => {
      const days = [...(prev[studentId] ?? DAYS.map(() => EMPTY_DAY()))];
      const day  = { ...days[dayIdx], late: !days[dayIdx].late };
      days[dayIdx] = day;
      return { ...prev, [studentId]: days };
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const records = students.map(s => ({
        student_id: s.id,
        class: cls, term, session,
        week_label: weekLabel,
        days: grid[s.id] ?? DAYS.map(() => EMPTY_DAY()),
      }));
      const res  = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success('Attendance saved!');
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  if (loadingSt) return <div className="flex items-center justify-center py-16"><Spinner /></div>;

  if (!students.length) return (
    <div className="text-center py-12 text-gray-400 dark:text-gray-600">
      <p className="text-3xl mb-2">👥</p>
      <p className="font-medium">No students found for {cls}</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex-1">
          {weekHeader} — {cls}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700">P = Present</span>
          <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700">A = Absent</span>
          <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">L = Late</span>
        </div>
        <Button size="sm" onClick={handleSave} loading={saving}><Save size={14} /> Save</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-800 min-w-[140px]">Student</th>
              {DAYS.map(day => (
                <th key={day} colSpan={3} className="px-2 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400 border-l border-gray-200 dark:border-gray-700">
                  {day.substring(0, 3)}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <th className="px-3 py-1.5 sticky left-0 bg-gray-50 dark:bg-gray-800" />
              {DAYS.map(day => (
                <Fragment key={day}>
                  <th className="px-1.5 py-1.5 text-center text-gray-400 font-medium border-l border-gray-200 dark:border-gray-700 w-12">AM</th>
                  <th className="px-1.5 py-1.5 text-center text-gray-400 font-medium w-12">PM</th>
                  <th className="px-1.5 py-1.5 text-center text-gray-400 font-medium w-10">Late</th>
                </Fragment>
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
                      <Fragment key={day}>
                        <td className="px-1 py-2 text-center border-l border-gray-100 dark:border-gray-800">
                          <button
                            onClick={() => toggleStatus(student.id, di, 'am')}
                            className={`w-8 h-7 rounded font-bold text-xs transition-colors ${statusColor(d.am)}`}
                          >
                            {STATUS_OPTIONS.find(o => o.value === d.am)?.label}
                          </button>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            onClick={() => toggleStatus(student.id, di, 'pm')}
                            className={`w-8 h-7 rounded font-bold text-xs transition-colors ${statusColor(d.pm)}`}
                          >
                            {STATUS_OPTIONS.find(o => o.value === d.pm)?.label}
                          </button>
                        </td>
                        <td className="px-1 py-2 text-center">
                          <button
                            onClick={() => toggleLate(student.id, di)}
                            className={`w-7 h-7 rounded text-xs font-bold transition-colors ${d.late ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}
                          >
                            {d.late ? '✓' : '·'}
                          </button>
                        </td>
                      </Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Button onClick={handleSave} loading={saving}><Save size={15} /> Save Attendance</Button>
      </div>
    </div>
  );
}