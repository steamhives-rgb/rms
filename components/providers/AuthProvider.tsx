'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import type { School, Teacher } from '@/lib/types';

interface AuthState {
  school: School | null;
  teacher: Teacher | null;
  is_dev: boolean;
  is_teacher: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthCtx = createContext<AuthState>({
  school: null, teacher: null, is_dev: false, is_teacher: false,
  loading: true, refetch: async () => {}, logout: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [school,     setSchool]     = useState<School | null>(null);
  const [teacher,    setTeacher]    = useState<Teacher | null>(null);
  const [is_dev,     setIsDev]      = useState(false);
  const [is_teacher, setIsTeacher]  = useState(false);
  const [loading,    setLoading]    = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/check');
      if (res.ok) {
        const d = await res.json();
        setSchool(d.school ?? null);
        setTeacher(d.teacher ?? null);
        setIsDev(!!d.is_dev);
        setIsTeacher(!!d.is_teacher);
      } else {
        setSchool(null); setTeacher(null); setIsDev(false); setIsTeacher(false);
      }
    } catch {
      setSchool(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setSchool(null); setTeacher(null); setIsDev(false); setIsTeacher(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  // Always render children — pages that need auth guard themselves individually.
  // Never block the entire tree (e.g. the public landing page) on loading state.
  return (
    <AuthCtx.Provider value={{ school, teacher, is_dev, is_teacher, loading, refetch, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}