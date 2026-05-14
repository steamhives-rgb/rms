'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, X, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS } from '@/lib/constants';
import { useActiveClasses } from '@/hooks/useActiveClasses';
import type { Subject, SubjectAssignment, Teacher, AcademicSession } from '@/lib/types';

const SUBJECT_PRESETS: Record<string, string[]> = {
  'Creche': ['Numeracy', 'Literacy', 'Rhymes & Songs', 'Colour Recognition', 'Shape Recognition', 'Story Time', 'Play Activities', 'Social Skills', 'Physical & Health Education'],
  'Nursery': ['English Language', 'Numeracy', 'Rhymes & Songs', 'Handwriting', 'Phonics', 'General Knowledge', 'Creative Arts', 'Physical & Health Education', 'Social Habits'],
  'Nursery 1': ['English Language', 'Numeracy', 'Phonics', 'Handwriting', 'Rhymes & Songs', 'General Knowledge', 'Creative Arts', 'Physical & Health Education', 'Social Habits'],
  'Nursery 2': ['English Language', 'Numeracy', 'Phonics', 'Handwriting', 'Rhymes & Songs', 'General Knowledge', 'Creative Arts', 'Physical & Health Education', 'Social Habits'],
  'Kindergarten': ['English Language', 'Mathematics', 'Phonics', 'Handwriting', 'Social Studies', 'Basic Science', 'Creative Arts', 'Physical & Health Education', 'Verbal Reasoning'],
  'KG 1': ['English Language', 'Mathematics', 'Phonics', 'Handwriting', 'Social Studies', 'Basic Science', 'Creative Arts', 'Physical & Health Education', 'Verbal Reasoning'],
  'KG 2': ['English Language', 'Mathematics', 'Phonics', 'Handwriting', 'Social Studies', 'Basic Science', 'Creative Arts', 'Physical & Health Education', 'Verbal Reasoning'],
  'Primary 1': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies'],
  'Primary 2': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies'],
  'Primary 3': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies'],
  'Primary 4': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies', 'Agricultural Science'],
  'Primary 5': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies', 'Agricultural Science'],
  'Primary 6': ['English Language', 'Mathematics', 'Basic Science & Technology', 'Social Studies', 'National Values Education', 'Cultural & Creative Arts', 'Verbal Reasoning', 'Quantitative Reasoning', 'Physical & Health Education', 'Computer Studies', 'Agricultural Science'],
  'JSS 1': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Cultural & Creative Arts', 'Business Studies', 'Computer Studies', 'French Language', 'Physical & Health Education', 'Agricultural Science', 'Home Economics', 'Christian Religious Studies'],
  'JSS 2': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Cultural & Creative Arts', 'Business Studies', 'Computer Studies', 'French Language', 'Physical & Health Education', 'Agricultural Science', 'Home Economics', 'Christian Religious Studies'],
  'JSS 3': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Cultural & Creative Arts', 'Business Studies', 'Computer Studies', 'French Language', 'Physical & Health Education', 'Agricultural Science', 'Home Economics', 'Christian Religious Studies'],
  'SS 1': ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government', 'Literature in English', 'Geography', 'Computer Studies', 'Christian Religious Studies', 'Civic Education', 'Further Mathematics'],
  'SS 2': ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government', 'Literature in English', 'Geography', 'Computer Studies', 'Christian Religious Studies', 'Civic Education', 'Further Mathematics'],
  'SS 3': ['English Language', 'Mathematics', 'Biology', 'Chemistry', 'Physics', 'Economics', 'Government', 'Literature in English', 'Geography', 'Computer Studies', 'Christian Religious Studies', 'Civic Education', 'Further Mathematics'],
};

const TERM_OPTIONS  = [{ value: '', label: 'All Terms'  }, ...TERMS.map(t => ({ value: t, label: t }))];

