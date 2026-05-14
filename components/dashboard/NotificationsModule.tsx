'use client';
import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { useRouter } from 'next/navigation';

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  entity_id: number | null;
  read: boolean;
  created_at: string;
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const day = Math.floor(h / 24);
  return `${day} day${day > 1 ? 's' : ''} ago`;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  teacher_approval_pending: Users,
  teacher_approved: UserCheck,
  teacher_rejected: UserX,
  student_registered: Users,
  result_entered: Check,
  reminder: Bell,
  system: AlertCircle,
};

const TYPE_COLORS: Record<string, string> = {
  teacher_approval_pending: 'text-yellow-500',
  teacher_approved: 'text-green-500',
  teacher_rejected: 'text-red-500',
  student_registered: 'text-blue-500',
  result_entered: 'text-purple-500',
  reminder: 'text-orange-500',
  system: 'text-gray-500',
};

export default function NotificationsModule() {
  const router = useRouter();
  const { success } = useToast();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchNotifs() {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications');
      const d = await res.json();
      if (d.success) setNotifs(d.notifications ?? []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchNotifs(); }, []);

  async function markRead(id: number) {
    await fetch(`/api/notifications?id=${id}`, { method: 'PUT' });
    setNotifs(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAll() {
    await fetch('/api/notifications?all=true', { method: 'PUT' });
    setNotifs(ns => ns.map(n => ({ ...n, read: true })));
    success('All notifications marked as read.');
  }

  async function deleteNotif(id: number) {
    await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' });
    setNotifs(ns => ns.filter(n => n.id !== id));
  }

  function handleClick(n: Notification) {
    markRead(n.id);
    if (n.type === 'teacher_approval_pending' || n.type === 'teacher_approved' || n.type === 'teacher_rejected') {
      router.push('/dashboard?tab=teachers');
    }
  }

  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {unreadCount} unread
            </span>
          )}
        </h2>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAll}>
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : notifs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notifications yet</p>
          <p className="text-sm mt-1">Events like teacher approvals will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map(n => {
            const Icon = TYPE_ICONS[n.type] ?? Bell;
            const iconColor = TYPE_COLORS[n.type] ?? 'text-gray-400';
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${
                  !n.read
                    ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                }`}
                onClick={() => handleClick(n)}
              >
                <div className={`mt-0.5 shrink-0 ${iconColor}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">{relativeTime(n.created_at)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="p-1 text-gray-400 hover:text-green-500 transition-colors" title="Mark read">
                      <Check size={14} />
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}