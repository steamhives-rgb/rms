import { cn } from '@/lib/ui-utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

function getInitials(name?: string) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

const sizes = { xs: 'w-6 h-6 text-xs', sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' };

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src.startsWith('data:') ? src : `data:image/jpeg;base64,${src}`}
        alt={name ?? 'avatar'}
        className={cn('rounded-full object-cover shrink-0', sizes[size], className)}
      />
    );
  }
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold shrink-0',
      'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      sizes[size], className
    )}>
      {getInitials(name)}
    </div>
  );
}