export default function SubjectsModule() {
  const { success, error: showError } = useToast();
  const activeClasses = useActiveClasses();
  const [subjects,     setSubjects]     = useState<Subject[]>([]);
  const [assignments,  setAssignments]  = useState<SubjectAssignment[]>([]);
  const [teachers,     setTeachers]     = useState<Teacher[]>([]);
  const [sessions,     setSessions]     = useState<AcademicSession[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [search,       setSearch]       = useState('');
  const [tab,          setTab]          = useState<'subjects' | 'assignments' | 'bulk'>('subjects');
  // Bulk add state
  const [bulkClass,    setBulkClass]    = useState('');
  const [bulkSubjects, setBulkSubjects] = useState<string[]>([]);
  const [bulkInput,    setBulkInput]    = useState('');
  const [editingIdx,   setEditingIdx]   = useState<number | null>(null);
  const [editingVal,   setEditingVal]   = useState('');
  const [bulkSaving,   setBulkSaving]   = useState(false);

  // Subject form
  const [showSubjectForm, setShowSubjectForm] = useState(false);
  const [editSubject,     setEditSubject]     = useState<Partial<Subject> | null>(null);
  const [deleteTarget,    setDeleteTarget]    = useState<Subject | null>(null);

  // Assignment form
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignForm, setAssignForm] = useState({ subject_id: '', class: '', teacher_id: '', term: '', session: '' });
  const [filterClass,  setFilterClass]  = useState('');
  const [filterTerm,   setFilterTerm]   = useState('');
  const [filterSess,   setFilterSess]   = useState('');

  async function fetchSubjects() {
    setLoading(true);
    try {
      const res  = await fetch('/api/subjects');
      const data = await res.json();
      if (data.success) setSubjects(data.subjects ?? []);
    } catch { showError('Failed to load subjects.'); }
    finally  { setLoading(false); }
  }

  async function fetchAssignments() {
    const p = new URLSearchParams();
    if (filterClass) p.set('class', filterClass);
    if (filterTerm)  p.set('term',  filterTerm);
    if (filterSess)  p.set('session', filterSess);
    const res  = await fetch(`/api/subjects/assignments?${p}`);
    const data = await res.json();
    if (data.success) setAssignments(data.assignments ?? []);
  }

  useEffect(() => {
    fetchSubjects();
    fetch('/api/teachers').then(r => r.json()).then(d => { if (d.success) setTeachers(d.teachers ?? []); });
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        setSessions(d.sessions ?? []);
        const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
        if (cur) { setFilterSess(cur.label); setFilterTerm(cur.current_term ?? ''); setAssignForm(f => ({ ...f, term: cur.current_term ?? '', session: cur.label })); }
      }
    });
  }, []);

  useEffect(() => { if (tab === 'assignments') fetchAssignments(); }, [tab, filterClass, filterTerm, filterSess]);

  async function handleSaveSubject() {
    if (!editSubject?.name) { showError('Subject name is required.'); return; }
    try {
      const res  = await fetch('/api/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSubject),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success(editSubject.id ? 'Subject updated!' : 'Subject added!');
      setShowSubjectForm(false);
      setEditSubject(null);
      fetchSubjects();
    } catch { showError('Network error.'); }
  }

  async function handleDeleteSubject(s: Subject) {
    try {
      const res  = await fetch(`/api/subjects?id=${s.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Delete failed.'); return; }
      success('Subject deleted.');
      fetchSubjects();
    } catch { showError('Network error.'); }
    setDeleteTarget(null);
  }

  async function handleAssign() {
    if (!assignForm.subject_id || !assignForm.class || !assignForm.term || !assignForm.session) {
      showError('Subject, class, term and session are required.');
      return;
    }
    try {
      const res  = await fetch('/api/subjects/assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to assign.'); return; }
      success('Subject assigned!');
      setShowAssignForm(false);
      fetchAssignments();
    } catch { showError('Network error.'); }
  }

  const filtered = subjects.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.code ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Subjects</h2>
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button onClick={() => setTab('subjects')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'subjects' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Subjects</button>
          <button onClick={() => setTab('assignments')} className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${tab === 'assignments' ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Assignments</button>
        </div>
        {tab === 'subjects' ? (
          <Button size="sm" onClick={() => { setEditSubject({}); setShowSubjectForm(true); }}><Plus size={15} /> Add Subject</Button>
        ) : (
          <Button size="sm" onClick={() => setShowAssignForm(true)}><Plus size={15} /> Assign Subject</Button>
        )}
      </div>

      {tab === 'subjects' && (
        <>
          <div className="relative mb-4">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 max-w-xs"
              placeholder="Search subjects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Spinner /></div>
          ) : !filtered.length ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-3">📚</p>
              <p className="font-medium">No subjects yet</p>
              <p className="text-sm mt-1">Add subjects to assign to classes</p>
            </div>
          ) : (
            <Table>
              <Thead>
                <tr>
                  <Th>Subject Name</Th>
                  <Th>Code</Th>
                  <Th>Department</Th>
                  <Th>Compulsory</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filtered.map(s => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.name}</Td>
                    <Td className="text-xs text-gray-500 font-mono">{s.code ?? '—'}</Td>
                    <Td>{s.department ?? '—'}</Td>
                    <Td>
                      <Badge variant={s.is_compulsory ? 'success' : 'default'}>{s.is_compulsory ? 'Yes' : 'No'}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => { setEditSubject(s); setShowSubjectForm(true); }} className="text-xs text-orange-500 hover:text-orange-700 font-medium">Edit</button>
                        <button onClick={() => setDeleteTarget(s)} className="text-xs text-red-500 hover:text-red-700 font-medium">Delete</button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {tab === 'assignments' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select options={CLASS_OPTIONS} value={filterClass} onChange={e => setFilterClass(e.target.value)} wrapperClass="w-36" />
            <Select options={TERM_OPTIONS}  value={filterTerm}  onChange={e => setFilterTerm(e.target.value)}  wrapperClass="w-32" />
            <select value={filterSess} onChange={e => setFilterSess(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-32">
              <option value="">All Sessions</option>
              {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
            </select>
          </div>
          {!assignments.length ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-600">
              <p className="text-4xl mb-3">🗂️</p>
              <p className="font-medium">No assignments yet</p>
            </div>
          ) : (
            <Table>
              <Thead><tr><Th>Subject</Th><Th>Class</Th><Th>Teacher</Th><Th>Term</Th><Th>Session</Th></tr></Thead>
              <Tbody>
                {assignments.map(a => (
                  <Tr key={a.id}>
                    <Td>{subjects.find(s => s.id === a.subject_id)?.name ?? `#${a.subject_id}`}</Td>
                    <Td>{a.class}</Td>
                    <Td>{teachers.find(t => t.id === a.teacher_id)?.name ?? '—'}</Td>
                    <Td>{a.term}</Td>
                    <Td>{a.session}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </>
      )}

      {/* Subject form modal */}
      <Modal open={showSubjectForm} onClose={() => { setShowSubjectForm(false); setEditSubject(null); }} title={editSubject?.id ? 'Edit Subject' : 'Add Subject'} size="sm">
        <div className="space-y-4">
          <Input label="Subject Name *" value={editSubject?.name ?? ''} onChange={e => setEditSubject(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mathematics" />
          <Input label="Code" value={editSubject?.code ?? ''} onChange={e => setEditSubject(f => ({ ...f, code: e.target.value }))} placeholder="e.g. MTH" />
          <Input label="Department" value={editSubject?.department ?? ''} onChange={e => setEditSubject(f => ({ ...f, department: e.target.value }))} placeholder="e.g. Sciences" />
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!editSubject?.is_compulsory} onChange={e => setEditSubject(f => ({ ...f, is_compulsory: e.target.checked }))} className="rounded" />
            <span className="text-sm text-gray-700 dark:text-gray-300">Compulsory subject</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => { setShowSubjectForm(false); setEditSubject(null); }} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveSubject} className="flex-1">Save Subject</Button>
          </div>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal open={showAssignForm} onClose={() => setShowAssignForm(false)} title="Assign Subject to Class" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Subject *</label>
            <select value={assignForm.subject_id} onChange={e => setAssignForm(f => ({ ...f, subject_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500">
              <option value="">— Select subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Select label="Class *" options={[{ value: '', label: '— Select class —' }, ...activeClasses.map(c => ({ value: c, label: c }))]} value={assignForm.class} onChange={e => setAssignForm(f => ({ ...f, class: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Teacher (optional)</label>
            <select value={assignForm.teacher_id} onChange={e => setAssignForm(f => ({ ...f, teacher_id: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500">
              <option value="">— None —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Select label="Term *" options={TERM_OPTIONS.filter(o => o.value)} value={assignForm.term} onChange={e => setAssignForm(f => ({ ...f, term: e.target.value }))} />
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Session *</label>
            <select value={assignForm.session} onChange={e => setAssignForm(f => ({ ...f, session: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500">
              <option value="">— Select session —</option>
              {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAssignForm(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAssign} className="flex-1">Assign</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Subject" size="sm">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Delete <strong>{deleteTarget?.name}</strong>? This will also remove all class assignments for this subject.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDeleteSubject(deleteTarget)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}