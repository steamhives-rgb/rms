// ClassesModule — school class management with subject presets and department tabs
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Plus, Check, X, ChevronLeft, BookOpen, Edit2, Save, XCircle, Users, BookMarked } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { useToast } from '@/components/providers/ToastProvider';

// ── Class definitions ─────────────────────────────────────────────
const CLASS_GROUPS = [
  { label: '🍼 Pre-Basic', classes: ['Creche', 'Nursery', 'Nursery 1', 'Nursery 2', 'Kindergarten', 'KG 1', 'KG 2'] },
  { label: '📚 Primary / Basic', classes: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'] },
  { label: '🏫 Junior Secondary', classes: ['JSS 1', 'JSS 2', 'JSS 3'] },
  { label: '🎓 Senior Secondary', classes: ['SS 1', 'SS 2', 'SS 3'] },
];

// ── Subject presets per class ─────────────────────────────────────
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
  'Grade 1': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Grade 2': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Grade 3': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Grade 4': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Grade 5': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Grade 6': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 1': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 2': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 3': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 4': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 5': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'Basic 6': ['English Language', 'Mathematics', 'Basic Science', 'Social Studies', 'Creative Arts', 'Physical & Health Education', 'Computer Studies'],
  'JSS 1': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Christian Religious Studies', 'Islamic Religious Studies', 'Agricultural Science', 'Home Economics', 'Computer Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'French Language', 'Business Studies'],
  'JSS 2': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Christian Religious Studies', 'Islamic Religious Studies', 'Agricultural Science', 'Home Economics', 'Computer Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'French Language', 'Business Studies'],
  'JSS 3': ['English Language', 'Mathematics', 'Basic Science', 'Basic Technology', 'Social Studies', 'Civic Education', 'Christian Religious Studies', 'Islamic Religious Studies', 'Agricultural Science', 'Home Economics', 'Computer Studies', 'Cultural & Creative Arts', 'Physical & Health Education', 'French Language', 'Business Studies'],
};

// SSS Department-specific subject presets
const SSS_COMPULSORY = ['English Language', 'Mathematics', 'Civic Education', 'Physical & Health Education', 'Computer Studies'];
const SSS_DEPT_PRESETS: Record<string, string[]> = {
  'Science':     [...SSS_COMPULSORY, 'Physics', 'Chemistry', 'Biology', 'Agricultural Science', 'Further Mathematics', 'Geography'],
  'Commercial':  [...SSS_COMPULSORY, 'Economics', 'Commerce', 'Accounting', 'Business Studies', 'Literature-in-English', 'Government'],
  'Arts':        [...SSS_COMPULSORY, 'Literature-in-English', 'Government', 'History', 'Christian Religious Studies', 'Islamic Religious Studies', 'French Language', 'Geography', 'Music'],
};
const SSS_CLASSES = ['SS 1', 'SS 2', 'SS 3', 'SSS1', 'SSS2', 'SSS3', 'SSS 1', 'SSS 2', 'SSS 3'];
const SSS_DEPTS   = ['Science', 'Commercial', 'Arts'] as const;

// Groups for "apply to related classes" feature
const RELATED_GROUPS: string[][] = [
  ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  ['Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6'],
  ['JSS 1', 'JSS 2', 'JSS 3'],
  ['SS 1', 'SS 2', 'SS 3'],
  ['SSS 1', 'SSS 2', 'SSS 3'],
  ['Nursery 1', 'Nursery 2'],
  ['KG 1', 'KG 2'],
];

function isSSS(name: string) { return SSS_CLASSES.includes(name); }

interface SchoolClass  { id: number; name: string; is_active: boolean; is_custom: boolean; }
interface ClassSubject { id: number; class_id: number; name: string; sort_order: number; department?: string | null; }
interface Teacher      { id: number; name: string; class: string | null; classes?: string[]; is_class_teacher?: boolean; }

