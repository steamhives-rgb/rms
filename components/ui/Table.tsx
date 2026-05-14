import { ReactNode } from 'react';
import { cn } from '@/lib/ui-utils';

interface TableProps {
  children: ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-200/20 dark:border-slate-800 dark:bg-slate-950', className)}>
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">{children}</table>
    </div>
  );
}

export function Thead({ children }: TableProps) {
  return (
    <thead className="bg-slate-50 text-left text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-slate-100">{children}</thead>
  );
}

export function Tbody({ children }: TableProps) {
  return <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">{children}</tbody>;
}

interface TrProps {
  children: ReactNode;
  className?: string;
}

export function Tr({ children, className }: TrProps) {
  return <tr className={cn(className)}>{children}</tr>;
}

interface ThProps {
  children?: ReactNode;
  className?: string;
}

export function Th({ children, className }: ThProps) {
  return <th className={cn('px-4 py-3 text-xs uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400', className)}>{children}</th>;
}

interface TdProps {
  children: ReactNode;
  className?: string;
}

export function Td({ children, className }: TdProps) {
  return <td className={cn('px-4 py-4 text-sm text-slate-700 dark:text-slate-200', className)}>{children}</td>;
}
