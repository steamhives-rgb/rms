'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCheck,
  BarChart2, Calendar, Settings, LogOut, GraduationCap, School, Ticket,
  Bell, ClipboardList, FileText, CalendarDays, Printer,
} from 'lucide-react';
import { cn } from '@/lib/ui-utils';
import { useAuth } from '@/components/providers/AuthProvider';

const sections = [
  {
    label: 'OVERVIEW',
    items: [
      { href: '/dashboard', tab: '', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { href: '/dashboard?tab=students',        tab: 'students',        icon: Users,        label: 'Students'        },
      { href: '/dashboard?tab=teachers',        tab: 'teachers',        icon: UserCheck,    label: 'Teachers'        },
      { href: '/dashboard?tab=teacher-coupons', tab: 'teacher-coupons', icon: Ticket,       label: 'Teacher Coupons' },
    ],
  },
  {
    label: 'ACADEMICS',
    items: [
      { href: '/dashboard?tab=classes',    tab: 'classes',    icon: School,        label: 'Classes'    },
      { href: '/dashboard?tab=sessions',   tab: 'sessions',   icon: GraduationCap, label: 'Sessions'   },
      { href: '/dashboard?tab=calendar',   tab: 'calendar',   icon: CalendarDays,  label: 'Calendar'   },
      { href: '/dashboard?tab=attendance', tab: 'attendance', icon: Calendar,      label: 'Attendance' },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { href: '/dashboard?tab=results',       tab: 'results',       icon: BarChart2,     label: 'Result Entry'  },
      { href: '/dashboard?tab=print-results', tab: 'print-results', icon: Printer,       label: 'Print Results' },
      { href: '/dashboard?tab=broadsheet',    tab: 'broadsheet',    icon: FileText,      label: 'Broadsheet'    },
      { href: '/dashboard?tab=pins',          tab: 'pins',          icon: ClipboardList, label: 'Result Pins'   },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { href: '/dashboard?tab=notifications', tab: 'notifications', icon: Bell,     label: 'Notifications' },
      { href: '/dashboard?tab=settings',      tab: 'settings',      icon: Settings, label: 'Settings'      },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get('tab') ?? '';
  const { school, logout } = useAuth();

  function isActive(tab: string) {
    if (tab === '_ext') return false;
    if (pathname !== '/dashboard') return false;
    return tab === currentTab;
  }

  const initials = school?.name
    ? school.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'S';

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed top-0 left-0 h-full w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 flex flex-col transition-transform duration-200',
        'lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* School logo + name */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex flex-col items-center text-center gap-2">
            {school?.school_logo ? (
              <img
                src={school.school_logo.startsWith('data:') ? school.school_logo : 'data:image/png;base64,' + school.school_logo}
                alt="logo"
                className="w-14 h-14 rounded-xl object-cover shadow-sm"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
                {initials}
              </div>
            )}
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate max-w-[180px]">
                {school?.name ?? 'STEAMhives RMS'}
              </p>
              {school?.id && (
                <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5 tracking-wide select-all">
                  {school.id}
                </p>
              )}
              {school?.plan_label && (
                <span className="inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 uppercase tracking-wide">
                  {school.plan_label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {sections.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-600 uppercase px-3 mb-1">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(({ href, tab, icon: Icon, label }) => (
                  <Link
                    key={href + tab}
                    href={href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive(tab)
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                    )}
                  >
                    <Icon size={15} />
                    <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-500 transition-colors w-full"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}