'use client';
import { useState, useCallback, useEffect } from 'react';
import type { Student } from '@/lib/types';

interface StudentsFilter {
  class?: string;
  term?: string;
  session?: string;
  search?: string;
}

export function useStudents(filter?: StudentsFilter) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter?.class)   params.set('class',   filter.class);
      if (filter?.term)    params.set('term',     filter.term);
      if (filter?.session) params.set('session',  filter.session);
      if (filter?.search)  params.set('search',   filter.search);

      const res  = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (data.success) setStudents(data.students ?? []);
      else setError(data.error ?? 'Failed to load students');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [filter?.class, filter?.term, filter?.session, filter?.search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  return { students, loading, error, refetch: fetchStudents };
}