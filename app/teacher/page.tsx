'use client';
import { useState, useEffect } from 'react';
import { LogOut, ArrowLeft, User, X } from 'lucide-react';
import TeacherNav from '@/components/teacher/TeacherNav';
import TeacherMobileNav from '@/components/teacher/TeacherMobileNav';
import AssignedSubjects from '@/components/teacher/AssignedSubjects';
import ResultEntryForm from '@/components/teacher/ResultEntryForm';
import AttendanceForm from '@/components/teacher/AttendanceForm';
import CommentSignature from '@/components/teacher/CommentSignature';
import { useAuth } from '@/components/providers/AuthProvider';
import type { AcademicSession } from '@/lib/types';

type Tab = 'subjects' | 'results' | 'attendance' | 'comments';

export default function TeacherPage() {
  const [tab, setTab] = useState<Tab>('subjects');
  const { teacher, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [isImpersonated, setIsImpersonated] = useState(false);
  const [currentSession, setCurrentSession] = useState<AcademicSession | null>(null);
  const [returningToAdmin, setReturningToAdmin] = useState(false);

  // Fix #6: Fetch current session for display on teacher dashboard
  useEffect(() => {
    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
          if (cur) setCurrentSession(cur);
        }
      })
      .catch(() => {});
  }, []);

  // Fix #4: Detect if we're in an impersonation session
  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => { if (d.is_teacher) setIsImpersonated(true); })
      .catch(() => {});
  }, []);

  // Fix #4: Return to admin dashboard
  async function handleReturnToAdmin() {
    setReturningToAdmin(true);
    try {
      const res = await fetch('/api/teachers/return-to-admin', { method: 'POST' });
      const data = await res.json();
      if (data.success) window.location.href = '/dashboard';
    } catch { /* ignore */ }
    finally { setReturningToAdmin(false); }
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">

      {/* Fix #4: Return to Admin banner */}
      {isImpersonated && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-2.5">
          <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
            👀 You are viewing as <strong>{teacher?.name ?? 'Teacher'}</strong>
          </p>
          <button
            onClick={handleReturnToAdmin}
            disabled={returningToAdmin}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-60"
          >
            <ArrowLeft size={12} />
            {returningToAdmin ? 'Returning…' : 'Return to Admin Dashboard'}
          </button>
        </div>
      )}

      {/* Fix #6 + #3: Current session display with next term and resumption date */}
      {currentSession && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 px-1">
          <span className="font-semibold text-gray-700 dark:text-gray-300">
            📅 {currentSession.label}
          </span>
          {currentSession.current_term && (
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full font-medium">
              {currentSession.current_term}
            </span>
          )}
          {currentSession.next_term_begins && (
            <span className="text-gray-500 dark:text-gray-400">
              Next term: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(currentSession.next_term_begins).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          )}
          {currentSession.resumption_date && (
            <span className="text-gray-500 dark:text-gray-400">
              Resumes: <span className="font-medium text-gray-700 dark:text-gray-300">{new Date(currentSession.resumption_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </span>
          )}
        </div>
      )}

      {/* Desktop tab bar + profile */}
      <div className="hidden lg:flex items-center gap-3">
        <div className="flex-1">
          <TeacherNav active={tab} onTabChange={setTab} />
        </div>
        {/* Fix #7: Profile + Logout on desktop */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowProfile(true)}
            title="My Profile"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {teacher?.avatar ? (
              <img src={teacher.avatar.startsWith('data:') ? teacher.avatar : 'data:image/png;base64,' + teacher.avatar}
                alt={teacher.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                {teacher?.name?.[0]?.toUpperCase() ?? 'T'}
              </div>
            )}
            <span className="font-medium text-xs">{teacher?.name?.split(' ')[0] ?? 'Profile'}</span>
          </button>
          <button
            onClick={logout}
            title="Logout"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={15} /> <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>

      {tab === 'subjects'    && <AssignedSubjects />}
      {tab === 'results'     && <ResultEntryForm />}
      {tab === 'attendance'  && <AttendanceForm />}
      {tab === 'comments'    && <CommentSignature />}

      {/* Mobile bottom dock */}
      <TeacherMobileNav active={tab} onTabChange={setTab} onProfileClick={() => setShowProfile(true)} />

      {/* Fix #7: Teacher Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowProfile(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">My Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 mb-5">
              {teacher?.avatar ? (
                <img src={teacher.avatar.startsWith('data:') ? teacher.avatar : 'data:image/png;base64,' + teacher.avatar}
                  alt={teacher.name} className="w-20 h-20 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                  {teacher?.name?.[0]?.toUpperCase() ?? 'T'}
                </div>
              )}
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-lg">{teacher?.name}</p>
                {teacher?.email && <p className="text-sm text-gray-500 dark:text-gray-400">{teacher.email}</p>}
              </div>
            </div>
            <div className="space-y-2 text-sm mb-5">
              {teacher?.employee_id && (
                <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">Employee ID</span>
                  <span className="font-mono font-semibold text-gray-800 dark:text-gray-200">{teacher.employee_id}</span>
                </div>
              )}
              {teacher?.role && (
                <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">Role</span>
                  <span className="capitalize font-medium text-gray-800 dark:text-gray-200">{teacher.role}</span>
                </div>
              )}
              {teacher?.class && (
                <div className="flex justify-between px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">Class</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{teacher.class}</span>
                </div>
              )}
              {currentSession && (
                <div className="flex justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-gray-500">Session</span>
                  <span className="font-medium text-orange-700 dark:text-orange-400">{currentSession.label} · {currentSession.current_term}</span>
                </div>
              )}
            </div>
            <button
              onClick={async () => { await logout(); window.location.href = '/teacher-login'; }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}