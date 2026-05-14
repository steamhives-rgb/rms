'use client';
import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/ui-utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, icon, iconRight, ...props }, ref) => {
    const sizes = {
      xs: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
      sm: 'px-3.5 py-2 text-xs gap-1.5 rounded-[10px]',
      md: 'px-4 py-2.5 text-sm gap-2 rounded-[10px]',
      lg: 'px-5 py-3 text-sm gap-2 rounded-xl',
    };

    const variants = {
      primary:   'btn-primary',
      ghost:     'btn-ghost',
      danger:    'btn-danger',
      secondary: 'btn-ghost',
      outline:   'btn-ghost border-[var(--glass-border)]',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-semibold transition-all focus:outline-none',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variants[variant], sizes[size], className
        )}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
        {iconRight && !loading && <span className="shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;