'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, Users, UserCheck, BarChart2, Settings } from 'lucide-react';

const items = [
  { href: '/dashboard',              tab: '',         icon: LayoutDashboard, label: 'Home'     },
  { href: '/dashboard?tab=students', tab: 'students', icon: Users,           label: 'Students' },
  { href: '/dashboard?tab=teachers', tab: 'teachers', icon: UserCheck,       label: 'Teachers' },
  { href: '/dashboard?tab=results',  tab: 'results',  icon: BarChart2,       label: 'Results'  },
  { href: '/dashboard?tab=settings', tab: 'settings', icon: Settings,        label: 'Settings' },
];

export default function MobileNav() {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentTab   = searchParams.get('tab') ?? '';

  return (
    <>
      <div className="h-20 lg:hidden" aria-hidden />
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 lg:hidden">
        <div
          className="flex items-center gap-0.5 px-2 py-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(20px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
            border: '1px solid rgba(255,255,255,0.55)',
          }}
        >
          {items.map(({ href, tab, icon: Icon, label }) => {
            const active = pathname === '/dashboard' && tab === currentTab;
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] h-[52px] rounded-xl transition-all duration-200 active:scale-90"
                style={{ background: active ? 'rgba(249,115,22,0.12)' : 'transparent' }}
              >
                {active && (
                  <span
                    className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500"
                    style={{ boxShadow: '0 0 4px rgba(249,115,22,0.7)' }}
                  />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? '#f97316' : '#6b7280' }} />
                <span className="text-[9px] font-semibold leading-none tracking-tight" style={{ color: active ? '#f97316' : '#9ca3af' }}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}