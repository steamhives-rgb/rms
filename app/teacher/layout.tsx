'use client';
import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import Topbar from '@/components/layout/Topbar';
import Spinner from '@/components/ui/Spinner';

export default function TeacherLayout({ children }: { children: ReactNode }) {
  const { school, is_teacher, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!school || !is_teacher)) router.push('/teacher-login');
  }, [loading, school, is_teacher, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  if (!school || !is_teacher) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      <Topbar title="Teacher Portal" />
      <main className="flex-1">{children}</main>
    </div>
  );
}