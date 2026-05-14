'use client';
// STEAMhives RMS - AdminPanel (Super-Admin / Developer Dashboard)
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import ThemeToggle from '@/components/layout/ThemeToggle';
import SchoolsTable from './SchoolsTable';
import CouponGenerator from './CouponGenerator';
import ImpersonateModal from './ImpersonateModal';

// Types
export interface DevSchool {
  id: string;
  name: string;
  abbreviation: string;
  student_limit: number | null;
  plan_label: string;
  created_at: string;
}

export interface DevCoupon {
  id: number;
  code: string;
  type: string;
  plan_label: string;
  student_limit: number | null;
  used: boolean;
  used_by: string | null;
  used_by_name: string | null;
  created_at: string;
}

export interface DevLog {
  id: number;
  school_id: string | null;
  action: string;
  details: string | null;
  ip: string | null;
  created_at: string;
}

export interface DevData {
  schools: DevSchool[];
  coupons: DevCoupon[];
  logs: DevLog[];
  studentCounts: Record<string, number>;
  resultCounts: Record<string, number>;
}

type Page = 'dashboard' | 'schools' | 'coupons' | 'logs' | 'schoolsettings';

const PAGE_META: Record<Page, { title: string; meta: string; icon: string }> = {
  dashboard:      { title: 'Dashboard',       meta: 'System overview',           icon: '📊' },
  schools:        { title: 'Schools',          meta: 'All registered schools',    icon: '🏫' },
  coupons:        { title: 'Coupons',          meta: 'Generate & manage coupons', icon: '🎫' },
  logs:           { title: 'Audit Logs',       meta: 'Activity trail',            icon: '📋' },
  schoolsettings: { title: 'School Settings',  meta: 'Branding & signatures',     icon: '⚙️' },
};

