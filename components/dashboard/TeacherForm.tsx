'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Upload, Trash2, ChevronDown, Pencil, Check, X, Plus, ShieldCheck } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { ALL_CLASSES } from '@/lib/constants';
import type { Teacher } from '@/lib/types';

interface TeacherFormProps {
  teacher?: Teacher | null;
  onSaved: (data?: { employee_id?: string; generated_password?: string; id?: number; name?: string; teacher?: Teacher }) => void;
  onCancel: () => void;
  schoolAbbreviation?: string;
  activeClasses?: string[];
}

// ── Teacher permissions ──────────────────────────────────────────────────────
export const TEACHER_PERMISSIONS = [
  { key: 'register_students',  label: 'Register Students',     icon: '📋', desc: 'Can add new student records'           },
  { key: 'enter_results',      label: 'Enter Student Results', icon: '✏️',  desc: 'Can input scores and grades'           },
  { key: 'edit_students',      label: 'Edit Students',         icon: '🗑️',  desc: 'Can modify existing student records'   },
  { key: 'view_all_results',   label: 'View All Results',      icon: '📊', desc: 'Can view results beyond assigned class' },
  { key: 'print_report_cards', label: 'Print Report Cards',    icon: '🖨️',  desc: 'Can generate and print report cards'   },
  { key: 'take_attendance',    label: 'Take Attendance',       icon: '📅', desc: 'Can record student attendance'         },
  { key: 'access_broadsheet',  label: 'Access Broadsheet',     icon: '📈', desc: 'Can view the class broadsheet'         },
  { key: 'generate_pins',      label: 'Generate Result PINs',  icon: '🔑', desc: 'Can create result access PINs'         },
] as const;

interface PermissionTogglesProps {
  value: string[];
  onChange: (perms: string[]) => void;
}

