'use client';
// Compact calendar widget for the dashboard home — no hover/z-index issues
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import Link from 'next/link';

type EventType = 'school_day' | 'holiday' | 'midterm_test' | 'exam' | 'event' | 'reminder';

interface CalEvent {
  id: number;
  event_date: string;
  title: string;
  type: EventType;
}

const DOT_COLOR: Record<EventType, string> = {
  school_day:   'bg-green-500',
  holiday:      'bg-yellow-500',
  midterm_test: 'bg-blue-500',
  exam:         'bg-orange-500',
  event:        'bg-purple-500',
  reminder:     'bg-red-500',
};

function fmt(d: Date) { return d.toISOString().slice(0, 10); }

export default function CalendarWidget() {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events,    setEvents]    = useState<CalEvent[]>([]);
  const [selected,  setSelected]  = useState<string | null>(null);

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  useEffect(() => {
    fetch(`/api/calendar?month=${monthKey}`)
      .then(r => r.json())
      .then(d => { if (d.success) setEvents(d.events ?? []); })
      .catch(() => {});
  }, [monthKey]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const offset   = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = Array(offset).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = new Map<string, CalEvent[]>();
  events.forEach(e => {
    const list = byDate.get(e.event_date) ?? [];
    list.push(e);
    byDate.set(e.event_date, list);
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const todayStr = fmt(today);
  const selectedEvents = selected ? (byDate.get(selected) ?? []) : [];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <CalendarDays size={15} className="text-orange-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronLeft size={14} className="text-gray-500" />
          </button>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[80px] text-center">
            {months[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ChevronRight size={14} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1.5">{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 p-1 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} className="aspect-square" />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday    = dateStr === todayStr;
          const isSelected = selected === dateStr;
          const dayEvs     = byDate.get(dateStr) ?? [];

          return (
            <button
              key={idx}
              onClick={() => setSelected(isSelected ? null : dateStr)}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-colors relative ${
                isToday
                  ? 'bg-orange-500 text-white'
                  : isSelected
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              {day}
              {dayEvs.length > 0 && !isToday && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${DOT_COLOR[dayEvs[0].type] ?? 'bg-gray-400'}`} />
              )}
              {dayEvs.length > 0 && isToday && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-white/70" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selected && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
          </p>
          {selectedEvents.length === 0 ? (
            <p className="text-xs text-gray-400">No events</p>
          ) : (
            <div className="space-y-1">
              {selectedEvents.slice(0, 3).map(ev => (
                <div key={ev.id} className="flex items-center gap-1.5 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[ev.type] ?? 'bg-gray-400'}`} />
                  <span className="text-gray-700 dark:text-gray-300 truncate">{ev.title}</span>
                </div>
              ))}
              {selectedEvents.length > 3 && (
                <p className="text-[10px] text-gray-400">+{selectedEvents.length - 3} more</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer link */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-800">
        <Link href="/dashboard?tab=calendar" className="text-[11px] text-orange-500 hover:text-orange-600 font-medium">
          Open full calendar →
        </Link>
      </div>
    </div>
  );
}