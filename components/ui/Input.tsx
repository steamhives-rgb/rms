'use client';
import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/ui-utils';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClass?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, wrapperClass, id, prefix, suffix, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClass)}>
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <div className={cn(
          'flex items-center rounded-[10px] border transition-all overflow-hidden',
          'bg-[var(--glass-bg)] border-[var(--glass-border)]',
          'focus-within:border-[var(--orange-vivid)] focus-within:shadow-[0_0_0_3px_var(--orange-glow)]',
          error && 'border-red-500/50 focus-within:border-red-500 focus-within:shadow-[0_0_0_3px_rgba(248,113,113,0.15)]',
        )}>
          {prefix && (
            <span className="pl-3 pr-1 shrink-0" style={{ color: 'var(--text-muted)' }}>{prefix}</span>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              'flex-1 min-w-0 bg-transparent px-3 py-2.5 text-sm outline-none',
              'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
              prefix && 'pl-1',
              suffix && 'pr-1',
              className
            )}
            {...props}
          />
          {suffix && (
            <span className="pr-3 pl-1 shrink-0" style={{ color: 'var(--text-muted)' }}>{suffix}</span>
          )}
        </div>
        {error && <p className="text-xs text-red-400 flex items-center gap-1"><span>⚠</span>{error}</p>}
        {hint && !error && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;