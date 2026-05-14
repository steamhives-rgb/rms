'use client';
import { useState, useCallback, useEffect } from 'react';
import type { Teacher } from '@/lib/types';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/teachers');
      const data = await res.json();
      if (data.success) setTeachers(data.teachers ?? []);
      else setError(data.error ?? 'Failed to load teachers');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  return { teachers, loading, error, refetch: fetchTeachers };
}