export default function AdminPanel() {
  const router = useRouter();
  const { success: showSuccess, error: showError } = useToast();

  // Use a ref so loadData's useCallback doesn't re-create on every toast render
  // This is the FIX for the infinite refresh/re-render loop
  const showErrorRef = useRef(showError);
  useEffect(() => { showErrorRef.current = showError; }, [showError]);

  const [page,        setPage]     = useState<Page>('dashboard');
  const [data,        setData]     = useState<DevData | null>(null);
  const [loading,     setLoading]  = useState(true);
  const [sidebarOpen, setSidebar]  = useState(false);
  const [impSchool,   setImpSchool] = useState<DevSchool | null>(null);

  // FIXED: empty dep array - showError accessed via ref to prevent infinite loop
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dev/schools');
      const json = await res.json();
      if (!json.success) { showErrorRef.current(json.error ?? 'Failed to load data'); return; }
      setData(json);
    } catch { showErrorRef.current('Network error.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    await fetch('/api/auth/dev-logout', { method: 'POST' });
    router.push('/admin');
    router.refresh();
  }

  async function handleDeleteSchool(school: DevSchool) {
    if (!confirm('PERMANENTLY delete:\n"' + school.name + '"\n\nAll data will be lost.')) return;
    try {
      const res = await fetch('/api/dev/schools', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: school.id }),
      });
      const json = await res.json();
      if (!json.success) { showError(json.error ?? 'Delete failed'); return; }
      showSuccess('"' + school.name + '" deleted.');
      loadData();
    } catch { showError('Network error.'); }
  }

  async function handleResetPwd(school: DevSchool) {
    const pwd = prompt('New password for "' + school.name + '" (min 6 chars):');
    if (!pwd) return;
    if (pwd.length < 6) { showError('Password must be at least 6 characters.'); return; }
    try {
      const res = await fetch('/api/dev/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: school.id, new_password: pwd }),
      });
      const json = await res.json();
      if (!json.success) { showError(json.error ?? 'Reset failed'); return; }
      showSuccess('Password reset successfully!');
    } catch { showError('Network error.'); }
  }

  function handleExport() {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'steamhives-export-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    showSuccess('Export downloaded!');
  }

  const totalCoupons = data?.coupons.length ?? 0;
  const usedCoupons  = data?.coupons.filter(c => c.used).length ?? 0;
  const pm = PAGE_META[page];

  const navItems: { page: Page; label: string; icon: string }[] = [
    { page: 'dashboard',      label: 'Dashboard',      icon: '📊' },
    { page: 'schools',        label: 'Schools',         icon: '🏫' },
    { page: 'coupons',        label: 'Coupons',         icon: '🎫' },
    { page: 'logs',           label: 'Audit Logs',      icon: '📋' },
    { page: 'schoolsettings', label: 'School Settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100" style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setSidebar(false)} />
      )}

      {/* Sidebar */}
      <aside className={'fixed top-0 left-0 h-full w-60 z-50 flex flex-col bg-gray-900 dark:bg-gray-950 border-r border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ' + (sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30">S</div>
          <div>
            <div className="font-black text-white text-sm tracking-tight">STEAMhives</div>
            <div className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Developer</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <p className="px-3 text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-bold">Overview</p>
          {navItems.slice(0, 2).map(item => (
            <SidebarItem key={item.page} active={page === item.page} icon={item.icon} label={item.label}
              onClick={() => { setPage(item.page); setSidebar(false); }} />
          ))}

          <p className="px-3 text-[10px] text-gray-600 uppercase tracking-widest mt-5 mb-3 font-bold">Management</p>
          {navItems.slice(2).map(item => (
            <SidebarItem key={item.page} active={page === item.page} icon={item.icon} label={item.label}
              onClick={() => { setPage(item.page); setSidebar(false); }} />
          ))}

          <p className="px-3 text-[10px] text-gray-600 uppercase tracking-widest mt-5 mb-3 font-bold">Actions</p>
          <button onClick={handleExport} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-150 flex items-center gap-2.5 font-medium">
            <span>⬇️</span> Export All Data
          </button>
          <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 flex items-center gap-2.5 font-medium">
            <span>🚪</span> Logout
          </button>
        </nav>

        <div className="px-4 py-3 border-t border-gray-800 shrink-0">
          <p className="text-[10px] text-gray-600 font-medium">STEAMhives RMS v2.0 2025</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => setSidebar(true)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <div className="font-black text-gray-900 dark:text-white text-sm tracking-tight">{pm.icon} {pm.title}</div>
              <div className="text-[11px] text-gray-500 font-medium">{pm.meta}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="hidden sm:inline text-xs bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 rounded-full px-3 py-1 font-bold tracking-wide">
              Developer
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7 bg-slate-50 dark:bg-gray-950">
          {loading ? (
            <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
          ) : (
            <>
              {page === 'dashboard' && (
                <DashboardPage data={data} totalCoupons={totalCoupons} usedCoupons={usedCoupons}
                  onImpersonate={setImpSchool} onResetPwd={handleResetPwd} onDelete={handleDeleteSchool}
                  onExport={handleExport} onGoToCoupons={() => setPage('coupons')} />
              )}
              {page === 'schools' && (
                <SchoolsTable schools={data?.schools ?? []} studentCounts={data?.studentCounts ?? {}}
                  resultCounts={data?.resultCounts ?? {}} onImpersonate={setImpSchool}
                  onResetPwd={handleResetPwd} onDelete={handleDeleteSchool} />
              )}
              {page === 'coupons' && (
                <CouponGenerator coupons={data?.coupons ?? []} onRefresh={loadData} />
              )}
              {page === 'logs' && <LogsPage logs={data?.logs ?? []} />}
              {page === 'schoolsettings' && (
                <SchoolSettingsPage schools={data?.schools ?? []} showSuccess={showSuccess} showError={showError} />
              )}
            </>
          )}
        </main>
      </div>

      {impSchool && <ImpersonateModal school={impSchool} onClose={() => setImpSchool(null)} />}
    </div>
  );
}

function SidebarItem({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={'w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 flex items-center gap-2.5 ' + (active ? 'bg-orange-500/15 text-orange-400 shadow-sm' : 'text-gray-400 hover:bg-gray-800 hover:text-white')}>
      <span>{icon}</span>
      {label}
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-400" />}
    </button>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 relative overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="text-2xl mb-3">{icon}</div>
      <div className="text-3xl font-black text-gray-900 dark:text-white tabular-nums">{value}</div>
      <div className="text-xs text-gray-500 mt-1 font-bold uppercase tracking-wide">{label}</div>
      <div className={'absolute bottom-0 left-0 right-0 h-0.5 ' + color} />
    </div>
  );
}

