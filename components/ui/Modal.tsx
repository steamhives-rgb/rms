'use client';
import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/ui-utils';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  footer?: ReactNode;
}

export default function Modal({ open, onClose, title, subtitle, children, size = 'md', className, footer }: ModalProps) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'relative w-full flex flex-col animate-scale-in',
        'rounded-t-2xl sm:rounded-2xl',
        'border border-[var(--glass-border)]',
        'max-h-[95vh] sm:max-h-[88vh]',
        sizes[size],
        className
      )}
        style={{ background: 'var(--surface-2)' }}>

        {/* Top accent line */}
        <div className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, var(--orange-vivid), transparent)', opacity: 0.5 }} />

        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-6 py-5 shrink-0"
            style={{ borderBottom: '1px solid var(--glass-border)' }}>
            <div>
              {title && <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>}
              {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors ml-4 shrink-0"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 shrink-0 flex items-center justify-end gap-2"
            style={{ borderTop: '1px solid var(--glass-border)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}