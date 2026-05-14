'use client';
import { useState, useCallback, useEffect } from 'react';
import type { Result } from '@/lib/types';

interface ResultsFilter {
  class?: string;
  term?: string;
  session?: string;
  student_id?: string;
}

export function useResults(filter?: ResultsFilter) {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    if (!filter?.class && !filter?.student_id) { setResults([]); return; }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter?.class)      params.set('class',      filter.class);
      if (filter?.term)       params.set('term',        filter.term);
      if (filter?.session)    params.set('session',     filter.session);
      if (filter?.student_id) params.set('student_id',  filter.student_id);

      const res  = await fetch(`/api/results?${params}`);
      const data = await res.json();
      if (data.success) setResults(data.results ?? []);
      else setError(data.error ?? 'Failed to load results');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [filter?.class, filter?.term, filter?.session, filter?.student_id]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  return { results, loading, error, refetch: fetchResults };
}