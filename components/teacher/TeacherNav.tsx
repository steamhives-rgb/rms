'use client';
import { BookOpen, BarChart2, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';

type Tab = 'subjects' | 'results' | 'attendance' | 'comments';

const ALL_TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'subjects',   label: 'My Subjects',   icon: BookOpen      },
  { id: 'results',    label: 'Enter Results',  icon: BarChart2     },
  { id: 'attendance', label: 'Attendance',     icon: Calendar      },
  { id: 'comments',   label: 'Comments',       icon: MessageSquare },
];

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

  return ['subjects', 'attendance', 'comments'];
}

interface Props {
  active: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function TeacherNav({ active, onTabChange }: Props) {
  const { teacher } = useAuth();

  const visibleIds = getVisibleTabs(
    teacher?.role,
    !!teacher?.is_class_teacher,
    teacher?.admin_tasks
  );
  const tabs = ALL_TABS.filter(t => visibleIds.includes(t.id));
  const effectiveActive = visibleIds.includes(active) ? active : visibleIds[0];

  return (
    <nav className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 flex-wrap">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            effectiveActive === id
              ? 'bg-white dark:bg-gray-900 text-orange-600 dark:text-orange-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          <Icon size={15} />
          {label}
        </button>
      ))}
    </nav>
  );
}
