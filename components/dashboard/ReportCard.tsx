// ReportCard dashboard component
'use client';
// ReportCard — §4 full redesign
import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import type { Result } from '@/lib/types';

interface Props {
  result: Result;
  onBack: () => void;
}

function remarkToNum(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(val, 10);
  if (!isNaN(n) && n >= 1 && n <= 5) return n;
  const map: Record<string, number> = { excellent: 5, 'very good': 4, good: 3, fair: 2, poor: 1 };
  return map[val.toLowerCase()] ?? 0;
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

const AFFECTIVE_KEYS   = ['punctuality','neatness','cooperation','attentiveness','creativity','leadership'];
const PSYCHOMOTOR_KEYS = ['sports','clubs'];

export default function ReportCard({ result, onBack }: Props) {
  const { school } = useAuth();
  const printRef   = useRef<HTMLDivElement>(null);

  const [sessionInfo, setSessionInfo] = useState<{ days_opened?: number | null; next_term_begins?: string | null } | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<{ days_present: number; days_absent: number; days_late: number } | null>(null);

  const term   = result.term;
  const hasBf1 = term === '2nd Term' || term === '3rd Term';
  const hasBf2 = term === '3rd Term';

  const primaryColor   = school?.color1 ?? '#050d1a';
  const accentColor    = school?.color2 ?? '#fb923c';
  const schoolNameSize = school?.school_name_size ?? 24;

  const subjects        = result.subjects ?? [];
  const affective       = result.affective ?? {};
  const totalObtainable = subjects.length * 100;
  const totalObtained   = result.overall_total ?? subjects.reduce((a, s) => a + (Number(s.total) || 0), 0);
  const average         = result.avg ?? (subjects.length ? totalObtained / subjects.length : 0);

  useEffect(() => {
    // §4b: fetch session info
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        const cur = (d.sessions ?? []).find((s: { label: string }) => s.label === result.session)
                 ?? (d.sessions ?? []).find((s: { is_current: boolean }) => s.is_current);
        if (cur) setSessionInfo({ days_opened: cur.days_opened, next_term_begins: cur.next_term_begins });
      }
    });
    // §4b: fetch attendance summary for this student
    const p = new URLSearchParams({ class: result.class, term: result.term, session: result.session });
    fetch(`/api/attendance/summary?${p}`).then(r => r.json()).then(d => {
      if (d.success && d.summary?.[result.student_id]) setAttendanceSummary(d.summary[result.student_id]);
    }).catch(() => {});
  }, [result.session, result.class, result.term, result.student_id]);

  // §4a: print with 600ms delay so DOM finishes painting
  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Report Card — ${result.student_name}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 11px; background: white; color: #111; }
      @page { size: A4; margin: 12mm; }
      table { width: 100%; border-collapse: collapse; }
      table th, table td { border: 1px solid #ccc; padding: 3px 7px; }
      table th { font-weight: 600; }
      .grade-a { color: green; font-weight: bold; }
      .grade-b { color: blue;  font-weight: bold; }
      .grade-c { color: #b45309; font-weight: bold; }
      .grade-f { color: red;  font-weight: bold; }
    </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  }

  // §4f: 1-5 rating row component
  function RatingRow({ label, val }: { label: string; val: string | undefined }) {
    const num = remarkToNum(val);
    return (
      <tr>
        <td className="px-2 py-1 text-xs capitalize border-b border-gray-100 w-40">{label}</td>
        <td className="px-2 py-1 border-b border-gray-100">
          <div className="flex gap-1">
            {[1,2,3,4,5].map(n => (
              <div key={n}
                className={`w-5 h-5 flex items-center justify-center text-[9px] border rounded-sm font-bold ${n === num ? 'text-white' : 'bg-white text-gray-400 border-gray-300'}`}
                style={n === num ? { background: accentColor, borderColor: accentColor } : {}}>
                {n}
              </div>
            ))}
          </div>
        </td>
      </tr>
    );
  }

  const affectiveEntries   = AFFECTIVE_KEYS.filter(k => affective[k]);
  const psychomotorEntries = PSYCHOMOTOR_KEYS.filter(k => affective[k]);
  const hasAffective       = affectiveEntries.length > 0 || psychomotorEntries.length > 0;

  return (
    <div>
      {/* Toolbar (no-print) */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">
          Report Card — {result.student_name}
        </h2>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer size={15} /> Print
        </Button>
      </div>

      {/* ── Printable card ── */}
      <div ref={printRef} className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl mx-auto text-gray-900 text-sm">

        {/* §4c: Header */}
        <div className="flex items-start justify-between pb-4 mb-2 border-b-2" style={{ borderColor: accentColor }}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {school?.school_logo
              ? <img src={school.school_logo} alt="logo" className="w-[72px] h-[72px] object-contain flex-shrink-0" />
              : <div className="w-[72px] h-[72px] border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[10px] flex-shrink-0">LOGO</div>}
            <div className="min-w-0">
              <div className="font-extrabold leading-tight break-words" style={{ color: primaryColor, fontSize: schoolNameSize + 'px' }}>
                {school?.name ?? 'School Name'}
              </div>
              {school?.motto   && <div className="text-xs italic text-gray-500 mt-0.5">{school.motto}</div>}
              {school?.address && <div className="text-xs text-gray-500">{school.address}</div>}
              {school?.phone   && <div className="text-xs text-gray-500">Tel: {school.phone}</div>}
            </div>
          </div>
          <div className="flex-shrink-0 ml-3">
            {result.student_passport || result.passport_img
              ? <img src={(result.student_passport ?? result.passport_img)!} alt="passport" className="w-[80px] h-[100px] object-cover border-2 border-gray-300 rounded" />
              : <div className="w-[80px] h-[100px] border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-300 text-[10px] text-center">No Photo</div>}
          </div>
        </div>

        {/* §4c: Term title bar */}
        <div className="text-center my-3">
          <span className="border-2 rounded-xl px-6 py-1.5 font-bold text-sm tracking-wide"
                style={{ borderColor: accentColor, color: primaryColor }}>
            {result.term?.toUpperCase()} REPORT CARD
          </span>
        </div>

        {/* §4d: Biodata table */}
        <div className="mb-3">
          <table className="w-full text-xs border border-gray-200">
            <tbody>
              {[
                ['Name',         result.student_name],
                ['Admission No.', result.student_adm],
                ['Class',        result.class],
                ...(result.department ? [['Department', result.department]] : []),
                ['Session',      result.session],
                ['Term',         result.term],
              ].map(([label, value], i, arr) => (
                <tr key={label as string}>
                  <td className={`px-2 py-1.5 font-semibold bg-gray-50 w-32 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''}`}>{label}</td>
                  <td className={`px-2 py-1.5 ${i < arr.length - 1 ? 'border-b border-gray-100' : ''} ${label === 'Name' ? 'font-medium' : ''}`}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sessionInfo?.next_term_begins && (
            <div className="mt-1.5 text-xs text-gray-600">
              <span className="font-semibold">Next Term Begins:</span> {formatDate(sessionInfo.next_term_begins)}
            </div>
          )}
        </div>

        {/* §4e: Academic Performance table */}
        <div className="mb-3">
          <div className="text-center font-bold text-white px-3 py-1.5 mb-1 rounded text-xs"
               style={{ background: primaryColor }}>ACADEMIC PERFORMANCE</div>
          <div className="overflow-x-auto rounded border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: primaryColor }}>
                  <th className="px-3 py-2 text-left text-white">Subject</th>
                  <th className="px-2 py-2 text-center text-white w-12">CA</th>
                  <th className="px-2 py-2 text-center text-white w-14">Exam</th>
                  <th className="px-2 py-2 text-center text-white w-14">Total</th>
                  {hasBf1 && <th className="px-2 py-2 text-center text-white w-14">BF 1st</th>}
                  {hasBf2 && <th className="px-2 py-2 text-center text-white w-14">BF 2nd</th>}
                  <th className="px-2 py-2 text-center text-white w-14">Grade</th>
                  <th className="px-2 py-2 text-left text-white">Remark</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-1.5 font-medium border-b border-gray-100">{s.name}</td>
                    <td className="px-2 py-1.5 text-center border-b border-gray-100">{s.ca}</td>
                    <td className="px-2 py-1.5 text-center border-b border-gray-100">{s.exam}</td>
                    <td className="px-2 py-1.5 text-center font-semibold border-b border-gray-100">{s.total}</td>
                    {hasBf1 && <td className="px-2 py-1.5 text-center border-b border-gray-100">{s.bf1 ?? '—'}</td>}
                    {hasBf2 && <td className="px-2 py-1.5 text-center border-b border-gray-100">{s.bf2 ?? '—'}</td>}
                    <td className={`px-2 py-1.5 text-center font-bold border-b border-gray-100 ${
                      s.grade?.startsWith('A') ? 'text-green-600' : s.grade?.startsWith('B') ? 'text-blue-600'
                      : s.grade?.startsWith('F') ? 'text-red-600' : 'text-yellow-600'}`}>{s.grade}</td>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-gray-600">{s.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* §4e: Average circle */}
          <div className="flex justify-center my-4">
            <div className="w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center shadow-md"
                 style={{ borderColor: accentColor }}>
              <span className="text-2xl font-extrabold" style={{ color: primaryColor }}>
                {Number(average).toFixed(0)}%
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">Average</span>
            </div>
          </div>

          {/* §4e: Stats row */}
          <div className="flex flex-wrap justify-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-center">
              <div className="text-base font-bold text-orange-600">{totalObtainable}</div>
              <div className="text-xs text-gray-500">Obtainable</div>
            </div>
            <div className="text-center">
              <div className="text-base font-bold">{totalObtained}</div>
              <div className="text-xs text-gray-500">Obtained</div>
            </div>
            {result.position && school?.show_position !== false && (
              <div className="text-center">
                <div className="text-base font-bold text-green-600">{result.position}<sup>th</sup></div>
                <div className="text-xs text-gray-500">Position / {result.out_of}</div>
              </div>
            )}
            <div className="text-center">
              <div className={`text-base font-bold ${result.grade?.startsWith('A') ? 'text-green-600'
                : result.grade?.startsWith('F') ? 'text-red-600' : 'text-blue-600'}`}>{result.grade}</div>
              <div className="text-xs text-gray-500">Grade</div>
            </div>
          </div>
        </div>

        {/* §4f: Affective & Psychomotor */}
        {hasAffective && (
          <div className="mb-3">
            {affectiveEntries.length > 0 && (
              <>
                <div className="text-xs font-bold text-white px-3 py-1.5 mb-1 rounded"
                     style={{ background: primaryColor }}>AFFECTIVE DOMAIN</div>
                <table className="w-full text-xs mb-2 border border-gray-200">
                  <thead><tr className="bg-gray-50">
                    <th className="px-2 py-1 text-left font-semibold text-gray-600 border-b border-gray-200 w-40">Trait</th>
                    <th className="px-2 py-1 text-left font-semibold text-gray-600 border-b border-gray-200">Rating (1 = Low · 5 = Excellent)</th>
                  </tr></thead>
                  <tbody>{affectiveEntries.map(k => <RatingRow key={k} label={k} val={affective[k]} />)}</tbody>
                </table>
              </>
            )}
            {psychomotorEntries.length > 0 && (
              <>
                <div className="text-xs font-bold text-white px-3 py-1.5 mb-1 rounded"
                     style={{ background: primaryColor }}>PSYCHOMOTOR</div>
                <table className="w-full text-xs border border-gray-200">
                  <tbody>{psychomotorEntries.map(k => <RatingRow key={k} label={k} val={affective[k]} />)}</tbody>
                </table>
              </>
            )}
          </div>
        )}

        {/* §4g: Comments — Principal first, then Teacher */}
        {(result.principal_comment || result.teacher_comment) && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            {result.principal_comment && (
              <div className="border border-gray-200 rounded p-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Principal&apos;s Comment</div>
                <div className="text-xs text-gray-700 leading-relaxed">{result.principal_comment}</div>
              </div>
            )}
            {result.teacher_comment && (
              <div className="border border-gray-200 rounded p-2">
                <div className="text-xs font-semibold text-gray-600 mb-1">Class Teacher&apos;s Comment</div>
                <div className="text-xs text-gray-700 leading-relaxed">{result.teacher_comment}</div>
              </div>
            )}
          </div>
        )}

        {/* §4g: Signature row — principal | stamp | teacher */}
        <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="text-center flex-1">
            {school?.sig_principal
              ? <img src={school.sig_principal} className="h-10 object-contain mx-auto mb-1" alt="principal sig" />
              : <div className="h-10 border-b border-gray-400 mx-8 mb-1" />}
            <div className="text-xs font-semibold">{school?.principal_name ?? 'Principal'}</div>
            <div className="text-[10px] text-gray-500">Principal</div>
          </div>
          <div className="flex-1 flex justify-center">
            {school?.school_stamp
              ? <img src={school.school_stamp} className="h-14 object-contain" alt="stamp" />
              : <div className="w-14 h-14 border-2 border-dashed border-gray-300 rounded-full" />}
          </div>
          <div className="text-center flex-1">
            {result.teacher_signature
              ? <img src={result.teacher_signature} className="h-10 object-contain mx-auto mb-1" alt="teacher sig" />
              : <div className="h-10 border-b border-gray-400 mx-8 mb-1" />}
            <div className="text-xs font-semibold">{result.teacher_name ?? 'Class Teacher'}</div>
            <div className="text-[10px] text-gray-500">Class Teacher</div>
          </div>
        </div>

        {/* §4h: Attendance footer */}
        <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="font-bold text-base">{sessionInfo?.days_opened ?? '—'}</div>
            <div className="text-gray-500">Times School Opened</div>
          </div>
          <div>
            <div className="font-bold text-base text-green-600">{attendanceSummary?.days_present ?? '—'}</div>
            <div className="text-gray-500">Days Present</div>
          </div>
          <div>
            <div className="font-bold text-base text-red-500">{attendanceSummary?.days_absent ?? '—'}</div>
            <div className="text-gray-500">Days Absent</div>
          </div>
        </div>

        {/* §4i: Grade key */}
        <div className="mt-4 pt-3 border-t-2 border-gray-300 text-[10px] text-gray-500">
          <span className="font-bold">GRADE KEY: </span>
          A1(≥75) Excellent · B2(70-74) Very Good · B3(65-69) Good · C4(60-64) · C5(55-59) · C6(50-54) Credit · D7(45-49) · E8(40-44) Pass · F9(&lt;40) Fail
        </div>

      </div>
    </div>
  );
}