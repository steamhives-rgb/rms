// hooks/useActiveClasses.ts
// Shared hook so CalendarModule and AttendanceModule always reflect the same class list.
// Caches the result for the lifetime of the page (module-level variable) so parallel
// consumers don't fire duplicate network requests.

import { useState, useEffect } from 'react';

export interface ActiveClass {
  id: number;
  name: string;
  is_active: boolean;
}

let _cache: ActiveClass[] | null = null;
let _promise: Promise<ActiveClass[]> | null = null;

async function fetchActiveClasses(): Promise<ActiveClass[]> {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => {
        const list: ActiveClass[] = d.success ? (d.classes ?? []) : [];
        _cache = list;
        return list;
      })
      .catch(() => {
        _promise = null; // allow retry on error
        return [] as ActiveClass[];
      });
  }
  return _promise;
}

/** Call this to invalidate the cache (e.g. after adding/removing a class). */
export function invalidateActiveClassesCache() {
  _cache = null;
  _promise = null;
}

export function useActiveClasses() {
  const [classes, setClasses] = useState<ActiveClass[]>(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);

  useEffect(() => {
    let cancelled = false;
    fetchActiveClasses().then(list => {
      if (!cancelled) { setClasses(list); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  return { classes, loading };
}
