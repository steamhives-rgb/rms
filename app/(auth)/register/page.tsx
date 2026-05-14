'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check, Upload, Trash2, Eye, EyeOff } from 'lucide-react';

interface StepIndicatorProps { step: number; current: number; label: string; }
function StepIndicator({ step, current, label }: StepIndicatorProps) {
  const done = step < current;
  const active = step === current;
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
        done ? 'bg-green-500 border-green-500 text-white'
        : active ? 'border-sky-500 bg-sky-500 text-white'
        : 'border-gray-300 text-gray-400'
      }`}>
        {done ? <Check size={13} /> : step}
      </div>
      <span className={`text-sm font-medium ${active ? 'text-sky-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

export default function TeacherRegisterPage() {
  const [step, setStep] = useState(1);
  const [coupon, setCoupon] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [schoolMotto, setSchoolMotto] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', gender: '' });
  const [passport, setPassport] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ employee_id: string; message: string } | null>(null);
  const [error, setError] = useState('');

  async function verifyCoupon() {
    if (!coupon.trim()) { setCouponError('Please enter a coupon code.'); return; }
    setVerifying(true); setCouponError('');
    try {
      const res = await fetch(`/api/teachers/coupons?verify=${encodeURIComponent(coupon.trim())}`);
      const d = await res.json();
      if (!d.success) { setCouponError(d.error ?? 'Invalid coupon.'); return; }
      setSchoolName(d.school_name ?? 'Your School');
      setSchoolLogo(d.school_logo ?? null);
      setSchoolMotto(d.school_motto ?? null);
      setStep(2);
    } catch { setCouponError('Network error. Try again.'); }
    finally { setVerifying(false); }
  }

  function handlePassport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => setPassport(reader.result as string);
    reader.readAsDataURL(file);
  }

  function validateStep2() {
    if (!form.name.trim()) { setError('Full name is required.'); return false; }
    if (!form.email.trim()) { setError('Email is required.'); return false; }
    if (!passport) { setError('Passport photo is required.'); return false; }
    return true;
  }

  async function handleSubmit() {
    if (!password) { setError('Password is required.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch('/api/auth/teacher-register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: coupon.trim(), ...form, passport, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error ?? 'Registration failed.'); return; }
      setSuccessInfo({ employee_id: d.employee_id, message: d.message ?? '' });
    } catch { setError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  const inputCls = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition";

  if (successInfo) {
    return (
      <div className="w-full">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Account Created!</h1>
          <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-4 mb-4">
            <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-1">Your Employee ID</p>
            <p className="font-mono font-bold text-2xl text-sky-700">{successInfo.employee_id}</p>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Your account is pending approval by the school administrator. You'll be able to log in once approved.
          </p>
          <Link href="/teacher-login" className="inline-block w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white text-center hover:bg-sky-600 transition">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500 text-2xl text-white font-bold shadow-lg shadow-sky-100">
            T
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Teacher Account</h1>
          <p className="mt-1.5 text-sm text-gray-500">Register with your school's coupon code.</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator step={1} current={step} label="Coupon" />
          <div className="flex-1 h-px bg-gray-200 max-w-[40px]" />
          <StepIndicator step={2} current={step} label="Details" />
          <div className="flex-1 h-px bg-gray-200 max-w-[40px]" />
          <StepIndicator step={3} current={step} label="Password" />
        </div>

        {/* School identity banner — shown on steps 2 & 3 once coupon is verified */}
        {step > 1 && schoolName && (
          <div className="flex items-center gap-3 mb-6 p-3 bg-sky-50 border border-sky-200 rounded-xl">
            {schoolLogo ? (
              <img
                src={schoolLogo.startsWith('data:') ? schoolLogo : `data:image/png;base64,${schoolLogo}`}
                alt="School logo"
                className="w-10 h-10 rounded-lg object-cover border border-sky-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {schoolName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sky-500 uppercase tracking-wide leading-none mb-0.5">Registering to</p>
              <p className="font-bold text-gray-900 text-sm leading-tight truncate">{schoolName}</p>
              {schoolMotto && <p className="text-[11px] text-gray-400 truncate italic mt-0.5">{schoolMotto}</p>}
            </div>
            <span className="ml-auto text-green-500 shrink-0">✅</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        {/* Step 1 — Coupon */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Teacher Coupon Code</label>
              <input type="text" className={inputCls} placeholder="Enter your coupon code" value={coupon}
                onChange={e => { setCoupon(e.target.value.toUpperCase()); setCouponError(''); }}
                onKeyDown={e => e.key === 'Enter' && verifyCoupon()} />
              {couponError && <p className="mt-1 text-xs text-red-600">{couponError}</p>}
            </div>
            <button className="w-full rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-600 transition disabled:opacity-60"
              onClick={verifyCoupon} disabled={verifying}>
              {verifying ? 'Verifying…' : 'Verify Coupon'}
            </button>
          </div>
        )}

        {/* Step 2 — Personal Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Full Name *</label>
              <input type="text" className={inputCls} placeholder="Your full name" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Email *</label>
              <input type="email" className={inputCls} placeholder="your@email.com" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Phone</label>
              <input type="tel" className={inputCls} placeholder="+234..." value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Gender</label>
              <select className={inputCls} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Passport Photo *</label>
              {passport ? (
                <div className="flex items-center gap-3">
                  <img src={passport} alt="passport" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                  <button onClick={() => setPassport(null)} className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-sky-400 transition">
                  <Upload size={20} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-400">Click to upload photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePassport} />
                </label>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                onClick={() => setStep(1)}>Back</button>
              <button className="flex-1 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-600 transition"
                onClick={() => { setError(''); if (validateStep2()) setStep(3); }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Password */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} className={inputCls + ' pr-10'} placeholder="At least 6 characters"
                  value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Confirm Password *</label>
              <input type="password" className={inputCls} placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                onClick={() => setStep(2)}>Back</button>
              <button className="flex-1 rounded-xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-600 transition disabled:opacity-60"
                onClick={handleSubmit} disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/teacher-login" className="text-sm text-sky-500 hover:underline">Already have an account? Sign in →</Link>
        </div>
      </div>
    </div>
  );
}