'use client';
import { useState, useCallback, useEffect } from 'react';
import type { AttendanceRecord } from '@/lib/types';

interface AttendanceFilter {
  class?: string;
  term?: string;
  session?: string;
  week_label?: string;
}

export function useAttendance(filter?: AttendanceFilter) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchAttendance = useCallback(async () => {
    if (!filter?.class) { setRecords([]); return; }
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.class)      params.set('class',      filter.class);
      if (filter.term)       params.set('term',        filter.term ?? '');
      if (filter.session)    params.set('session',     filter.session ?? '');
      if (filter.week_label) params.set('week_label',  filter.week_label);

      const res  = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      if (data.success) setRecords(data.records ?? []);
      else setError(data.error ?? 'Failed to load attendance');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [filter?.class, filter?.term, filter?.session, filter?.week_label]);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  return { records, loading, error, refetch: fetchAttendance };
}