// ── Editable subject tag ──────────────────────────────────────────
function SubjectTag({ subject, onEdit, onRemove }: { subject: ClassSubject; onEdit: (id: number, name: string) => void; onRemove: (id: number) => void; }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(subject.name);

  function save() {
    const t = val.trim();
    if (t && t !== subject.name) onEdit(subject.id, t);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-600 rounded-full pl-2 pr-1 py-0.5">
        <input autoFocus className="text-xs bg-transparent outline-none text-emerald-800 dark:text-emerald-200 w-28 font-medium" value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setVal(subject.name); setEditing(false); } }} />
        <button onClick={save} className="text-emerald-600 hover:text-emerald-800"><Save size={11} /></button>
        <button onClick={() => { setVal(subject.name); setEditing(false); }} className="text-gray-400 hover:text-gray-600"><XCircle size={11} /></button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-medium rounded-full px-2.5 py-1 group">
      {subject.name}
      {subject.department && <span className="ml-0.5 text-[9px] text-emerald-500 font-bold uppercase">{subject.department.slice(0,3)}</span>}
      <button onClick={() => setEditing(true)} className="opacity-0 group-hover:opacity-100 text-emerald-500 hover:text-emerald-700 transition-opacity ml-0.5"><Edit2 size={10} /></button>
      <button onClick={() => onRemove(subject.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"><X size={10} /></button>
    </span>
  );
}

