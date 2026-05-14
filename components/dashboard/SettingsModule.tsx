// SettingsModule — tab-based redesign
'use client';
import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Save, Upload, Trash2, Eye, EyeOff, Copy, Check, School } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import type { School as SchoolType } from '@/lib/types';

const SCHOOL_TYPE_OPTIONS = [
  { value: 'primary',   label: 'Primary School' },
  { value: 'secondary', label: 'Secondary School' },
  { value: 'both',      label: 'Both (Primary & Secondary)' },
];

type ImageField = 'school_logo' | 'school_stamp' | 'sig_principal' | 'head_signature';
type TabId = 'profile' | 'branding' | 'report' | 'account';

const TABS: { id: TabId; label: string }[] = [
  { id: 'profile',  label: 'School Profile'  },
  { id: 'branding', label: 'Branding'         },
  { id: 'report',   label: 'Report Card'      },
  { id: 'account',  label: 'Account & Security' },
];

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={onChange} className={`w-10 h-5 rounded-full transition-colors relative ${checked ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
    </label>
  );
}

function CopyField({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 select-all">
          {value}
        </code>
        <button onClick={copy} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-gray-400" />}
        </button>
      </div>
    </div>
  );
}

export default function SettingsModule() {
  const { success, error: showError } = useToast();
  const { school: authSchool } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [loading, setLoading]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [form, setForm] = useState<Partial<SchoolType>>({});

  // Password change
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showPw,  setShowPw]  = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const fileRefs = {
    school_logo:    useRef<HTMLInputElement>(null),
    school_stamp:   useRef<HTMLInputElement>(null),
    sig_principal:  useRef<HTMLInputElement>(null),
    head_signature: useRef<HTMLInputElement>(null),
  };

  useEffect(() => {
    setLoading(true);
    fetch('/api/schools/settings')
      .then(r => r.json())
      .then(d => { if (d.success) setForm(d.school ?? d.settings ?? {}); })
      .finally(() => setLoading(false));
  }, []);

  const set = (k: keyof SchoolType) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggle = (k: keyof SchoolType) => () =>
    setForm(f => ({ ...f, [k]: !f[k] }));

  function handleImageUpload(field: ImageField) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { showError('Image must be under 2MB.'); return; }
      const reader = new FileReader();
      reader.onload = () => setForm(f => ({ ...f, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    };
  }

  function clearImage(field: ImageField) {
    setForm(f => ({ ...f, [field]: null }));
    if (fileRefs[field].current) fileRefs[field].current!.value = '';
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res  = await fetch('/api/schools/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to save.'); return; }
      success('Settings saved!');
    } catch { showError('Network error.'); }
    finally { setSaving(false); }
  }

  async function handlePasswordChange() {
    if (!pwForm.current) { showError('Enter current password.'); return; }
    if (pwForm.next.length < 6) { showError('New password must be at least 6 characters.'); return; }
    if (pwForm.next !== pwForm.confirm) { showError('Passwords do not match.'); return; }
    setPwSaving(true);
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Failed to change password.'); return; }
      success('Password changed!');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch { showError('Network error.'); }
    finally { setPwSaving(false); }
  }

  function ImageUploadBox({ field, label, large }: { field: ImageField; label: string; large?: boolean }) {
    const preview = form[field] as string | null;
    const size    = large ? 'h-24 w-24' : 'h-16 max-w-[100px]';
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">{label}</label>
        <div className={`relative inline-block ${large ? '' : ''}`}>
          {preview ? (
            <div className="relative">
              <img src={preview} alt={label} className={`${size} object-contain border border-gray-200 dark:border-gray-700 rounded-xl bg-white p-2`} />
              <button onClick={() => clearImage(field)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 shadow">
                <Trash2 size={10} />
              </button>
            </div>
          ) : (
            <div className={`${large ? 'h-24 w-24' : 'h-16 w-20'} border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-1`}>
              <Upload size={16} />
              <span className="text-[10px]">Upload</span>
            </div>
          )}
        </div>
        <div>
          <input ref={fileRefs[field]} type="file" accept="image/*" className="hidden" onChange={handleImageUpload(field)} />
          <Button size="sm" variant="outline" onClick={() => fileRefs[field].current?.click()}>
            <Upload size={12} /> {preview ? 'Replace' : 'Upload'}
          </Button>
        </div>
        <p className="text-[10px] text-gray-400">PNG/JPG, max 2MB</p>
      </div>
    );
  }

  if (loading) return <div className="text-center py-16 text-gray-400">Loading settings…</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Settings</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-8 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-max px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: School Profile ── */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Two-column: form left, images right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* LEFT — text fields */}
            <div className="space-y-3">
              <Input label="School Name" value={form.name ?? ''} onChange={set('name')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Abbreviation" value={form.abbreviation ?? ''} onChange={set('abbreviation')} maxLength={3} />
                <Select label="School Type" options={SCHOOL_TYPE_OPTIONS} value={form.school_type ?? 'secondary'} onChange={set('school_type')} />
              </div>
              <Input label="Motto" value={form.motto ?? ''} onChange={set('motto')} />
              <Input label="Address" value={form.address ?? ''} onChange={set('address')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" type="tel" value={form.phone ?? ''} onChange={set('phone')} />
                <Input label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Principal" value={form.principal_name ?? ''} onChange={set('principal_name')} />
                <Input label="Head Teacher" value={form.head_teacher_name ?? ''} onChange={set('head_teacher_name')} />
              </div>

              {/* Name variants — compact */}
              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Name Variants</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input label="Primary Name" value={form.name_primary ?? ''} onChange={set('name_primary')} />
                  <Input label="Primary Abbr." value={form.abbr_primary ?? ''} onChange={set('abbr_primary')} />
                  <Input label="Secondary Name" value={form.name_secondary ?? ''} onChange={set('name_secondary')} />
                  <Input label="Secondary Abbr." value={form.abbr_secondary ?? ''} onChange={set('abbr_secondary')} />
                </div>
              </div>
            </div>

            {/* RIGHT — image uploads in 2×2 grid */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">School Images</p>
              <div className="grid grid-cols-2 gap-4">
                <ImageUploadBox field="school_logo"    label="School Logo"            large />
                <ImageUploadBox field="school_stamp"   label="School Stamp"           large />
                <ImageUploadBox field="sig_principal"  label="Principal Signature"    />
                <ImageUploadBox field="head_signature" label="Head Teacher Signature" />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} className="w-full sm:w-auto">
            <Save size={14} /> Save School Profile
          </Button>
        </div>
      )}

      {/* ── Tab: Branding ── */}
      {activeTab === 'branding' && (
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Primary Colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color1 ?? '#050d1a'} onChange={set('color1')}
                  className="w-12 h-12 rounded-xl border border-gray-300 cursor-pointer p-1" />
                <div>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{form.color1 ?? '#050d1a'}</p>
                  <p className="text-xs text-gray-400">Report card header</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Accent Colour</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.color2 ?? '#fb923c'} onChange={set('color2')}
                  className="w-12 h-12 rounded-xl border border-gray-300 cursor-pointer p-1" />
                <div>
                  <p className="text-sm font-mono text-gray-900 dark:text-gray-100">{form.color2 ?? '#fb923c'}</p>
                  <p className="text-xs text-gray-400">Highlights & accents</p>
                </div>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview — Report Card Header</p>
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 flex items-center gap-4" style={{ backgroundColor: form.color1 ?? '#050d1a' }}>
                {form.school_logo ? (
                  <img src={form.school_logo} alt="logo" className="w-14 h-14 rounded-lg object-contain bg-white p-1" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
                    <School size={24} className="text-white/60" />
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-lg leading-tight">{form.name ?? 'School Name'}</p>
                  {form.motto && <p className="text-white/70 text-xs mt-0.5 italic">{form.motto}</p>}
                  <div className="mt-1 h-0.5 w-16 rounded" style={{ backgroundColor: form.color2 ?? '#fb923c' }} />
                </div>
              </div>
              <div className="px-6 py-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 dark:text-gray-400">
                Student Report Card — Term · Session
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleSave} loading={saving} className="w-full max-w-xs">
              <Save size={14} /> Save Branding
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Report Card Options ── */}
      {activeTab === 'report' && (
        <div className="space-y-4 max-w-md mx-auto">
          <Toggle checked={!!form.show_position} onChange={toggle('show_position')} label="Show class position on report cards" />
          <Toggle checked={!!form.show_bf}       onChange={toggle('show_bf')}       label="Show BF (Brought Forward) column" />
          <Input
            label="School Name Size on Report Card (px)"
            type="number"
            placeholder="e.g. 24"
            value={String(form.school_name_size ?? 24)}
            onChange={set('school_name_size')}
          />
          <div className="flex justify-center pt-4">
            <Button onClick={handleSave} loading={saving} className="w-full max-w-xs">
              <Save size={14} /> Save Report Options
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Account & Security ── */}
      {activeTab === 'account' && (
        <div className="space-y-6 max-w-md mx-auto">
          {authSchool?.id && <CopyField value={authSchool.id} label="School ID (read-only)" />}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Change Password</p>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  label="Current Password"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.current}
                  onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                />
                <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-8 text-gray-400 hover:text-gray-600">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input label="New Password" type={showPw ? 'text' : 'password'} value={pwForm.next}    onChange={e => setPwForm(f => ({ ...f, next:    e.target.value }))} />
              <Input label="Confirm New Password" type={showPw ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
              <Button onClick={handlePasswordChange} loading={pwSaving} className="w-full">
                Change Password
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}