function DashboardPage({ data, totalCoupons, usedCoupons, onImpersonate, onResetPwd, onDelete, onExport, onGoToCoupons }: {
  data: DevData | null; totalCoupons: number; usedCoupons: number;
  onImpersonate: (s: DevSchool) => void; onResetPwd: (s: DevSchool) => void;
  onDelete: (s: DevSchool) => void; onExport: () => void; onGoToCoupons: () => void;
}) {
  const schools = data?.schools ?? [];
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 dark:from-gray-900 dark:to-gray-950 border border-slate-700 dark:border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center text-2xl shrink-0">🔐</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-white tracking-tight">Developer Admin Portal</h1>
            <p className="text-sm text-gray-500 font-medium">STEAMhives RMS — System Overview</p>
          </div>
          <Button variant="outline" size="sm" onClick={onExport} className="border-gray-700 text-gray-300 hover:bg-gray-800 font-semibold">
            Export All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon="🏫" value={schools.length}             label="Total Schools" color="bg-emerald-500" />
        <StatCard icon="🎫" value={totalCoupons}               label="Coupons Total" color="bg-amber-500"   />
        <StatCard icon="✅" value={usedCoupons}                label="Coupons Used"  color="bg-blue-500"    />
        <StatCard icon="🟢" value={totalCoupons - usedCoupons} label="Available"     color="bg-purple-500"  />
      </div>

      {schools.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">🏗️</div>
          <h3 className="text-lg font-black text-gray-700 dark:text-gray-300 mb-2">No schools registered yet</h3>
          <p className="text-sm text-gray-500 mb-5 max-w-sm mx-auto font-medium">Generate coupons and share them so schools can self-register.</p>
          <Button onClick={onGoToCoupons} className="font-bold">🎫 Generate Coupons</Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <h2 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">🏫 Registered Schools</h2>
            <span className="text-xs text-gray-500 font-semibold">{schools.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <SchoolsTable schools={schools} studentCounts={data?.studentCounts ?? {}} resultCounts={{}}
              onImpersonate={onImpersonate} onResetPwd={onResetPwd} onDelete={onDelete} compact />
          </div>
        </div>
      )}

      {(data?.logs ?? []).length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
            <h2 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">📋 Recent Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                  {['Time','School','Action','Details'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] text-gray-500 font-bold uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.logs ?? []).slice(0, 8).map(l => (
                  <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap font-mono">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3"><code className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{l.school_id ?? 'sys'}</code></td>
                    <td className="px-4 py-3 font-bold text-orange-500 dark:text-orange-400 text-xs">{l.action}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{l.details ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function LogsPage({ logs }: { logs: DevLog[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <h2 className="font-black text-gray-900 dark:text-white text-sm tracking-tight">📋 Full Audit Log</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
              {['Timestamp','School ID','Action','Details','IP'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] text-gray-500 font-bold uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500 text-sm font-medium">No logs yet</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap font-mono">{l.created_at ? new Date(l.created_at).toLocaleString() : '—'}</td>
                <td className="px-4 py-3"><code className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{l.school_id ?? 'sys'}</code></td>
                <td className="px-4 py-3 font-bold text-orange-500 dark:text-orange-400 text-xs">{l.action}</td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-medium">{l.details ?? ''}</td>
                <td className="px-4 py-3 text-[11px] text-gray-500 font-mono">{l.ip ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchoolSettingsPage({ schools, showSuccess, showError }: {
  schools: DevSchool[]; showSuccess: (m: string) => void; showError: (m: string) => void;
}) {
  const [selectedId, setSelectedId] = useState('');
  const [stamp,  setStamp]  = useState<string | null>(null);
  const [sig,    setSig]    = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function readFile(key: 'stamp' | 'sig', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const d = ev.target?.result as string;
      if (key === 'stamp') setStamp(d); else setSig(d);
    };
    reader.readAsDataURL(file);
  }

  async function saveBranding(field: 'school_stamp' | 'sig_principal', value: string | null) {
    if (!selectedId) { showError('Select a school first.'); return; }
    if (!value)      { showError('Upload an image first.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/schools/branding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school_id: selectedId, [field]: value }),
      });
      const json = await res.json();
      if (!json.success) { showError(json.error ?? 'Save failed'); return; }
      showSuccess((field === 'school_stamp' ? 'School stamp' : 'Principal signature') + ' saved!');
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 space-y-6 max-w-2xl shadow-sm">
      <h2 className="font-black text-gray-900 dark:text-white tracking-tight">School Branding Management</h2>
      <div>
        <label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-wide">Select School</label>
        <select value={selectedId} onChange={e => { setSelectedId(e.target.value); setStamp(null); setSig(null); }}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-colors">
          <option value="">Choose a school...</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name || s.id}</option>)}
        </select>
      </div>
      {selectedId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: 'stamp' as const, field: 'school_stamp' as const, label: 'School Stamp / Logo', value: stamp, emoji: '📤' },
            { key: 'sig'   as const, field: 'sig_principal' as const, label: 'Principal Signature', value: sig,   emoji: '✍️' },
          ].map(({ key, field, label, value, emoji }) => (
            <div key={key} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wide">{label}</p>
              {value
                ? <img src={value} alt={key} className="w-full h-32 object-contain rounded-xl" />
                : <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-orange-400 transition-colors text-xs text-gray-500 font-semibold gap-2">
                    <span className="text-2xl">{emoji}</span>
                    Click to upload
                    <input type="file" accept="image/*" className="sr-only" onChange={e => readFile(key, e)} />
                  </label>
              }
              <Button size="sm" className="w-full font-bold" loading={saving} onClick={() => saveBranding(field, value)}>
                Save {label.split(' / ')[0]}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}