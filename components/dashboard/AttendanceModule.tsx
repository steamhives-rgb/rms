'use client';

// AttendanceModule — selects class/term/session/week
// Renders AttendanceEntry grid + attendance checklist

import { useEffect, useState } from 'react';
import {
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';

import { useToast } from '@/components/providers/ToastProvider';
import { TERMS } from '@/lib/constants';

import AttendanceEntry from './AttendanceEntry';

import type { AcademicSession } from '@/lib/types';

const TERM_OPTIONS = [
  { value: '', label: 'Select term…' },
  ...TERMS.map(term => ({
    value: term,
    label: term,
  })),
];

const SCHOOL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

interface WeekOption {
  value: string;
  label: string;
  display_label: string;
  week_number: number;
  is_current: boolean;
  has_records: boolean;
}

interface SchoolClass {
  id: number;
  name: string;
  is_active: boolean;
}

export default function AttendanceModule() {
  const { error: showError, success } = useToast();

  // Core data
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<SchoolClass[]>([]);

  // Filters
  const [cls, setCls] = useState('');
  const [term, setTerm] = useState('');
  const [session, setSession] = useState('');

  // Weeks
  const [weeks, setWeeks] = useState<WeekOption[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(14);

  // UI state
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  // Current session
  const [currentSession, setCurrentSession] =
    useState<AcademicSession | null>(null);

  // Checklist state
  const [checklistWeekIdx, setChecklistWeekIdx] = useState(0);

  const [attendanceTaken, setAttendanceTaken] =
    useState<Record<string, string[]>>({});

  /*
   |--------------------------------------------------------------------------
   | Load sessions + classes
   |--------------------------------------------------------------------------
   */
  useEffect(() => {
    async function initializeData() {
      try {
        // Load sessions
        const sessionsRes = await fetch('/api/sessions');
        const sessionsData = await sessionsRes.json();

        if (sessionsData.success) {
          const loadedSessions = sessionsData.sessions ?? [];

          setSessions(loadedSessions);

          const current = loadedSessions.find(
            (s: AcademicSession) => s.is_current
          );

          if (current) {
            setCurrentSession(current);
            setSession(current.label);
            setTerm(current.current_term ?? '');
            setTotalWeeks(current.attendance_weeks ?? 14);
          }
        }

        // Load active classes
        const classesRes = await fetch(
          '/api/schools/classes?active=true'
        );

        const classesData = await classesRes.json();

        if (classesData.success) {
          setSchoolClasses(classesData.classes ?? []);
        }
      } catch (err) {
        console.error(
          'Failed to initialize attendance module:',
          err
        );
      }
    }

    initializeData();

    window.addEventListener(
      'sessions-updated',
      initializeData
    );

    return () => {
      window.removeEventListener(
        'sessions-updated',
        initializeData
      );
    };
  }, []);

  /*
   |--------------------------------------------------------------------------
   | Class select options
   |--------------------------------------------------------------------------
   */
  const CLASS_OPTIONS = [
    { value: '', label: 'Select class…' },
    ...schoolClasses.map(c => ({
      value: c.name,
      label: c.name,
    })),
  ];

  /*
   |--------------------------------------------------------------------------
   | Load weeks
   |--------------------------------------------------------------------------
   */
  useEffect(() => {
    if (!cls || !term || !session) {
      setWeeks([]);
      setSelectedWeek('');
      return;
    }

    loadWeeks();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cls, term, session]);

  async function loadWeeks() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/attendance/weeks?class=${encodeURIComponent(
          cls
        )}&term=${encodeURIComponent(
          term
        )}&session=${encodeURIComponent(session)}`
      );

      const data = await res.json();

      if (!data.success) return;

      const tw = data.total_weeks ?? totalWeeks;

      const formattedWeeks: WeekOption[] = (
        data.weeks ?? []
      ).map((week: WeekOption) => ({
        value: week.week_label,
        label: `Week ${week.week_number} of ${tw}`,
        display_label: week.display_label,
        week_number: week.week_number,
        is_current: week.is_current,
        has_records: week.has_records,
      }));

      setWeeks(formattedWeeks);
      setTotalWeeks(tw);

      // Auto-select current week
      const currentWeek = formattedWeeks.find(
        w => w.is_current
      );

      const latestRecordedWeek = [...formattedWeeks]
        .reverse()
        .find(w => w.has_records);

      const autoSelect =
        currentWeek ??
        latestRecordedWeek ??
        formattedWeeks[formattedWeeks.length - 1];

      if (autoSelect) {
        setSelectedWeek(autoSelect.value);
      } else {
        setSelectedWeek('');
      }

      // Checklist current index
      const currentIndex = formattedWeeks.findIndex(
        w => w.is_current
      );

      setChecklistWeekIdx(
        currentIndex >= 0
          ? currentIndex
          : formattedWeeks.length > 0
          ? formattedWeeks.length - 1
          : 0
      );

      // Load checklist records
      fetchChecklistData(
        cls,
        term,
        session,
        formattedWeeks
      );
    } catch (err) {
      console.error('Failed to load weeks:', err);
    } finally {
      setLoading(false);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Load checklist attendance data
   |--------------------------------------------------------------------------
   */
  async function fetchChecklistData(
    cls: string,
    term: string,
    session: string,
    weekList: WeekOption[]
  ) {
    if (!weekList.length) return;

    try {
      const res = await fetch(
        `/api/attendance?class=${encodeURIComponent(
          cls
        )}&term=${encodeURIComponent(
          term
        )}&session=${encodeURIComponent(session)}`
      );

      const data = await res.json();

      if (!data.success) return;

      const taken: Record<string, string[]> = {};

      for (const record of data.attendance ?? []) {
        const weekLabel = record.week_label ?? '';

        if (!taken[weekLabel]) {
          taken[weekLabel] = [];
        }

        if (
          record.class &&
          !taken[weekLabel].includes(record.class)
        ) {
          taken[weekLabel].push(record.class);
        }
      }

      setAttendanceTaken(taken);
    } catch (err) {
      console.error(
        'Failed to load checklist data:',
        err
      );
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Add next week
   |--------------------------------------------------------------------------
   */
  async function addWeek() {
    if (!cls || !term || !session) {
      showError(
        'Select class, term and session first.'
      );

      return;
    }

    try {
      setAdding(true);

      const res = await fetch(
        '/api/attendance/weeks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            class: cls,
            term,
            session,
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        showError(
          data.error ?? 'Failed to add week.'
        );

        return;
      }

      await loadWeeks();

      setSelectedWeek(data.week_label);

      success(data.message ?? 'Week added!');
    } catch (err) {
      console.error('Failed to add week:', err);

      showError('Network error.');
    } finally {
      setAdding(false);
    }
  }

  /*
   |--------------------------------------------------------------------------
   | Derived state
   |--------------------------------------------------------------------------
   */
  const currentWeekNum =
    weeks.find(w => w.value === selectedWeek)
      ?.week_number ?? 0;

  const weekLabel = selectedWeek
    ? `Week ${currentWeekNum} of ${totalWeeks}`
    : '';

  const checklistWeek = weeks[checklistWeekIdx];

  /*
   |--------------------------------------------------------------------------
   | Render
   |--------------------------------------------------------------------------
   */
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="flex-1 text-lg font-bold text-gray-900 dark:text-gray-100">
          Attendance
        </h2>

        {currentSession && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Calendar
              size={13}
              className="text-orange-400"
            />

            <span className="font-medium text-gray-700 dark:text-gray-300">
              {currentSession.label}
            </span>

            <Badge
              variant="orange"
              className="text-[10px]"
            >
              {currentSession.current_term}
            </Badge>

            {totalWeeks > 0 && (
              <span className="text-gray-400">
                {totalWeeks} weeks/term
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}