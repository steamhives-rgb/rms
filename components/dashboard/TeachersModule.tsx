'use client';
import { useState, useEffect } from 'react';
import { Plus, LogIn, Copy, Check, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import TeacherForm from './TeacherForm';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Teacher } from '@/lib/types';

interface TeachersModuleProps { compact?: boolean; }

interface SuccessInfo {
  name: string;
  employee_id: string;
  generated_password: string;
  teacher_id: number;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Copy">
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
    </button>
  );
}

export default function TeachersModule({ compact }: TeachersModuleProps) {
  const { success, error: showError } = useToast();
  const { school, refetch } = useAuth();
  const [teachers,     setTeachers]     = useState<Teacher[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [activeClasses, setActiveClasses] = useState<string[]>([]);
  const [editTeacher,  setEditTeacher]  = useState<Teacher | null | undefined>(undefined);
  const [showForm,     setShowForm]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [successInfo,  setSuccessInfo]  = useState<SuccessInfo | null>(null);
  const [showPw,       setShowPw]       = useState(false);
  const [impersonating, setImpersonating] = useState<Teacher | null>(null);

  async function fetchTeachers() {
    setLoading(true);
    try {
      const res  = await fetch('/api/teachers');
      const data = await res.json();
      if (data.success) setTeachers(data.teachers ?? []);
      else console.error('[TeachersModule] fetchTeachers error:', data.error);
    } catch (e) {
      console.error('[TeachersModule] fetchTeachers network error:', e);
      showError('Failed to load teachers.');
    } finally  { setLoading(false); }
  }

  useEffect(() => { fetchTeachers(); }, []);

  // Fix #8: load active classes from API so TeacherForm never shows archived classes
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => {
        if (d.success) setActiveClasses((d.classes ?? []).map((c: { name: string }) => c.name));
      })
      .catch(() => {});
  }, []);

  async function handleDelete(t: Teacher) {
    try {
      // Pass id as query param so the DELETE route can read it without a body
      const res  = await fetch(`/api/teachers?id=${t.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Delete failed.'); return; }
      success('Teacher removed.');
      setTeachers(prev => prev.filter(x => x.id !== t.id));
    } catch { showError('Network error.'); }
    setDeleteTarget(null);
  }

  async function handleApprove(t: Teacher, status: 'approved' | 'rejected') {
    try {
      // Use PATCH — only updates approval_status, never touches other teacher fields
      const res = await fetch('/api/teachers', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, approval_status: status }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      // Prefer the server-returned teacher object so state is always in sync
      const updated = data.teacher as Teacher | undefined;
      setTeachers(prev => prev.map(x =>
        x.id === t.id ? (updated ?? { ...x, approval_status: status }) : x
      ));
      success(`Teacher ${status === 'approved' ? 'approved ✓' : 'rejected'}.`);
    } catch { showError('Network error.'); }
  }

  async function handleImpersonate(t: Teacher) {
    try {
      const res = await fetch('/api/teachers/impersonate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: t.id }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to impersonate.'); return; }
      window.location.href = '/teacher';
    } catch { showError('Network error.'); }
    setImpersonating(null);
  }

  function handleSaved(data?: { employee_id?: string; generated_password?: string; id?: number; name?: string; teacher?: Teacher }) {
    setShowForm(false);
    // If editing an existing teacher, update in-place from returned teacher object
    if (data?.teacher && !data?.generated_password && editTeacher) {
      setTeachers(prev => prev.map(x => x.id === data.teacher!.id ? data.teacher! : x));
      success('Teacher updated.');
    } else if (!data?.generated_password && editTeacher) {
      // Edit response without teacher object — refetch to stay in sync
      fetchTeachers();
      success('Teacher updated.');
    } else {
      // New teacher — refetch to get full list with new entry
      fetchTeachers();
      if (!data?.generated_password) {
        // Manual password was supplied — no popup needed but still toast
        success('Teacher saved successfully.');
      }
    }
    // Refetch auth so role-based permissions and dashboard rendering update immediately (#1)
    refetch();
    // Show success popup only for new teacher (has generated_password)
    if (data?.generated_password && data?.employee_id) {
      setSuccessInfo({
        name: data.name ?? 'Teacher',
        employee_id: data.employee_id,
        generated_password: data.generated_password,
        teacher_id: data.id ?? 0,
      });
      setShowPw(false);
    }
    setEditTeacher(undefined);
  }

  const statusBadge = (s: Teacher['approval_status']) => {
    const map = { approved: 'success', pending: 'warning', rejected: 'error' } as const;
    return <Badge variant={map[s ?? 'approved']}>{s ?? 'approved'}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">
          Teachers
          {(() => {
            const pending = teachers.filter(t => t.approval_status === 'pending').length;
            return pending > 0 ? (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                {pending} pending
              </span>
            ) : null;
          })()}
        </h2>
        {!compact && (
          <Button size="sm" onClick={() => { setEditTeacher(null); setShowForm(true); }}>
            <Plus size={15} /> Add Teacher
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !teachers.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">👩‍🏫</p>
          <p className="font-medium">No teachers yet</p>
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th>Teacher</Th>
              <Th>Employee ID</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              {!compact && <Th className="text-right">Actions</Th>}
            </tr>
          </Thead>
          <Tbody>
            {(compact ? teachers.slice(0, 5) : teachers).map(t => (
              <Tr key={t.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar src={t.avatar} name={t.name} size="sm" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{t.name}</p>
                      {t.email && <p className="text-xs text-gray-400">{t.email}</p>}
                    </div>
                  </div>
                </Td>
                <Td><span className="font-mono text-xs">{t.employee_id ?? '—'}</span></Td>
                <Td className="capitalize">{t.role}</Td>
                <Td>{statusBadge(t.approval_status)}</Td>
                {!compact && (
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {t.approval_status === 'pending' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(t, 'approved')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors border border-emerald-200 dark:border-emerald-800"
                          >
                            <Check size={11} /> Approve
                          </button>
                          <button
                            onClick={() => handleApprove(t, 'rejected')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors border border-red-200 dark:border-red-800"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                      {t.approval_status === 'approved' && (
                        <button
                          onClick={() => setImpersonating(t)}
                          className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 font-medium"
                          title="Log in as teacher"
                        >
                          <LogIn size={12} /> Log in as
                        </button>
                      )}
                      <button onClick={() => { setEditTeacher(t); setShowForm(true); }} className="text-xs text-orange-500 hover:text-orange-700 font-medium">Edit</button>
                      <button onClick={() => setDeleteTarget(t)} className="text-xs text-red-500 hover:text-red-700 font-medium">Remove</button>
                    </div>
                  </Td>
                )}
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      {/* Add / Edit form modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditTeacher(undefined); }}
        title={editTeacher ? 'Edit Teacher' : 'Add Teacher'} size="lg">
        <TeacherForm
          teacher={editTeacher}
          schoolAbbreviation={school?.abbreviation}
          activeClasses={activeClasses}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditTeacher(undefined); }}
        />
      </Modal>

      {/* Success popup */}
      <Modal open={!!successInfo} onClose={() => setSuccessInfo(null)} title="Teacher Registered!" size="sm">
        {successInfo && (
          <div className="space-y-5">
            {/* Green banner */}
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">{successInfo.name} added!</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">Share credentials below before closing.</p>
              </div>
            </div>

            {/* Employee ID chip */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                Employee ID
              </label>
              <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-3">
                <span className="font-mono font-bold text-xl text-orange-700 dark:text-orange-300 flex-1 select-all">
                  {successInfo.employee_id}
                </span>
                <CopyButton text={successInfo.employee_id} />
              </div>
            </div>

            {/* Password chip */}
            <div>
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-1.5">
                Generated Password
              </label>
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3">
                <span className="font-mono font-bold text-xl text-blue-700 dark:text-blue-300 flex-1 tracking-wider select-all">
                  {showPw ? successInfo.generated_password : '••••••••'}
                </span>
                <button onClick={() => setShowPw(v => !v)} className="p-1.5 rounded-lg text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors" title={showPw ? 'Hide' : 'Show'}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <CopyButton text={successInfo.generated_password} />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                ⚠️ Share this password securely — it won&apos;t be shown again. The teacher can change it after logging in.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => {
                setSuccessInfo(null);
                setEditTeacher(null);
                setShowForm(true);
              }}>
                Register Another
              </Button>
              <Button className="flex-1" onClick={async () => {
                const res = await fetch('/api/teachers/impersonate', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ teacher_id: successInfo.teacher_id }),
                });
                const d = await res.json();
                if (d.success) window.location.href = '/teacher';
                else showError(d.error ?? 'Failed.');
              }}>
                <LogIn size={14} /> Log in as Teacher
              </Button>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSuccessInfo(null)}
            >
              Done
            </Button>
          </div>
        )}
      </Modal>

      {/* Impersonate confirm */}
      <Modal open={!!impersonating} onClose={() => setImpersonating(null)} title="Log in as Teacher" size="sm">
        <p className="text-gray-700 dark:text-gray-300 mb-6 text-sm">
          Log in as <strong>{impersonating?.name}</strong>? You will be redirected to the teacher portal.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setImpersonating(null)} className="flex-1">Cancel</Button>
          <Button onClick={() => impersonating && handleImpersonate(impersonating)} className="flex-1">
            <LogIn size={14} /> Continue
          </Button>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Teacher" size="sm">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Remove <strong>{deleteTarget?.name}</strong>? This will also delete their login account.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex-1">Remove</Button>
        </div>
      </Modal>
    </div>
  );
}