// ── Subject Panel (with SSS department tabs) ──────────────────────
function SubjectPanel({ cls, allClasses, onBack }: { cls: SchoolClass; allClasses: SchoolClass[]; onBack: () => void; }) {
  const { success, error: showError } = useToast();
  const [savedSubjects, setSavedSubjects] = useState<ClassSubject[]>([]);
  const [selected,      setSelected]      = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [customSubject, setCustomSubject] = useState('');
  const [activeDept,    setActiveDept]    = useState<string>(SSS_DEPTS[0]);
  const [applyRelated,  setApplyRelated]  = useState(false);

  const isSSsClass = isSSS(cls.name);
  const presets    = isSSsClass ? (SSS_DEPT_PRESETS[activeDept] ?? []) : (SUBJECT_PRESETS[cls.name] ?? []);

  // Find related classes in the same group (for "apply to related" feature)
  const relatedClasses = allClasses.filter(c => {
    if (c.id === cls.id || !c.is_active) return false;
    for (const group of RELATED_GROUPS) {
      if (group.includes(cls.name) && group.includes(c.name)) return true;
    }
    return false;
  });

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/schools/classes/subjects?class_id=${cls.id}`);
      const data = await res.json();
      if (data.success) setSavedSubjects(data.subjects ?? []);
    } catch { showError('Could not load subjects.'); }
    finally { setLoading(false); }
  }, [cls.id]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  // For SSS, filter saved subjects by active department tab
  const displayedSaved = isSSsClass
    ? savedSubjects.filter(s => !s.department || s.department === activeDept)
    : savedSubjects;

  const savedNames    = new Set(displayedSaved.map(s => s.name));
  const allSavedNames = new Set(savedSubjects.map(s => s.name));

  function toggleSelect(name: string) {
    if (allSavedNames.has(name)) return;
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }

  const availablePresets = presets.filter(p => !allSavedNames.has(p));
  const allSelected = availablePresets.length > 0 && availablePresets.every(p => selected.includes(p));

  function toggleSelectAll() {
    if (allSelected) setSelected([]);
    else setSelected(availablePresets);
  }

  // Save selected subjects — optionally to related classes too
  async function saveSelected() {
    if (!selected.length) { showError('No subjects selected.'); return; }
    setSaving(true);
    try {
      const dept = isSSsClass ? activeDept : null;
      // 1. Save to this class
      const res = await fetch('/api/schools/classes/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: cls.id, subjects: selected, department: dept }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }

      // 2. If "apply to related" is checked, save to each related class too
      if (applyRelated && relatedClasses.length > 0) {
        await Promise.all(relatedClasses.map(rc =>
          fetch('/api/schools/classes/subjects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_id: rc.id, subjects: selected, department: dept }),
          })
        ));
        success(`${selected.length} subject(s) saved to ${cls.name} and ${relatedClasses.map(c => c.name).join(', ')}!`);
      } else {
        success(`${selected.length} subject(s) saved!`);
      }
      setSelected([]);
      fetchSaved();
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  async function addCustom() {
    const name = customSubject.trim();
    if (!name) return;
    if (allSavedNames.has(name)) { showError('Subject already added.'); return; }
    setSaving(true);
    try {
      const dept = isSSsClass ? activeDept : null;
      const res = await fetch('/api/schools/classes/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: cls.id, subjects: [name], department: dept }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }

      if (applyRelated && relatedClasses.length > 0) {
        await Promise.all(relatedClasses.map(rc =>
          fetch('/api/schools/classes/subjects', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_id: rc.id, subjects: [name], department: dept }),
          })
        ));
        success(`"${name}" added to ${cls.name} and ${relatedClasses.map(c => c.name).join(', ')}!`);
      } else {
        success('Subject added!');
      }
      setCustomSubject('');
      fetchSaved();
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  async function editSubject(id: number, newName: string) {
    try {
      const res  = await fetch(`/api/schools/classes/subjects?id=${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName }) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      setSavedSubjects(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
      success('Subject renamed.');
    } catch { showError('Network error.'); }
  }

  async function removeSubject(id: number) {
    try {
      const res  = await fetch(`/api/schools/classes/subjects?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      setSavedSubjects(prev => prev.filter(s => s.id !== id));
      success('Subject removed.');
    } catch { showError('Network error.'); }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 font-medium">
          <ChevronLeft size={16} /> Classes
        </button>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
          <BookOpen size={14} className="text-orange-500" />{cls.name} — Subjects
        </span>
      </div>

      {/* SSS Department Tabs */}
      {isSSsClass && (
        <div className="flex gap-1 mb-5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          {SSS_DEPTS.map(dept => (
            <button key={dept} onClick={() => { setActiveDept(dept); setSelected([]); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeDept === dept
                  ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {dept}
            </button>
          ))}
        </div>
      )}

      {/* Apply to related classes toggle */}
      {relatedClasses.length > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <input
            id="apply-related"
            type="checkbox"
            checked={applyRelated}
            onChange={e => setApplyRelated(e.target.checked)}
            className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
          />
          <label htmlFor="apply-related" className="text-sm text-blue-700 dark:text-blue-300 cursor-pointer select-none">
            Also apply to related classes:{' '}
            <span className="font-semibold">{relatedClasses.map(c => c.name).join(', ')}</span>
          </label>
        </div>
      )}

      {/* Preset panel */}
      {presets.length > 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {isSSsClass ? `${activeDept} Subjects` : 'Subject Presets'}
            </p>
            <div className="flex gap-3">
              <button onClick={toggleSelectAll} className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium">
                {allSelected ? 'Clear All' : 'Select All'}
              </button>
              {selected.length > 0 && !allSelected && (
                <button onClick={() => setSelected([])} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Deselect</button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {presets.map(name => {
              const isSaved    = allSavedNames.has(name);
              const isSelected = selected.includes(name);
              return (
                <button key={name} disabled={isSaved} onClick={() => toggleSelect(name)}
                  className={`text-xs px-3 py-1.5 rounded-lg border-2 transition-all font-medium select-none ${
                    isSaved ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 cursor-not-allowed'
                    : isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                  }`}>
                  {isSaved ? <><Check size={10} className="inline mr-1 text-emerald-500" />{name}</>
                   : isSelected ? <><Check size={10} className="inline mr-1" />{name}</>
                   : name}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
              <span className="text-xs text-gray-500">{selected.length} selected</span>
              <Button size="sm" onClick={saveSelected} loading={saving}><Check size={12} /> Save Selected</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 mb-5 text-center text-sm text-gray-400">
          No preset subjects for this class. Add subjects manually below.
        </div>
      )}

      {/* Custom subject */}
      <div className="flex gap-2 mb-6">
        <Input placeholder={`Add custom subject${isSSsClass ? ` (${activeDept})` : ''}`} value={customSubject}
          onChange={e => setCustomSubject(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustom()}
          className="flex-1" />
        <Button size="sm" variant="outline" onClick={addCustom} loading={saving} disabled={!customSubject.trim()}>
          <Plus size={14} /> Add
        </Button>
      </div>

      {/* Saved subjects — grouped by department for SSS */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
          {isSSsClass ? `${activeDept} Assigned Subjects` : 'Assigned Subjects'} {displayedSaved.length > 0 && `(${displayedSaved.length})`}
        </p>
        {loading ? (
          <div className="text-sm text-gray-400 py-4">Loading…</div>
        ) : displayedSaved.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
            No subjects assigned yet{isSSsClass ? ` for ${activeDept}` : ''}.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {displayedSaved.map(s => (
              <SubjectTag key={s.id} subject={s} onEdit={editSubject} onRemove={removeSubject} />
            ))}
          </div>
        )}

        {/* Show counts for other departments in SSS */}
        {isSSsClass && savedSubjects.length > displayedSaved.length && (
          <p className="text-xs text-gray-400 mt-3">
            +{savedSubjects.length - displayedSaved.length} subjects in other departments
          </p>
        )}
      </div>
    </div>
  );
}

// ── ClassCard — with assign subjects button and teachers list ────
function ClassCard({ cls, teachers, onToggle, onDelete, onAssignSubjects }: {
  cls: SchoolClass;
  teachers: Teacher[];
  onToggle: (c: SchoolClass) => void;
  onDelete: (c: SchoolClass) => void;
  onAssignSubjects: (c: SchoolClass) => void;
}) {
  const classTeachers = teachers.filter(t =>
    t.class === cls.name || (t.classes ?? []).includes(cls.name)
  );

  return (
    <div className={`border rounded-xl p-3 flex flex-col gap-2 transition-all ${
      cls.is_active
        ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-orange-200 dark:hover:border-orange-800 hover:shadow-sm'
        : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-60'
    }`}>
      {/* Class name */}
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold truncate ${cls.is_active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500'}`}>
          {cls.name}
        </span>
        {cls.is_custom && <Badge variant="info" className="text-[10px]">Custom</Badge>}
        {isSSS(cls.name) && <Badge variant="orange" className="text-[10px]">SSS</Badge>}
      </div>

      {/* Teachers */}
      {classTeachers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {classTeachers.slice(0, 2).map(t => (
            <span key={t.id} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${
              t.is_class_teacher
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            }`}>
              <Users size={8} /> {t.name.split(' ')[0]}
            </span>
          ))}
          {classTeachers.length > 2 && (
            <span className="text-[10px] text-gray-400">+{classTeachers.length - 2}</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <button onClick={() => onToggle(cls)} title={cls.is_active ? 'Deactivate' : 'Activate'}
          className={`flex-1 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors ${
            cls.is_active
              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
          }`}>
          {cls.is_active ? <><Check size={10} className="inline mr-0.5" />Active</> : 'Inactive'}
        </button>
        <button onClick={() => onDelete(cls)} title="Remove class"
          className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/30 flex items-center justify-center transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Assign Subjects button */}
      <button
        onClick={() => onAssignSubjects(cls)}
        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium px-2 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors border border-blue-100 dark:border-blue-800"
      >
        <BookMarked size={11} /> Assign Subjects
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export default function ClassesModule() {
  const { success, error: showError } = useToast();
  const [classes,     setClasses]     = useState<SchoolClass[]>([]);
  const [teachers,    setTeachers]    = useState<Teacher[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [showAdd,     setShowAdd]     = useState(false);
  const [showPicker,  setShowPicker]  = useState(false);
  const [customName,  setCustomName]  = useState('');
  const [selected,    setSelected]    = useState<string[]>([]);
  const [activeClass, setActiveClass] = useState<SchoolClass | null>(null);

  async function fetchClasses() {
    setLoading(true);
    try {
      const res  = await fetch('/api/schools/classes');
      const data = await res.json();
      if (data.success) setClasses(data.classes ?? []);
    } catch { showError('Could not load classes.'); }
    finally { setLoading(false); }
  }

  async function fetchTeachers() {
    try {
      const res  = await fetch('/api/teachers');
      const data = await res.json();
      if (data.success) setTeachers(data.teachers ?? []);
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchClasses(); fetchTeachers(); }, []);

  const activeNames = new Set(classes.map(c => c.name));

  function toggleSelect(name: string) {
    setSelected(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  }

  async function addSelectedClasses() {
    const toAdd = selected.filter(n => !activeNames.has(n));
    if (!toAdd.length) { showError('All selected classes are already added.'); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/schools/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classes: toAdd }) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      success(`${toAdd.length} class(es) added!`);
      setSelected([]); setShowPicker(false);
      fetchClasses();
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  async function addCustomClass() {
    if (!customName.trim()) { showError('Class name is required.'); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/schools/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classes: [customName.trim()], is_custom: true }) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      success('Custom class added!');
      setCustomName(''); setShowAdd(false);
      fetchClasses();
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  async function toggleActive(cls: SchoolClass) {
    try {
      const res  = await fetch(`/api/schools/classes?id=${cls.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !cls.is_active }) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, is_active: !c.is_active } : c));
    } catch { showError('Network error.'); }
  }

  async function deleteClass(cls: SchoolClass) {
    if (!confirm(`Remove "${cls.name}"? This may affect students assigned to this class.`)) return;
    try {
      const res  = await fetch(`/api/schools/classes?id=${cls.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed.'); return; }
      success(`"${cls.name}" removed.`);
      fetchClasses();
    } catch { showError('Network error.'); }
  }

  if (activeClass) return <SubjectPanel cls={activeClass} allClasses={classes} onBack={() => setActiveClass(null)} />;

  const activeClasses   = classes.filter(c =>  c.is_active);
  const inactiveClasses = classes.filter(c => !c.is_active);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Classes</h2>
        <Button size="sm" variant="outline" onClick={() => setShowAdd(true)}><Plus size={14} /> Custom Class</Button>
        <Button size="sm" onClick={() => setShowPicker(true)}><Plus size={14} /> Add Classes</Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : !classes.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">🏫</p>
          <p className="font-medium">No classes configured</p>
          <p className="text-sm mt-1">Add classes to get started with students, results and attendance</p>
          <Button size="sm" className="mt-4" onClick={() => setShowPicker(true)}><Plus size={14} /> Add Classes</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {activeClasses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Active Classes ({activeClasses.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {activeClasses.map(cls => (
                  <ClassCard key={cls.id} cls={cls} teachers={teachers}
                    onToggle={toggleActive} onDelete={deleteClass}
                    onAssignSubjects={c => setActiveClass(c)} />
                ))}
              </div>
            </div>
          )}
          {inactiveClasses.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Inactive ({inactiveClasses.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {inactiveClasses.map(cls => (
                  <ClassCard key={cls.id} cls={cls} teachers={teachers}
                    onToggle={toggleActive} onDelete={deleteClass}
                    onAssignSubjects={c => setActiveClass(c)} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Class Picker Modal */}
      <Modal open={showPicker} onClose={() => { setShowPicker(false); setSelected([]); }} title="Add Classes" size="md">
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          {CLASS_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.classes.map(name => {
                  const alreadyAdded = activeNames.has(name);
                  const isSelected   = selected.includes(name);
                  return (
                    <button key={name} disabled={alreadyAdded} onClick={() => toggleSelect(name)}
                      className={`text-sm px-3 py-1.5 rounded-lg border-2 transition-all font-medium ${
                        alreadyAdded ? 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : isSelected ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-900/10'
                      }`}>
                      {isSelected && !alreadyAdded && <Check size={12} className="inline mr-1" />}
                      {alreadyAdded && <span className="mr-1">✓</span>}
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
          <Button variant="outline" onClick={() => { setShowPicker(false); setSelected([]); }} className="flex-1">Cancel</Button>
          <Button onClick={addSelectedClasses} loading={saving} className="flex-1" disabled={!selected.length}>
            Add {selected.length > 0 ? `${selected.length} ` : ''}Class{selected.length !== 1 ? 'es' : ''}
          </Button>
        </div>
      </Modal>

      {/* Custom Class Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Custom Class" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Add a class not in the standard list (e.g. Reception, Year 1, Form 1).</p>
          <Input label="Class Name *" placeholder="e.g. Reception" value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomClass()} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1">Cancel</Button>
            <Button onClick={addCustomClass} loading={saving} className="flex-1">Add Class</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}