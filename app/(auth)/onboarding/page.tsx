'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

// ─── types ───────────────────────────────────────────────────────
type SchoolType = 'primary' | 'secondary' | 'both';

interface SuccessData {
  schoolId: string;
  schoolName: string;
  planLabel: string;
}

// ─── Step dots ───────────────────────────────────────────────────
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex gap-1 justify-center mt-3">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${i < current ? 'bg-orange-500 w-8' : 'bg-gray-200 dark:bg-gray-700 w-4'}`} />
      ))}
    </div>
  );
}

// ─── School Type Card ─────────────────────────────────────────────
function TypeCard({ icon, title, desc, selected, onClick }: {
  icon: string; title: string; desc: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected
          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className={`font-bold text-sm ${selected ? 'text-orange-700 dark:text-orange-400' : 'text-gray-800 dark:text-gray-200'}`}>{title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>
        </div>
        {selected && (
          <div className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Success Modal ────────────────────────────────────────────────
function SuccessModal({ data, onContinue }: { data: SuccessData; onContinue: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1">School Registered! 🎉</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {data.schoolName} has been successfully registered on STEAMhives RMS.
        </p>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-1">Your School ID</p>
          <p className="text-3xl font-black text-orange-600 dark:text-orange-400 tracking-wider font-mono">{data.schoolId}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Save this — you'll need it every time you log in.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1 mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{data.planLabel} Plan Active</span>
        </div>
        <Button className="w-full font-bold" onClick={onContinue}>Continue Setup →</Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const { error: showError } = useToast();
  const { refetch } = useAuth();

  const [step, setStep] = useState(1);       // 1=coupon 2=school-type 3=details 4=account
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  // Step 1
  const [coupon, setCoupon] = useState('');
  const [couponInfo, setCouponInfo] = useState<{ plan_label: string; student_limit: number | null } | null>(null);

  // Step 2
  const [schoolType, setSchoolType] = useState<SchoolType | null>(null);

  // Step 3 — details
  const [details, setDetails] = useState({
    name: '',
    namePrimary: '',
    nameSecondary: '',
    sameNameBoth: false,
    abbreviation: '',
    principalName: '',
    headTeacherName: '',
  });

  // Step 4 — account
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ── Step 1: Verify Coupon ──────────────────────────────────────
  async function verifyCoupon() {
    if (!coupon.trim()) { showError('Please enter a coupon code.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/schools/coupon?code=' + encodeURIComponent(coupon.trim().toUpperCase()));
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Invalid coupon.'); return; }
      setCouponInfo({ plan_label: data.coupon.plan_label, student_limit: data.coupon.student_limit });
      setStep(2);
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  // ── Step 3: Validate details ───────────────────────────────────
  function validateDetails() {
    if (schoolType === 'primary') {
      if (!details.name.trim()) { showError('School name is required.'); return false; }
      if (!details.headTeacherName.trim()) { showError("Head Teacher's name is required."); return false; }
    } else if (schoolType === 'secondary') {
      if (!details.name.trim()) { showError('School name is required.'); return false; }
      if (!details.principalName.trim()) { showError("Principal's name is required."); return false; }
    } else {
      if (!details.sameNameBoth) {
        if (!details.namePrimary.trim()) { showError('Primary school name is required.'); return false; }
        if (!details.nameSecondary.trim()) { showError('Secondary school name is required.'); return false; }
      } else {
        if (!details.name.trim()) { showError('School name is required.'); return false; }
      }
      if (!details.principalName.trim()) { showError("Principal's name is required."); return false; }
      if (!details.headTeacherName.trim()) { showError("Head Teacher's name is required."); return false; }
    }
    if (!details.abbreviation.trim()) { showError('Abbreviation is required.'); return false; }
    if (details.abbreviation.length !== 3) { showError('Abbreviation must be exactly 3 letters.'); return false; }
    return true;
  }

  // ── Step 4: Register ───────────────────────────────────────────
  async function register() {
    if (!password) { showError('Password is required.'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match.'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const primaryName   = schoolType === 'both' && !details.sameNameBoth ? details.namePrimary   : details.name;
      const secondaryName = schoolType === 'both' && !details.sameNameBoth ? details.nameSecondary : details.name;
      const mainName      = schoolType === 'primary' ? details.name : (schoolType === 'secondary' ? details.name : (details.sameNameBoth ? details.name : details.namePrimary));

      const res = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code:       coupon.trim().toUpperCase(),
          name:              mainName,
          abbreviation:      details.abbreviation.toUpperCase(),
          password,
          school_type:       schoolType,
          name_primary:      primaryName || null,
          name_secondary:    secondaryName || null,
          principal_name:    details.principalName || null,
          head_teacher_name: details.headTeacherName || null,
        }),
      });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Registration failed.'); return; }
      await refetch();
      setSuccessData({
        schoolId:   data.school_id,
        schoolName: mainName,
        planLabel:  couponInfo?.plan_label ?? 'Standard',
      });
      // Brief pause so the success modal is visible before redirect
      setTimeout(() => {}, 0);
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  const setD = (k: keyof typeof details) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDetails(d => ({ ...d, [k]: e.target.value }));

  return (
    <>
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .step-animate { animation: stepIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
      {successData && (
        <SuccessModal
          data={successData}
          onContinue={() => router.push('/setup')}
        />
      )}

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">S</div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Register Your School</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Step {step} of 4</p>
            <StepDots total={4} current={step} />
          </div>

          {/* Animated step wrapper */}
          <div key={step} className="step-animate">

          {/* ── STEP 1: Coupon ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Enter your coupon code to get started.</p>
              <Input
                label="Coupon Code"
                placeholder="e.g. AB3-9KM23P"
                value={coupon}
                onChange={e => setCoupon(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && verifyCoupon()}
              />
              <Button className="w-full" onClick={verifyCoupon} loading={loading}>Verify Coupon →</Button>
              <p className="text-center text-sm text-gray-500">
                Already registered?{' '}
                <Link href="/login" className="text-orange-500 hover:underline">Login →</Link>
              </p>
            </div>
          )}

          {/* ── STEP 2: School Type ── */}
          {step === 2 && (
            <div className="space-y-3">
              {couponInfo && (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-3 py-2 mb-4">
                  <span className="text-orange-500">🎫</span>
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                    {couponInfo.plan_label} —{' '}
                    {couponInfo.student_limit ? `Up to ${couponInfo.student_limit} students` : 'Unlimited students'}
                  </span>
                </div>
              )}
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">What type of school are you registering?</p>
              <TypeCard
                icon="📚" title="Primary School" desc="Only primary classes (Nursery, Primary 1–6)"
                selected={schoolType === 'primary'} onClick={() => setSchoolType('primary')}
              />
              <TypeCard
                icon="🏫" title="Secondary School" desc="JSS and SSS classes only"
                selected={schoolType === 'secondary'} onClick={() => setSchoolType('secondary')}
              />
              <TypeCard
                icon="🎓" title="Both Primary & Secondary" desc="Full K–12 school with all class levels"
                selected={schoolType === 'both'} onClick={() => setSchoolType('both')}
              />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button className="flex-1" onClick={() => { if (!schoolType) { showError('Please select a school type.'); return; } setStep(3); }}>
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 3: School Details ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {schoolType === 'primary' && '📚 Primary School Details'}
                {schoolType === 'secondary' && '🏫 Secondary School Details'}
                {schoolType === 'both' && '🎓 School Details'}
              </p>

              {/* Primary only */}
              {schoolType === 'primary' && (
                <>
                  <Input label="School Name *" placeholder="e.g. Sunshine Primary School" value={details.name} onChange={setD('name')} />
                  <Input label="School Abbreviation (3 letters) *" placeholder="e.g. SPS" maxLength={3}
                    value={details.abbreviation}
                    onChange={e => setDetails(d => ({ ...d, abbreviation: e.target.value.toUpperCase().slice(0, 3) }))} />
                  <Input label="Head Teacher's Name *" placeholder="e.g. Mrs. Jane Doe" value={details.headTeacherName} onChange={setD('headTeacherName')} />
                </>
              )}

              {/* Secondary only */}
              {schoolType === 'secondary' && (
                <>
                  <Input label="School Name *" placeholder="e.g. Sunshine Secondary School" value={details.name} onChange={setD('name')} />
                  <Input label="School Abbreviation (3 letters) *" placeholder="e.g. SSS" maxLength={3}
                    value={details.abbreviation}
                    onChange={e => setDetails(d => ({ ...d, abbreviation: e.target.value.toUpperCase().slice(0, 3) }))} />
                  <Input label="Principal's Name *" placeholder="e.g. Mr. John Smith" value={details.principalName} onChange={setD('principalName')} />
                </>
              )}

              {/* Both */}
              {schoolType === 'both' && (
                <>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={details.sameNameBoth}
                      onChange={e => setDetails(d => ({ ...d, sameNameBoth: e.target.checked }))}
                      className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                    Use the same name for both primary and secondary
                  </label>

                  {details.sameNameBoth ? (
                    <Input label="School Name *" placeholder="e.g. Sunshine Schools" value={details.name} onChange={setD('name')} />
                  ) : (
                    <>
                      <Input label="Primary School Name *" placeholder="e.g. Sunshine Primary School" value={details.namePrimary} onChange={setD('namePrimary')} />
                      <Input label="Secondary School Name *" placeholder="e.g. Sunshine Secondary School" value={details.nameSecondary} onChange={setD('nameSecondary')} />
                    </>
                  )}

                  <Input label="School Abbreviation (3 letters) *" placeholder="e.g. SHS" maxLength={3}
                    value={details.abbreviation}
                    onChange={e => setDetails(d => ({ ...d, abbreviation: e.target.value.toUpperCase().slice(0, 3) }))} />
                  <Input label="Principal's Name *" placeholder="e.g. Mr. John Smith" value={details.principalName} onChange={setD('principalName')} />
                  <Input label="Head Teacher's Name *" placeholder="e.g. Mrs. Jane Doe" value={details.headTeacherName} onChange={setD('headTeacherName')} />
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                <Button className="flex-1" onClick={() => { if (validateDetails()) setStep(4); }}>Continue →</Button>
              </div>
            </div>
          )}

          {/* ── STEP 4: Account / Password ── */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Set a secure password for your school admin account.</p>
              <Input label="Password *" type="password" placeholder="At least 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} />
              <Input label="Confirm Password *" type="password" placeholder="Repeat your password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && register()} />
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(3)} disabled={loading}>← Back</Button>
                <Button className="flex-1 font-bold" onClick={register} loading={loading}>Register School →</Button>
              </div>
            </div>
          )}

          </div>{/* end step-animate */}
        </div>
      </div>
    </>
  );
}