function PermissionToggles({ value, onChange }: PermissionTogglesProps) {
  const active = new Set(value);

  function toggle(key: string) {
    const next = new Set(active);
    next.has(key) ? next.delete(key) : next.add(key);
    onChange([...next]);
  }

  function setAll(val: boolean) {
    onChange(val ? TEACHER_PERMISSIONS.map(p => p.key) : []);
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-orange-500" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Permissions</span>
          <span className="text-xs text-gray-400 font-normal">
            ({active.size}/{TEACHER_PERMISSIONS.length} enabled)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setAll(true)}
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-medium">All</button>
          <button type="button" onClick={() => setAll(false)}
            className="text-xs text-gray-500 hover:underline">None</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {TEACHER_PERMISSIONS.map(({ key, label, icon, desc }) => {
          const on = active.has(key);
          return (
            <button key={key} type="button" onClick={() => toggle(key)}
              className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg border-2 transition-all ${
                on
                  ? 'border-orange-300 dark:border-orange-700 bg-orange-50/60 dark:bg-orange-900/15'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
              }`}
            >
              <span className="text-base leading-none select-none w-5 text-center">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${on ? 'text-orange-700 dark:text-orange-300' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
              <div className={`relative w-8 h-4 rounded-full flex-shrink-0 transition-colors ${on ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Subject presets by class group ──────────────────────────────────────────
const SUBJECT_PRESETS: Record<string, string[]> = {
  default: ['Numeracy','Literacy','Phonics','Creative Arts','Social Habits','Physical Education','Music','Rhymes & Storytelling'],
  'Primary 1': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'Primary 2': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'Primary 3': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'Primary 4': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'Primary 5': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'Primary 6': ['English Language','Mathematics','Basic Science','Social Studies','Civic Education','Cultural & Creative Arts','Agricultural Science','Christian Religious Studies','Physical & Health Education','Yoruba'],
  'JSS 1': ['English Language','Mathematics','Basic Science & Technology','Social Studies','Civic Education','Agricultural Science','Business Studies','Home Economics','French','Computer Studies','Cultural & Creative Arts','CRS / IRS','Physical Education'],
  'JSS 2': ['English Language','Mathematics','Basic Science & Technology','Social Studies','Civic Education','Agricultural Science','Business Studies','Home Economics','French','Computer Studies','Cultural & Creative Arts','CRS / IRS','Physical Education'],
  'JSS 3': ['English Language','Mathematics','Basic Science & Technology','Social Studies','Civic Education','Agricultural Science','Business Studies','Home Economics','French','Computer Studies','Cultural & Creative Arts','CRS / IRS','Physical Education'],
  'SS 1': ['English Language','Mathematics','Physics','Chemistry','Biology','Agricultural Science','Economics','Government','Literature in English','Geography','Commerce','Accounting','Further Mathematics','Technical Drawing','CRS / IRS','Computer Studies','French'],
  'SS 2': ['English Language','Mathematics','Physics','Chemistry','Biology','Agricultural Science','Economics','Government','Literature in English','Geography','Commerce','Accounting','Further Mathematics','Technical Drawing','CRS / IRS','Computer Studies','French'],
  'SS 3': ['English Language','Mathematics','Physics','Chemistry','Biology','Agricultural Science','Economics','Government','Literature in English','Geography','Commerce','Accounting','Further Mathematics','Technical Drawing','CRS / IRS','Computer Studies','French'],
};

const PRESET_ALIASES: Record<string, string> = {
  'JSS1':'JSS 1','JSS2':'JSS 2','JSS3':'JSS 3',
  'SSS1':'SS 1','SSS2':'SS 2','SSS3':'SS 3','SS1':'SS 1','SS2':'SS 2','SS3':'SS 3',
  'SSS 1':'SS 1','SSS 2':'SS 2','SSS 3':'SS 3',
};

function getPreset(cls: string): string[] {
  const key = PRESET_ALIASES[cls] ?? cls;
  return [...(SUBJECT_PRESETS[key] ?? SUBJECT_PRESETS.default)];
}

// ── ClassSubjectPanel ────────────────────────────────────────────────────────
interface SubjectItem { name: string; editing: boolean; draft: string; }

function ClassSubjectPanel({ cls, initialSelected, initialList, onSave, onClose }: {
  cls: string; initialSelected: string[]; initialList?: string[];
  onSave: (cls: string, selected: string[], list: string[]) => void; onClose: () => void;
}) {
  const buildItems = (): SubjectItem[] =>
    (initialList ?? getPreset(cls)).map(name => ({ name, editing: false, draft: name }));

  const [items,       setItems]       = useState<SubjectItem[]>(buildItems);
  const [selected,    setSelected]    = useState<Set<string>>(new Set(initialSelected));
  const [customInput, setCustomInput] = useState('');

  function toggle(name: string) {
    setSelected(prev => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }
  function selectAll(val: boolean) { setSelected(val ? new Set(items.map(i => i.name)) : new Set()); }
  function startEdit(idx: number) { setItems(prev => prev.map((it, i) => i === idx ? { ...it, editing: true, draft: it.name } : it)); }
  function confirmEdit(idx: number) {
    const draft = items[idx].draft.trim(); if (!draft) return;
    const old = items[idx].name;
    setItems(prev => prev.map((it, i) => i === idx ? { name: draft, editing: false, draft } : it));
    setSelected(prev => { const next = new Set(prev); if (next.has(old)) { next.delete(old); next.add(draft); } return next; });
  }
  function cancelEdit(idx: number) { setItems(prev => prev.map((it, i) => i === idx ? { ...it, editing: false, draft: it.name } : it)); }
  function removeItem(idx: number) {
    const name = items[idx].name;
    setItems(prev => prev.filter((_, i) => i !== idx));
    setSelected(prev => { const next = new Set(prev); next.delete(name); return next; });
  }
  function addCustom() {
    const val = customInput.trim(); if (!val || items.some(i => i.name === val)) return;
    setItems(prev => [...prev, { name: val, editing: false, draft: val }]);
    setSelected(prev => new Set([...prev, val]));
    setCustomInput('');
  }
  function handleSave() { onSave(cls, [...selected], items.map(i => i.name)); onClose(); }

  return (
    <div className="border border-orange-200 dark:border-orange-800 bg-orange-50/40 dark:bg-orange-900/10 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{cls}</span>
          <span className="ml-2 text-xs text-gray-400">{selected.size} subject{selected.size !== 1 ? 's' : ''} selected</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => selectAll(true)}  className="text-xs text-orange-600 dark:text-orange-400 hover:underline">All</button>
          <button onClick={() => selectAll(false)} className="text-xs text-gray-500 hover:underline">None</button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"><X size={14} /></button>
        </div>
      </div>
      <div className="space-y-1 max-h-52 overflow-y-auto pr-1 mb-3">
        {items.map((item, idx) => (
          <div key={idx} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${
            selected.has(item.name) ? 'border-orange-300 dark:border-orange-700 bg-white dark:bg-gray-900' : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
          }`}>
            <button type="button" onClick={() => !item.editing && toggle(item.name)}
              className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                selected.has(item.name) ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-gray-600 hover:border-orange-400'
              }`}>
              {selected.has(item.name) && <Check size={9} className="text-white" strokeWidth={3} />}
            </button>
            {item.editing ? (
              <>
                <input autoFocus type="text" value={item.draft}
                  onChange={e => setItems(prev => prev.map((it, i) => i === idx ? { ...it, draft: e.target.value } : it))}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(idx); if (e.key === 'Escape') cancelEdit(idx); }}
                  className="flex-1 text-xs border border-orange-300 dark:border-orange-700 rounded px-2 py-0.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none"
                />
                <button onClick={() => confirmEdit(idx)} className="text-green-600 hover:text-green-700"><Check size={13} /></button>
                <button onClick={() => cancelEdit(idx)}  className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-xs cursor-pointer select-none ${selected.has(item.name) ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
                  onClick={() => toggle(item.name)}>{item.name}</span>
                <button onClick={() => startEdit(idx)} className="text-gray-300 hover:text-blue-500 transition-colors" title="Rename"><Pencil size={11} /></button>
                <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors" title="Remove"><X size={11} /></button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <input type="text" value={customInput} onChange={e => setCustomInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
          placeholder="Add a custom subject..."
          className="flex-1 text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button onClick={addCustom} disabled={!customInput.trim()}
          className="text-xs px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors flex items-center gap-1">
          <Plus size={11} /> Add
        </button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button size="sm" onClick={handleSave} className="flex-1">Save for {cls}</Button>
      </div>
    </div>
  );
}

// ── ImageUploadBox ───────────────────────────────────────────────────────────
function ImageUploadBox({ label, value, required, onChange, onClear }: {
  label: React.ReactNode; value: string | null; required?: boolean;
  onChange: (v: string) => void; onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { error: showError } = useToast();

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showError('Image must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative">
            <img src={value} alt="preview" className="w-20 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
            <button onClick={() => { onClear(); if (ref.current) ref.current.value = ''; }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600">
              <Trash2 size={10} />
            </button>
          </div>
        ) : (
          <div onClick={() => ref.current?.click()}
            className="w-20 h-24 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg flex flex-col items-center justify-center gap-1 text-orange-400 cursor-pointer hover:border-orange-500 transition-colors">
            <Upload size={18} />
            <span className="text-[10px] font-medium">Upload</span>
          </div>
        )}
        <div>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          {!value && (
            <Button size="sm" variant="outline" onClick={() => ref.current?.click()}>
              <Upload size={13} /> Choose
            </Button>
          )}
          <p className="text-xs text-gray-400 mt-1">PNG/JPG, max 2MB{required ? '. Required.' : '.'}</p>
        </div>
      </div>
    </div>
  );
}

// ── ClassAssignment ──────────────────────────────────────────────────────────
interface ClassAssignment { selected: string[]; list: string[]; }

// ── Main TeacherForm ─────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  { value: 'teaching',     label: 'Teaching'     },
  { value: 'non-teaching', label: 'Non-Teaching'  },
  { value: 'both',         label: 'Both'          },
];

export default function TeacherForm({ teacher, onSaved, onCancel, schoolAbbreviation, activeClasses }: TeacherFormProps) {
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(false);

  const [avatar,    setAvatar]    = useState<string | null>(teacher?.avatar    ?? null);
  const [signature, setSignature] = useState<string | null>(teacher?.signature ?? null);

  const [form, setForm] = useState({
    name:                '',
    email:               '',
    phone:               '',
    role:                'teaching' as Teacher['role'],
    gender:              '',
    qualification:       '',
    is_class_teacher:    false,
    class_teacher_class: '',
    new_password:        '',
  });

  const [permissions,      setPermissions]      = useState<string[]>([]);
  const [classAssignments, setClassAssignments] = useState<Record<string, ClassAssignment>>({});
  const [openPanel,        setOpenPanel]        = useState<string | null>(null);

  const abbr   = schoolAbbreviation ?? 'SCH';
  const allCls = activeClasses?.length ? activeClasses : ALL_CLASSES;

  const classTeacherOptions = [
    { value: '', label: 'Select class' },
    ...allCls.map(c => ({ value: c, label: c })),
  ];

  const classGroups = [
    { label: 'Pre-Basic / Nursery', classes: allCls.filter(c => ['Creche','Nursery','Kindergarten','KG'].some(k => c.startsWith(k))) },
    { label: 'Primary / Basic',     classes: allCls.filter(c => ['Primary','Grade','Basic'].some(k => c.startsWith(k))) },
    { label: 'Junior Secondary',    classes: allCls.filter(c => c.startsWith('JSS')) },
    { label: 'Senior Secondary',    classes: allCls.filter(c => c.startsWith('SS') || c.startsWith('SSS')) },
    { label: 'Other',               classes: allCls.filter(c =>
      !['Creche','Nursery','Kindergarten','KG','Primary','Grade','Basic','JSS','SS'].some(k => c.startsWith(k))
    )},
  ].filter(g => g.classes.length > 0);

  useEffect(() => {
    if (teacher) {
      setForm({
        name:                teacher.name             ?? '',
        email:               teacher.email            ?? '',
        phone:               teacher.phone            ?? '',
        role:                teacher.role             ?? 'teaching',
        gender:              teacher.gender           ?? '',
        qualification:       teacher.qualification    ?? '',
        is_class_teacher:    teacher.is_class_teacher ?? false,
        class_teacher_class: teacher.class            ?? '',
        new_password:        '',
      });
      setAvatar(teacher.avatar    ?? null);
      setSignature(teacher.signature ?? null);
      setPermissions(Array.isArray(teacher.admin_tasks) ? teacher.admin_tasks : []);
      try {
        const raw = teacher.subjects;
        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
          const restored: Record<string, ClassAssignment> = {};
          for (const [cls, subjs] of Object.entries(raw as Record<string, string[]>)) {
            restored[cls] = { selected: subjs, list: getPreset(cls) };
          }
          setClassAssignments(restored);
        }
      } catch { /* ignore */ }
    }
  }, [teacher]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function handlePanelSave(cls: string, selected: string[], list: string[]) {
    setClassAssignments(prev => ({ ...prev, [cls]: { selected, list } }));
  }
  function clearClassAssignment(cls: string) {
    setClassAssignments(prev => { const next = { ...prev }; delete next[cls]; return next; });
  }

  async function handleSubmit() {
    if (!form.name.trim()) { showError('Teacher name is required.'); return; }
    if (!avatar)            { showError('Passport photograph is required.'); return; }
    if (form.is_class_teacher && !form.class_teacher_class) { showError('Select which class this teacher is class teacher of.'); return; }
    if (form.is_class_teacher && !signature)                { showError('Signature is required for class teachers.'); return; }

    const subjectsMap: Record<string, string[]> = {};
    for (const [cls, asgn] of Object.entries(classAssignments)) {
      if (asgn.selected.length) subjectsMap[cls] = asgn.selected;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        id:          teacher?.id ?? undefined,  // include id so POST handler treats this as an update
        class:       form.class_teacher_class || null,
        classes:     Object.keys(subjectsMap),
        subjects:    subjectsMap,
        admin_tasks: permissions,
        avatar,
        signature,
      };
      // The /api/teachers route handles both create and update via POST.
      // Updates are distinguished by the presence of body.id.
      const url = '/api/teachers';
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data   = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }

      if (!teacher && data.generated_password) {
        // New teacher — pass credentials for success popup
        onSaved({ employee_id: data.employee_id, generated_password: data.generated_password, id: data.teacher?.id ?? data.id, name: form.name });
      } else {
        // Toast is fired by the parent (TeachersModule.handleSaved) to avoid duplicates
        // Pass back the saved teacher for in-place update
        onSaved({ teacher: data.teacher, id: data.teacher?.id });
      }
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-5">
      {/* Employee ID notice */}
      {!teacher ? (
        <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2">
          <span className="text-blue-500 text-sm">🔑</span>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Employee ID will be auto-generated as <strong>{abbr}/TCH01</strong>, <strong>{abbr}/TCH02</strong>, etc.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
          <span className="text-gray-500 text-sm">🪪</span>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Employee ID: <strong className="font-mono">{teacher.employee_id ?? 'Not set'}</strong>
          </p>
        </div>
      )}

      <Input label="Full Name *" placeholder="e.g. Mrs. Jane Doe" value={form.name} onChange={set('name')} />
      <ImageUploadBox label="Passport Photograph" required value={avatar} onChange={setAvatar} onClear={() => setAvatar(null)} />

      <div className="grid grid-cols-2 gap-3">
        <Input  label="Email"         type="email" placeholder="teacher@school.ng" value={form.email}         onChange={set('email')} />
        <Input  label="Phone"                      placeholder="e.g. 08012345678"  value={form.phone}         onChange={set('phone')} />
        <Select label="Role"          options={ROLE_OPTIONS}                        value={form.role}          onChange={set('role')} />
        <Select label="Gender"
          options={[{ value: '', label: 'Select' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]}
          value={form.gender} onChange={set('gender')} />
        <Input  label="Qualification" placeholder="e.g. B.Ed Mathematics"          value={form.qualification} onChange={set('qualification')} className="col-span-2" />
      </div>

      {/* ── Class Teacher ──────────────────────────────────────────── */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer mb-3">
          <input type="checkbox" checked={form.is_class_teacher}
            onChange={e => setForm(f => ({ ...f, is_class_teacher: e.target.checked, class_teacher_class: e.target.checked ? f.class_teacher_class : '' }))}
            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
          />
          <span className="font-medium">Class Teacher</span>
          <span className="text-xs text-gray-400 font-normal">(signature required)</span>
        </label>
        {form.is_class_teacher && (
          <div className="space-y-3 pl-1">
            <Select label="Assigned Class *" options={classTeacherOptions} value={form.class_teacher_class} onChange={set('class_teacher_class')} />
            <div className="border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10 rounded-lg p-3">
              <ImageUploadBox label="Teacher Signature" required value={signature} onChange={setSignature} onClear={() => setSignature(null)} />
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                ✍️ Signature will appear automatically on report cards for this teacher's classes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Permissions ────────────────────────────────────────────── */}
      <PermissionToggles value={permissions} onChange={setPermissions} />

      {/* ── Classes & Subjects Taken ───────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Classes & Subjects Taken</p>
        <p className="text-xs text-gray-400 mb-3">
          Click a class to select which subjects this teacher handles in it. Assignments are saved per class independently.
        </p>
        {classGroups.map(group => (
          <div key={group.label} className="mb-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.classes.map(cls => {
                const asgn = classAssignments[cls];
                const hasSubjs = !!asgn?.selected.length;
                const isOpen   = openPanel === cls;
                return (
                  <button key={cls} type="button" onClick={() => setOpenPanel(isOpen ? null : cls)}
                    className={`text-xs px-3 py-1.5 rounded-lg border-2 transition-all font-medium flex items-center gap-1.5 ${
                      isOpen
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : hasSubjs
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400'
                    }`}>
                    {hasSubjs && !isOpen && <Check size={10} />}
                    {cls}
                    {hasSubjs && !isOpen && <span className="text-[10px] opacity-70">({asgn.selected.length})</span>}
                    <ChevronDown size={11} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                );
              })}
            </div>
            {group.classes.some(c => openPanel === c) && openPanel && (
              <ClassSubjectPanel
                cls={openPanel}
                initialSelected={classAssignments[openPanel]?.selected ?? []}
                initialList={classAssignments[openPanel]?.list}
                onSave={handlePanelSave}
                onClose={() => setOpenPanel(null)}
              />
            )}
          </div>
        ))}

        {Object.keys(classAssignments).filter(c => classAssignments[c].selected.length).length > 0 && (
          <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
              Assignment summary
            </p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Object.entries(classAssignments).filter(([, a]) => a.selected.length).map(([cls, asgn]) => (
                <div key={cls} className="flex items-start gap-3 px-3 py-2">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 min-w-[72px] pt-0.5">{cls}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">{asgn.selected.join(', ')}</span>
                  <button type="button" onClick={() => clearClassAssignment(cls)}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5" title="Remove assignment">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {teacher && (
        <Input label="Reset Password (leave blank to keep current)" type="password" placeholder="New password"
          value={form.new_password} onChange={set('new_password')} />
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} className="flex-1">
          {teacher ? 'Update Teacher' : 'Add Teacher'}
        </Button>
      </div>
    </div>
  );
}