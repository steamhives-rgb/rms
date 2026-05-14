'use client';
import { BookOpen, BarChart2, Calendar, MessageSquare, LogOut, User } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

type Tab = 'subjects' | 'results' | 'attendance' | 'comments';

const ALL_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'subjects',   label: 'Subjects',   icon: BookOpen      },
  { id: 'results',    label: 'Results',    icon: BarChart2     },
  { id: 'attendance', label: 'Attendance', icon: Calendar      },
  { id: 'comments',   label: 'Comments',   icon: MessageSquare },
];

/**
 * Determine which tabs a teacher can see based on their role:
 *   teaching     → Results (+ class-teacher tabs if is_class_teacher)
 *   class teacher → Subjects + Attendance + Comments
 *   both          → all four
 *   non-teaching  → only tabs that map to their admin_tasks assignments
 */
function getVisibleTabs(
  role: string | undefined,
  isClassTeacher: boolean,
  adminTasks: string[] | null | undefined
): Tab[] {
  if (!role) return ALL_TABS.map(t => t.id);

  if (role === 'both') return ALL_TABS.map(t => t.id);

  if (role === 'teaching') {
    const tabs: Tab[] = ['results'];
    if (isClassTeacher) tabs.push('subjects', 'attendance', 'comments');
    return ALL_TABS.map(t => t.id).filter(id => tabs.includes(id));
  }

  if (role === 'non-teaching') {
    const tasks = new Set(adminTasks ?? []);
    const tabs: Tab[] = [];
    if (tasks.has('enter_results'))   tabs.push('results');
    if (tasks.has('take_attendance')) tabs.push('attendance');
    if (isClassTeacher) tabs.push('subjects', 'attendance', 'comments');
    return ALL_TABS.map(t => t.id).filter(id => tabs.includes(id));
  }

  // fallback (class_teacher legacy or unknown)
  return ['subjects', 'attendance', 'comments'];
}

interface Props {
  active: Tab;
  onTabChange: (tab: Tab) => void;
  onProfileClick?: () => void;
}

export default function TeacherMobileNav({ active, onTabChange, onProfileClick }: Props) {
  const { logout, teacher } = useAuth();

  const visibleIds = getVisibleTabs(
    teacher?.role,
    !!teacher?.is_class_teacher,
    teacher?.admin_tasks
  );
  const tabs = ALL_TABS.filter(t => visibleIds.includes(t.id));
  const effectiveActive = visibleIds.includes(active) ? active : visibleIds[0];

  return (
    <>
      <div className="h-24 lg:hidden" aria-hidden />

      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <div
          className="flex items-center gap-0.5 px-2 py-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.55)',
          }}
        >
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = effectiveActive === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] h-[52px] rounded-xl transition-all duration-200 active:scale-90"
                style={{ background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent' }}
              >
                {isActive && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500"
                    style={{ boxShadow: '0 0 4px rgba(249,115,22,0.7)' }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  style={{ color: isActive ? '#f97316' : '#6b7280' }}
                />
                <span
                  className="text-[9px] font-semibold leading-none tracking-tight"
                  style={{ color: isActive ? '#f97316' : '#9ca3af' }}
                >
                  {label}
                </span>
              </button>
            );
          })}

          <div className="w-px h-8 bg-gray-200 mx-1" />

          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="flex flex-col items-center justify-center gap-0.5 w-[48px] h-[52px] rounded-xl transition-all duration-200 active:scale-90 hover:bg-orange-50"
              title="My Profile"
            >
              <User size={18} strokeWidth={1.8} style={{ color: '#9ca3af' }} />
              <span className="text-[9px] font-semibold leading-none tracking-tight" style={{ color: '#9ca3af' }}>
                Profile
              </span>
            </button>
          )}

          <button
            onClick={logout}
            className="flex flex-col items-center justify-center gap-0.5 w-[48px] h-[52px] rounded-xl transition-all duration-200 active:scale-90 hover:bg-red-50"
            title="Logout"
          >
            <LogOut size={18} strokeWidth={1.8} style={{ color: '#9ca3af' }} />
            <span className="text-[9px] font-semibold leading-none tracking-tight" style={{ color: '#9ca3af' }}>
              Logout
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
