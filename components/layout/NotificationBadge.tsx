'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const day = Math.floor(h / 24);
  return `${day}d ago`;
}

const TYPE_DOT: Record<string, string> = {
  teacher_approval_pending: 'bg-yellow-500',
  teacher_approved:         'bg-green-500',
  teacher_rejected:         'bg-red-500',
  student_registered:       'bg-blue-500',
  result_entered:           'bg-purple-500',
  reminder:                 'bg-orange-500',
  system:                   'bg-gray-400',
};

export default function NotificationBadge() {
  const { is_teacher } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function fetchNotifs() {
    // Teachers must not see or poll admin notifications
    if (is_teacher) return;
    try {
      const res = await fetch('/api/notifications?limit=5');
      const d = await res.json();
      if (d.success) setNotifications(d.notifications ?? []);
    } catch {}
  }

  useEffect(() => {
    if (is_teacher) return; // no polling for teacher sessions
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [is_teacher]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const unread = notifications.filter(n => !n.read).length;

  async function markAllRead() {
    try {
      await fetch('/api/notifications?all=true', { method: 'PUT' });
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
    } catch {}
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} className="text-gray-600 dark:text-gray-400" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
            ) : notifications.slice(0, 5).map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${!n.read ? 'bg-orange-50/50 dark:bg-orange-900/5' : ''}`}>
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${TYPE_DOT[n.type] ?? 'bg-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                  {n.body && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>}
                  <p className="text-[10px] text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
                </div>
                {!n.read && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 shrink-0" />}
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
            <Link href="/dashboard?tab=notifications" onClick={() => setOpen(false)} className="text-xs text-orange-500 hover:text-orange-600 font-medium">
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}