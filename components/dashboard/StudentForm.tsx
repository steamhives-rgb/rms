'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Upload, Trash2, Plus, X } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { ALL_CLASSES } from '@/lib/constants';
import type { Student } from '@/lib/types';

interface StudentFormProps {
  student?: Student | null;
  onSaved: () => void;
  onCancel: () => void;
  schoolType?: 'primary' | 'secondary' | 'both';
  activeClasses?: string[];
}

const GENDERS      = [{ value: '', label: 'Select gender' }, { value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }];
const DEPT_OPTIONS = [
  { value: '',           label: 'Select department' },
  { value: 'Science',    label: 'Science'    },
  { value: 'Commercial', label: 'Commercial' },
  { value: 'Arts',       label: 'Arts'       },
];
const SSS_CLASSES = ['SS 1','SS 2','SS 3','SSS1','SSS2','SSS3','SSS 1','SSS 2','SSS 3'];

const PRESET_CLUBS = [
  'JETS Club',
  'Coding & Robotics',
  'Entrepreneur Club',
  'Drama Club',
  'Press Club',
];

function needsDepartment(cls: string, schoolType?: string) {
  return (schoolType === 'secondary' || schoolType === 'both') && SSS_CLASSES.includes(cls);
}

export default function StudentForm({ student, onSaved, onCancel, schoolType, activeClasses }: StudentFormProps) {
  const { success, error: showError } = useToast();
  const [loading,  setLoading]  = useState(false);
  const [passport, setPassport] = useState<string | null>(student?.passport ?? null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [selectedClubs,   setSelectedClubs]   = useState<string[]>([]);
  const [customClubs,     setCustomClubs]     = useState<string[]>([]);
  const [customClubInput, setCustomClubInput] = useState('');

  const [form, setForm] = useState({
    name: '', gender: '', class: '', dob: '', house: '', arm: '', department: '',
    guardian_name: '', guardian_phone: '', term: '', session: '',
  });

  // §2b: fetch active session and default term/session for new students
  useEffect(() => {
    if (!student) {
      fetch('/api/sessions').then(r => r.json()).then(d => {
        if (!d.success) return;
        const cur = (d.sessions ?? []).find((s: { is_current: boolean; label: string; current_term?: string }) => s.is_current);
        if (cur) {
          setForm(f => ({
            ...f,
            term:    f.term    || (cur.current_term ?? ''),
            session: f.session || (cur.label        ?? ''),
          }));
        }
      }).catch(() => {});
    }
  }, [student]);

  const classOptions = [
    { value: '', label: 'Select class' },
    ...(activeClasses?.length ? activeClasses : ALL_CLASSES).map(c => ({ value: c, label: c })),
  ];

  useEffect(() => {
    if (student) {
      setForm({
        name:          student.name       ?? '',
        gender:        student.gender     ?? '',
        class:         student.class      ?? '',
        dob:           student.dob        ?? '',
        house:         student.house      ?? '',
        arm:           student.arm        ?? '',
        department:    student.department ?? '',
        guardian_name: (student as Record<string, string>).guardian_name  ?? '',
        guardian_phone:(student as Record<string, string>).guardian_phone ?? '',
        term:          (student as Record<string, string>).term    ?? '',
        session:       (student as Record<string, string>).session ?? '',
      });
      setPassport(student.passport ?? null);
      try {
        const parsed: string[] = JSON.parse(student.clubs ?? '[]');
        setSelectedClubs(parsed.filter(c => PRESET_CLUBS.includes(c)));
        setCustomClubs(parsed.filter(c => !PRESET_CLUBS.includes(c)));
      } catch { /* ignore */ }
    }
  }, [student]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  function handlePassportUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showError('Passport photo must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPassport(reader.result as string);
    reader.readAsDataURL(file);
  }

  function toggleClub(label: string) {
    setSelectedClubs(prev => prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]);
  }

  function addCustomClub() {
    const val = customClubInput.trim();
    if (!val) return;
    if (selectedClubs.includes(val) || customClubs.includes(val)) { showError('Club already added.'); return; }
    setCustomClubs(prev => [...prev, val]);
    setCustomClubInput('');
  }

  async function handleSubmit() {
    if (!form.name.trim()) { showError('Full name is required.'); return; }
    if (!form.class)        { showError('Class is required.'); return; }
    if (!passport)          { showError('Passport photograph is required.'); return; }
    if (needsDepartment(form.class, schoolType) && !form.department) {
      showError('Department is required for SSS classes.'); return;
    }
    const allClubs = [...selectedClubs, ...customClubs];
    setLoading(true);
    try {
      // The /api/students route handles both create and update via POST.
      // Updates are distinguished by the presence of body.id.
      const url = '/api/students';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: student?.id ?? undefined, passport, clubs: JSON.stringify(allClubs) }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success(student ? 'Student updated!' : 'Student added!');
      onSaved();
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  const showDept = needsDepartment(form.class, schoolType);

  return (
    <div className="space-y-4">
      <Input label="Full Name *" placeholder="e.g. Amara Okafor" value={form.name} onChange={set('name')} />

      {/* Passport — required */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Passport Photograph <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-4">
          {passport ? (
            <div className="relative">
              <img src={passport} alt="Passport" className="w-20 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-700" />
              <button
                onClick={() => { setPassport(null); if (fileRef.current) fileRef.current.value = ''; }}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600"
              ><Trash2 size={10} /></button>
            </div>
          ) : (
            <div
              className="w-20 h-24 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg flex flex-col items-center justify-center gap-1 text-orange-400 cursor-pointer hover:border-orange-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} />
              <span className="text-[10px] font-medium">Upload</span>
            </div>
          )}
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePassportUpload} />
            {!passport && (
              <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload size={13} /> Choose Photo
              </Button>
            )}
            <p className="text-xs text-gray-400 mt-1">PNG/JPG, max 2MB. Required.</p>
          </div>
        </div>
      </div>

      {/* Biodata grid */}
      <div className="grid grid-cols-2 gap-3">
        <Select label="Gender"  options={GENDERS}      value={form.gender} onChange={set('gender')} />
        <Select label="Class *" options={classOptions} value={form.class}  onChange={set('class')} />
        <Input  label="Date of Birth"     type="date"              value={form.dob}   onChange={set('dob')} />
        <Input  label="House (optional)"  placeholder="e.g. Blue"  value={form.house} onChange={set('house')} />
        <Input  label="Arm (optional)"    placeholder="e.g. A"     value={form.arm}   onChange={set('arm')} />
      </div>

      {/* Department — SSS classes only */}
      {showDept && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <Select
            label={
              <span>
                Department <span className="text-red-500">*</span>{' '}
                <span className="text-xs font-normal text-blue-600 dark:text-blue-400">(required for {form.class})</span>
              </span>
            }
            options={DEPT_OPTIONS}
            value={form.department}
            onChange={set('department')}
          />
        </div>
      )}

      {/* Guardian */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Parent/Guardian Name"  placeholder="Full name"  value={form.guardian_name}  onChange={set('guardian_name')} />
        <Input label="Parent/Guardian Phone" placeholder="+234..."     value={form.guardian_phone} onChange={set('guardian_phone')} />
      </div>

      {/* Session & Term (auto-populated, read-only for display) */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Academic Session</label>
          <input
            value={form.session}
            readOnly
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Term</label>
          <input
            value={form.term}
            readOnly
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
          />
        </div>
      </div>

      {/* Clubs */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Club Memberships</p>
        <p className="text-xs text-gray-400 mb-2">Select all that apply</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {PRESET_CLUBS.map(label => {
            const active = selectedClubs.includes(label);
            return (
              <button
                key={label} type="button" onClick={() => toggleClub(label)}
                className={`text-xs px-3 py-2 rounded-lg border-2 transition-all font-medium text-left flex items-center gap-2 ${
                  active
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400'
                }`}
              >
                <span className={`w-3.5 h-3.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                  active ? 'border-orange-500 bg-orange-500' : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {active && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Custom clubs chips */}
        {customClubs.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {customClubs.map(name => (
              <span key={name} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 text-xs rounded-full font-medium">
                {name}
                <button type="button" onClick={() => setCustomClubs(prev => prev.filter(c => c !== name))} className="hover:text-red-500 transition-colors">
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom club */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customClubInput}
            onChange={e => setCustomClubInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomClub())}
            placeholder="Add another club..."
            className="flex-1 text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <Button size="sm" variant="outline" onClick={addCustomClub} disabled={!customClubInput.trim()}>
            <Plus size={13} /> Add
          </Button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
        <Button onClick={handleSubmit} loading={loading} className="flex-1">
          {student ? 'Update Student' : 'Add Student'}
        </Button>
      </div>
    </div>
  );
}