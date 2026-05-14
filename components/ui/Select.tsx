'use client';
import { SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/ui-utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  wrapperClass?: string;
  options?: { value: string | number; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, wrapperClass, id, options, children, ...props }, ref) => {
    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClass)}>
        {label && (
          <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}>
            {label}
          </label>
        )}
        <div className={cn(
          'relative rounded-[10px] border transition-all',
          'bg-[var(--glass-bg)] border-[var(--glass-border)]',
          'focus-within:border-[var(--orange-vivid)] focus-within:shadow-[0_0_0_3px_var(--orange-glow)]',
          error && 'border-red-500/50',
        )}>
          <select
            ref={ref}
            id={id}
            className={cn(
              'w-full bg-transparent px-3 py-2.5 text-sm outline-none appearance-none pr-9',
              'text-[var(--text-primary)]',
              className
            )}
            {...props}
          >
            {options
              ? options.map(o => <option key={o.value} value={o.value} className="bg-[#0a1930] text-[var(--text-primary)]">{o.label}</option>)
              : children}
          </select>
          {/* Chevron */}
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--text-muted)' }}
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;