'use client';
import { useSearchParams } from 'next/navigation';
import StatsCards from '@/components/dashboard/StatsCards';
import StudentsModule from '@/components/dashboard/StudentsModule';
import TeachersModule from '@/components/dashboard/TeachersModule';
import TeacherCouponsModule from '@/components/dashboard/TeacherCouponsModule';
import ResultModule from '@/components/dashboard/ResultModule';
import AttendanceModule from '@/components/dashboard/AttendanceModule';
import SessionsModule from '@/components/dashboard/SessionsModule';
import ClassesModule from '@/components/dashboard/ClassesModule';
import SettingsModule from '@/components/dashboard/SettingsModule';
import CalendarModule from '@/components/dashboard/CalendarModule';
import NotificationsModule from '@/components/dashboard/NotificationsModule';
import CalendarWidget from '@/components/dashboard/CalendarWidget';
import PlanWidget from '@/components/dashboard/PlanWidget';
import BroadsheetViewer from '@/components/dashboard/BroadsheetViewer';
import PinsModule from '@/components/dashboard/PinsModule';
import PrintResultModule from '@/components/dashboard/PrintResultModule';

export default function DashboardPage() {
  const params = useSearchParams();
  const tab = params.get('tab') ?? '';

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* ── Tab views ── */}
      {tab === 'students'        && <StudentsModule />}
      {tab === 'teachers'        && <TeachersModule />}
      {tab === 'teacher-coupons' && <TeacherCouponsModule />}
      {tab === 'results'         && <ResultModule />}

      {tab === 'attendance'      && <AttendanceModule />}
      {tab === 'classes'         && <ClassesModule />}
      {tab === 'sessions'        && <SessionsModule />}
      {tab === 'settings'        && <SettingsModule />}
      {tab === 'calendar'        && <CalendarModule />}
      {tab === 'notifications'   && <NotificationsModule />}
      {tab === 'broadsheet'      && <BroadsheetViewer />}
      {tab === 'pins'            && <PinsModule />}
      {tab === 'print-results'   && <PrintResultModule />}

      {/* ── Dashboard home ── */}
      {!tab && (
        <>
          {/* Stats row */}
          <StatsCards />

          {/* Main 2-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left: main content — 2/3 width */}
            <div className="xl:col-span-2 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StudentsModule compact />
                <TeachersModule compact />
              </div>
            </div>

            {/* Right sidebar — 1/3 width */}
            <div className="space-y-4">
              {/* Plan + upgrade widget */}
              <PlanWidget />
              {/* Compact calendar */}
              <CalendarWidget />
            </div>
          </div>
        </>
      )}
    </div>
  );
}