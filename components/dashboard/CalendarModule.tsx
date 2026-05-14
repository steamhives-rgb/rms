'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { useActiveClasses } from '@/hooks/useActiveClasses';

type EventType = 'school_day' | 'holiday' | 'midterm_test' | 'exam' | 'event' | 'reminder';

interface CalEvent {
  id: number;
  event_date: string;
  title: string;
  type: EventType;
}

const TYPE_CONFIG: Record<EventType, { label: string; color: string; dot: string }> = {
  school_day:   { label: 'School Day',   color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',   dot: 'bg-green-500'  },
  holiday:      { label: 'Holiday',      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', dot: 'bg-yellow-500' },
  midterm_test: { label: 'Midterm Test', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',         dot: 'bg-blue-500'   },
  exam:         { label: 'Exam',         color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', dot: 'bg-orange-500' },
  event:        { label: 'Event',        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', dot: 'bg-purple-500' },
  reminder:     { label: 'Reminder',     color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',             dot: 'bg-red-500'    },
};

function fmt(d: Date) { return d.toISOString().slice(0, 10); }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

export default function CalendarModule() {
  const { success, error: showError } = useToast();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ title: '', type: 'school_day' as EventType });
  const [weeksInTerm, setWeeksInTerm] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [hasAnyEvents, setHasAnyEvents] = useState(true);
  const [setupForm, setSetupForm] = useState({ resumed: '', resumption_date: '', holidays: '' });

  const { classes: activeClasses } = useActiveClasses();

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  async function fetchEvents() {
    setLoading(true);
    try {
      const res = await fetch(`/api/calendar?month=${monthKey}`);
      const d = await res.json();
      if (d.success) {
        setEvents(d.events ?? []);
        if (d.events?.length === 0 && viewYear === today.getFullYear() && viewMonth === today.getMonth()) {
          // Check if any events exist at all
          const all = await fetch('/api/calendar');
          const ad = await all.json();
          if (ad.success && (ad.events ?? []).length === 0) {
            setHasAnyEvents(false);
            setShowSetup(true);
          }
        }
      }
    } catch {}
    setLoading(false);
  }

  async function fetchWeek() {
    try {
      const res = await fetch('/api/calendar?week=current');
      const d = await res.json();
      if (d.success) setWeekEvents(d.events ?? []);
    } catch {}
  }

  useEffect(() => {
    fetchEvents();
    fetchWeek();
    // Bug I: pre-populate weeksInTerm from active session
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        const cur = (d.sessions ?? []).find((s: { is_current: boolean; attendance_weeks: number }) => s.is_current);
        if (cur) setWeeksInTerm(String(cur.attendance_weeks ?? 14));
      }
    }).catch(() => {});
  }, [monthKey]);

  async function handleAddEvent() {
    if (!selectedDate || !addForm.title.trim()) { showError('Title is required.'); return; }
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: selectedDate, title: addForm.title, type: addForm.type }),
      });
      const d = await res.json();
      if (!d.success) { showError('Failed to add event.'); return; }
      success('Event added!');
      setAddForm({ title: '', type: 'school_day' });
      setShowAddModal(false);
      fetchEvents(); fetchWeek();
    } catch { showError('Network error.'); }
  }

  async function handleDeleteEvent(id: number) {
    try {
      await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
      fetchEvents(); fetchWeek();
    } catch {}
  }

  async function handleSetup() {
    if (!setupForm.resumed) { showError('Please answer if school has resumed.'); return; }
    const events: { event_date: string; title: string; type: string }[] = [];
    if (setupForm.resumed === 'yes' && setupForm.resumption_date) {
      const start = new Date(setupForm.resumption_date);
      const end = new Date();
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) events.push({ event_date: fmt(new Date(d)), title: 'School Day', type: 'school_day' });
      }
      // Parse holidays
      if (setupForm.holidays.trim()) {
        setupForm.holidays.split(',').map(h => h.trim()).filter(Boolean).forEach(dateStr => {
          const idx = events.findIndex(e => e.event_date === dateStr);
          if (idx !== -1) events[idx] = { event_date: dateStr, title: 'Holiday', type: 'holiday' };
          else events.push({ event_date: dateStr, title: 'Holiday', type: 'holiday' });
        });
      }
    } else if (setupForm.resumed === 'no' && setupForm.resumption_date) {
      events.push({ event_date: setupForm.resumption_date, title: 'Planned Resumption', type: 'school_day' });
    }
    if (events.length > 0) {
      await fetch('/api/calendar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });
    }
    // Save resumption_date to session so attendance week calc works
    if (setupForm.resumption_date) {
      await fetch("/api/sessions/term", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumption_date: setupForm.resumption_date }),
      });
    }
    setShowSetup(false);
    setHasAnyEvents(true);
    fetchEvents(); fetchWeek();
    success('Calendar set up!');
  }

  // Get events for a specific date
  function eventsForDate(date: string) {
    return events.filter(e => e.event_date === date);
  }

  const daysByDate = new Map<string, CalEvent[]>();
  events.forEach(e => {
    const list = daysByDate.get(e.event_date) ?? [];
    list.push(e);
    daysByDate.set(e.event_date, list);
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  while (days.length % 7 !== 0) days.push(null);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  // Current week Mon-Sun labels
  const now = new Date();
  const dow = now.getDay();
  const diffMon = dow === 0 ? -6 : 1 - dow;
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + diffMon + i);
    weekDays.push(d);
  }

  const selectedEvents = selectedDate ? (daysByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">School Calendar</h2>
        {!showSetup && (
          <Button size="sm" variant="outline" onClick={() => setShowSetup(true)}>Setup Calendar</Button>
        )}
      </div>

      {/* Weeks in term */}
      <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Weeks in this term:</label>
        <input
          type="number" min="1" max="20"
          value={weeksInTerm}
          onChange={e => setWeeksInTerm(e.target.value)}
          placeholder="e.g. 13"
          className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
        />
        <Button size="sm" onClick={async () => {
          if (!weeksInTerm) return;
          await fetch('/api/sessions/term', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance_weeks: parseInt(weeksInTerm) }) });
          window.dispatchEvent(new Event('sessions-updated'));
          success('Weeks saved!');
        }}>Save</Button>
      </div>

      {/* Setup card */}
      {showSetup && (
        <div className="p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">📅 Calendar Setup</h3>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Has your school resumed this term?</p>
            <div className="flex gap-3">
              <button onClick={() => setSetupForm(f => ({ ...f, resumed: 'yes' }))} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${setupForm.resumed === 'yes' ? 'bg-green-500 text-white border-green-500' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>Yes</button>
              <button onClick={() => setSetupForm(f => ({ ...f, resumed: 'no' }))} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${setupForm.resumed === 'no' ? 'bg-orange-500 text-white border-orange-500' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}>No</button>
            </div>
          </div>
          {setupForm.resumed && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                {setupForm.resumed === 'yes' ? 'Resumption date' : 'Planned resumption date'}
              </label>
              <input type="date" value={setupForm.resumption_date} onChange={e => setSetupForm(f => ({ ...f, resumption_date: e.target.value }))}
                className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500" />
            </div>
          )}
          {setupForm.resumed === 'yes' && (
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Holidays in that range (comma-separated dates, YYYY-MM-DD)</label>
              <input type="text" value={setupForm.holidays} onChange={e => setSetupForm(f => ({ ...f, holidays: e.target.value }))}
                placeholder="e.g. 2025-01-01, 2025-02-14"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500" />
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowSetup(false)}>Cancel</Button>
            <Button onClick={handleSetup}>Set Up Calendar</Button>
          </div>
        </div>
      )}

      {/* Calendar grid */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h3 className="font-bold text-gray-900 dark:text-gray-100">
            {monthNames[viewMonth]} {viewYear}
          </h3>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
            <div key={d} className="text-center text-[11px] font-bold text-gray-400 uppercase tracking-wide py-2">{d}</div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            if (!day) return <div key={idx} className="min-h-[44px] border-b border-r border-gray-100 dark:border-gray-800" />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === fmt(today);
            const dayEvents = daysByDate.get(dateStr) ?? [];
            const isSelected = selectedDate === dateStr;
            return (
              <div
                key={idx}
                onClick={() => { setSelectedDate(dateStr === selectedDate ? null : dateStr); }}
                className={`min-h-[44px] border-b border-r border-gray-100 dark:border-gray-800 p-1 cursor-pointer transition-colors ${
                  isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-semibold mb-0.5 ${
                  isToday ? 'bg-orange-500 text-white' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {day}
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {dayEvents.slice(0, 2).map(ev => (
                    <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${TYPE_CONFIG[ev.type]?.dot ?? 'bg-gray-400'}`} title={ev.title} />
                  ))}
                  {dayEvents.length > 2 && <span className="text-[8px] text-gray-400">+{dayEvents.length - 2}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </div>
        ))}
      </div>

      {/* Selected day popover */}
      {selectedDate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => { setShowAddModal(true); }}>
                <Plus size={13} /> Add Event
              </Button>
              <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <X size={16} className="text-gray-400" />
              </button>
            </div>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No events on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(ev => (
                <div key={ev.id} className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${TYPE_CONFIG[ev.type]?.color ?? ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${TYPE_CONFIG[ev.type]?.dot}`} />
                    <span className="font-medium">{ev.title}</span>
                    <span className="opacity-70 text-xs">({TYPE_CONFIG[ev.type]?.label})</span>
                  </div>
                  <button onClick={() => handleDeleteEvent(ev.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week summary */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">This Week</h3>
        <div className="grid grid-cols-7 gap-1 overflow-x-auto">
          {weekDays.map((d, i) => {
            const ds = fmt(d);
            const wde = weekEvents.filter(e => e.event_date === ds);
            const isT = ds === fmt(today);
            return (
              <div key={i} className={`rounded-xl p-2 border ${isT ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}>
                <p className={`text-[10px] font-bold uppercase mb-1 ${isT ? 'text-orange-500' : 'text-gray-400'}`}>
                  {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
                </p>
                <p className={`text-sm font-bold ${isT ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>{d.getDate()}</p>
                <div className="mt-1.5 space-y-1">
                  {wde.length === 0 ? (
                    <p className="text-[9px] text-gray-300 dark:text-gray-600">{[5,6].includes(i) ? 'Weekend' : 'No events'}</p>
                  ) : wde.map(ev => (
                    <div key={ev.id} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_CONFIG[ev.type]?.dot}`} />
                      <p className="text-[9px] text-gray-600 dark:text-gray-400 truncate">{ev.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add event modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title={`Add Event — ${selectedDate}`} size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Title *</label>
            <input
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. School Day, Public Holiday..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Event Type</label>
            <select
              value={addForm.type}
              onChange={e => setAddForm(f => ({ ...f, type: e.target.value as EventType }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            >
              {Object.entries(TYPE_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddEvent} className="flex-1">Add Event</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}