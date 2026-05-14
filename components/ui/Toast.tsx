'use client';
import { cn } from '@/lib/ui-utils';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItemProps {
  id: string;
  type: ToastType;
  message: string;
  onDismiss: (id: string) => void;
}

const CONFIG = {
  success: {
    icon: CheckCircle2,
    color: '#34d399',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
  },
  error: {
    icon: XCircle,
    color: '#f87171',
    bg: 'rgba(248,113,113,0.08)',
    border: 'rgba(248,113,113,0.2)',
  },
  warning: {
    icon: AlertTriangle,
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.2)',
  },
  info: {
    icon: Info,
    color: '#60a5fa',
    bg: 'rgba(96,165,250,0.08)',
    border: 'rgba(96,165,250,0.2)',
  },
};

export function ToastItem({ id, type, message, onDismiss }: ToastItemProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm max-w-sm w-full shadow-2xl animate-fade-up"
      style={{
        background: 'var(--surface-2, rgba(255,255,255,0.95))',
        border: `1px solid ${cfg.border}`,
        boxShadow: `0 0 0 1px ${cfg.border}, 0 8px 32px rgba(0,0,0,0.4)`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <Icon size={16} className="shrink-0 mt-0.5" style={{ color: cfg.color }} />
      <span className="flex-1 font-medium" style={{ color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
        {message}
      </span>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 transition-colors mt-0.5"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <X size={13} />
      </button>
    </div>
  );
}