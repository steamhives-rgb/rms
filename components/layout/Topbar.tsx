'use client';
import { Menu } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import ThemeToggle from './ThemeToggle';
import NotificationBadge from './NotificationBadge';
import Avatar from '@/components/ui/Avatar';

interface TopbarProps {
  onMenuClick?: () => void;
  title?: string;
}

export default function Topbar({ onMenuClick, title }: TopbarProps) {
  const { school, teacher } = useAuth();

  return (
    <header className="h-[60px] bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-3 sticky top-0 z-30">
      {onMenuClick && (
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <Menu size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
      )}

      <div className="flex items-center gap-2 flex-1 min-w-0">
        {school?.school_logo && (
          <img
            src={school.school_logo.startsWith('data:') ? school.school_logo : `data:image/png;base64,${school.school_logo}`}
            alt="logo"
            className="h-7 w-7 rounded object-cover shrink-0"
          />
        )}
        <div className="min-w-0">
          <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate block">
            {title ?? school?.name ?? 'STEAMhives RMS'}
          </span>
          {school?.id && (
            <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 tracking-wide select-all leading-none">
              ID: {school.id}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBadge />
        <ThemeToggle />
        <Avatar src={teacher?.avatar} name={teacher?.name ?? school?.name} size="sm" />
      </div>
    </header>
  );
}