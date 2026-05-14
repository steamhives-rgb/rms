'use client';
import type { DevSchool } from './AdminPanel';

interface Props {
  schools: DevSchool[];
  studentCounts: Record<string, number>;
  resultCounts: Record<string, number>;
  onImpersonate: (s: DevSchool) => void;
  onResetPwd: (s: DevSchool) => void;
  onDelete: (s: DevSchool) => void;
  compact?: boolean;
}

export default function SchoolsTable({
  schools, studentCounts, resultCounts,
  onImpersonate, onResetPwd, onDelete, compact = false,
}: Props) {
  if (schools.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-gray-500 dark:text-gray-500 text-sm">No schools registered yet</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-gray-800">
          <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">School ID</th>
          <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Name</th>
          <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Students</th>
          {!compact && <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Results</th>}
          <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Plan</th>
          <th className="px-4 py-2.5 text-left text-xs text-gray-500 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        {schools.map(s => (
          <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
            <td className="px-4 py-2.5">
              <code className="text-[11px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{s.id}</code>
            </td>
            <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{s.name || '—'}</td>
            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
              {studentCounts[s.id] ?? 0}
              {s.student_limit != null && <span className="text-gray-400 dark:text-gray-600"> / {s.student_limit}</span>}
              {s.student_limit == null && <span className="text-gray-400 dark:text-gray-600"> / ∞</span>}
            </td>
            {!compact && (
              <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{resultCounts[s.id] ?? 0}</td>
            )}
            <td className="px-4 py-2.5">
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                (s.plan_label ?? '').includes('Unlimited')
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                {s.plan_label || '—'}
              </span>
            </td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <ActionBtn variant="ghost" onClick={() => onImpersonate(s)}>Login As</ActionBtn>
                <ActionBtn variant="warn"  onClick={() => onResetPwd(s)}>Reset PWD</ActionBtn>
                <ActionBtn variant="danger" onClick={() => onDelete(s)}>Delete</ActionBtn>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ActionBtn({ variant, onClick, children }: {
  variant: 'ghost' | 'warn' | 'danger';
  onClick: () => void;
  children: React.ReactNode;
}) {
  const styles = {
    ghost:  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
    warn:   'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/30',
    danger: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30',
  };
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-medium px-2 py-1 rounded transition-colors whitespace-nowrap ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
