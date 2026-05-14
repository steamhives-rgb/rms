// StudentsModule dashboard component


'use client';
import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import StudentsTable from './StudentsTable';
import StudentForm from './StudentForm';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Student, AcademicSession } from '@/lib/types';

interface StudentsModuleProps { compact?: boolean; }

interface SchoolClass { id: number; name: string; is_active: boolean; }

export default function StudentsModule({ compact }: StudentsModuleProps) {
  const { success, error: showError } = useToast();
  const { school } = useAuth();
  const [students,      setStudents]      = useState<Student[]>([]);
  const [sessions,      setSessions]      = useState<AcademicSession[]>([]);
  const [activeClasses, setActiveClasses] = useState<SchoolClass[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [filterClass,   setFilterClass]   = useState('');
  const [filterSess,    setFilterSess]    = useState('');
  const [filterTerm,    setFilterTerm]    = useState('');  // §2c: '' = All Terms
  const [search,        setSearch]        = useState('');
  const [editStudent,   setEditStudent]   = useState<Student | null | undefined>(undefined);
  const [showForm,      setShowForm]      = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<Student | null>(null);

  const currentSession = sessions.find(s => s.is_current)?.label ?? '';

  // Fetch active classes from the class module (not hardcoded)
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveClasses(d.classes ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) setSessions(d.sessions ?? []);
    });
  }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass) params.set('class',   filterClass);
      if (filterSess)  params.set('session', filterSess);
      if (filterTerm)  params.set('term',    filterTerm);   // §2c: only filter if non-empty
      if (search)      params.set('search',  search);
      const res  = await fetch(`/api/students?${params}`);
      const data = await res.json();
      if (data.success) setStudents(data.students ?? []);
    } catch { showError('Failed to load students.'); }
    finally  { setLoading(false); }
  }

  useEffect(() => { fetchStudents(); }, [filterClass, filterSess, filterTerm, search]);

  async function handleDelete(s: Student) {
    try {
      const res  = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: s.id }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Delete failed.'); return; }
      success('Student deleted.');
      fetchStudents();
    } catch { showError('Network error.'); }
    setDeleteTarget(null);
  }

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...activeClasses.map(c => ({ value: c.name, label: c.name })),
  ];

  const title = compact ? (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Students ({students.length})</h2>
    </div>
  ) : null;

  return (
    <div>
      {compact ? title : (
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Students</h2>
          <Button size="sm" onClick={() => { setEditStudent(null); setShowForm(true); }}>
            <Plus size={15} /> Add Student
          </Button>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
              placeholder="Search students…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Select options={classOptions} value={filterClass} onChange={e => setFilterClass(e.target.value)} wrapperClass="w-36" />
          {/* Bug G: proper All Sessions select */}
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-36"
            value={filterSess}
            onChange={e => setFilterSess(e.target.value)}
          >
            <option value="">All Sessions</option>
            {sessions.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
          {/* §2c: All Terms filter */}
          <select
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-32"
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
          >
            <option value="">All Terms</option>
            <option value="1st Term">1st Term</option>
            <option value="2nd Term">2nd Term</option>
            <option value="3rd Term">3rd Term</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : (
        <StudentsTable
          students={compact ? students.slice(0, 5) : students}
          onEdit={compact ? undefined : s => { setEditStudent(s); setShowForm(true); }}
          onDelete={compact ? undefined : setDeleteTarget}
        />
      )}

      {/* Add/Edit modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditStudent(undefined); }}
        title={editStudent ? 'Edit Student' : 'Add Student'}
        size="lg"
      >
        <StudentForm
          student={editStudent}
          defaultSession={currentSession}
          schoolType={school?.school_type}
          activeClasses={activeClasses.map(c => c.name)}
          onSaved={() => { setShowForm(false); setEditStudent(undefined); fetchStudents(); }}
          onCancel={() => { setShowForm(false); setEditStudent(undefined); }}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Student" size="sm">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}