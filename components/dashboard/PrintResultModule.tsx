// PrintResultsModule — Admin: query results by name/term/class/type and print
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Printer, Eye, FileText, CheckSquare, Square, Download } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS } from '@/lib/constants';
import ReportCard from './ReportCard';
import type { Result, AcademicSession } from '@/lib/types';

interface SchoolClass { id: number; name: string; is_active: boolean; }

const TERM_OPTIONS = [{ value: '', label: 'All Terms' }, ...TERMS.map(t => ({ value: t, label: t }))];
const TYPE_OPTIONS = [
  { value: '',         label: 'All Types'  },
  { value: 'full',     label: 'Full Term'  },
  { value: 'midterm',  label: 'Mid-Term'   },
];

export default function PrintResultsModule() {
  const { error: showError } = useToast();

  // Filters
  const [search,      setSearch]      = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm,  setFilterTerm]  = useState('');
  const [filterSess,  setFilterSess]  = useState('');
  const [filterType,  setFilterType]  = useState('');

  // Data
  const [results,       setResults]       = useState<Result[]>([]);
  const [sessions,      setSessions]      = useState<AcademicSession[]>([]);
  const [activeClasses, setActiveClasses] = useState<SchoolClass[]>([]);
  const [loading,       setLoading]       = useState(false);

  // Print / preview state
  const [checkedIds,    setCheckedIds]    = useState<Set<number>>(new Set());
  const [previewResult, setPreviewResult] = useState<Result | null>(null);
  const [exportingPdf,  setExportingPdf]  = useState(false);

  const printContainerRef = useRef<HTMLDivElement>(null);

  // ── Bootstrap: classes + sessions ──────────────────────────────
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveClasses(d.classes ?? []); })
      .catch(() => {});

    fetch('/api/sessions')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setSessions(d.sessions ?? []);
          const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
          if (cur) {
            setFilterSess(cur.label);
            setFilterTerm(cur.current_term ?? '');
          }
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch results ───────────────────────────────────────────────
  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterClass) p.set('class',       filterClass);
      if (filterTerm)  p.set('term',        filterTerm);
      if (filterSess)  p.set('session',     filterSess);
      if (filterType)  p.set('result_type', filterType);
      const res  = await fetch(`/api/results?${p}`);
      const data = await res.json();
      if (data.success) setResults(data.results ?? []);
    } catch { showError('Failed to load results.'); }
    finally  { setLoading(false); }
  }, [filterClass, filterTerm, filterSess, filterType]);

  useEffect(() => { fetchResults(); }, [fetchResults]);

  // ── Client-side search filter ───────────────────────────────────
  const filtered = results.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q) ||
      (r.student_adm ?? '').toLowerCase().includes(q) ||
      (r.class ?? '').toLowerCase().includes(q)
    );
  });

  // ── Checkbox helpers ────────────────────────────────────────────
  const allChecked  = filtered.length > 0 && filtered.every(r => checkedIds.has(r.id));
  const someChecked = filtered.some(r => checkedIds.has(r.id));

  function toggleAll() {
    if (allChecked) {
      setCheckedIds(prev => { const n = new Set(prev); filtered.forEach(r => n.delete(r.id)); return n; });
    } else {
      setCheckedIds(prev => { const n = new Set(prev); filtered.forEach(r => n.add(r.id)); return n; });
    }
  }
  function toggleOne(id: number) {
    setCheckedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ── HTML generator ──────────────────────────────────────────────
  function buildHTML(items: Result[]): string {
    const pages = items.map((r, i) => {
      const subjects  = r.subjects ?? [];
      const total     = r.overall_total ?? subjects.reduce((a, s) => a + (Number(s.total) || 0), 0);
      const avg       = r.avg ?? (subjects.length ? total / subjects.length : 0);
      const rows      = subjects.map(s => `
        <tr>
          <td>${s.name ?? ''}</td>
          <td>${s.ca1 ?? ''}</td><td>${s.ca2 ?? ''}</td><td>${s.exam ?? ''}</td>
          <td><strong>${s.total ?? ''}</strong></td>
          <td>${s.grade ?? ''}</td><td>${s.remark ?? ''}</td>
        </tr>`).join('');
      return `
        <div class="page${i > 0 ? ' break' : ''}">
          <div class="header">
            <div class="school-name">${r.school_name ?? 'School Report Card'}</div>
            <div style="font-size:10px;color:#555;margin-top:2px">Student Report Card</div>
          </div>
          <table class="info" style="margin:8px 0 10px;width:100%">
            <tr>
              <td><b>Name:</b> ${r.student_name}</td>
              <td><b>Adm No:</b> ${r.student_adm ?? '—'}</td>
              <td><b>Class:</b> ${r.class ?? '—'}</td>
            </tr>
            <tr>
              <td><b>Term:</b> ${r.term}</td>
              <td><b>Session:</b> ${r.session}</td>
              <td><b>Type:</b> ${r.result_type === 'midterm' ? 'Mid-Term' : 'Full Term'}</td>
            </tr>
          </table>
          <table class="rt">
            <thead><tr><th>Subject</th><th>CA1</th><th>CA2</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="stats" style="margin-top:10px">
            <span class="sb"><span class="sv">${total}</span><br><span class="sl">Total Marks</span></span>
            <span class="sb"><span class="sv">${avg.toFixed(1)}</span><br><span class="sl">Average</span></span>
            <span class="sb"><span class="sv">${r.position ?? '—'}</span><br><span class="sl">Position</span></span>
            <span class="sb"><span class="sv">${subjects.length}</span><br><span class="sl">Subjects</span></span>
          </div>
          ${r.teacher_comment ? `<p style="margin-top:10px;font-size:10.5px"><b>Class Teacher's Comment:</b> ${r.teacher_comment}</p>` : ''}
          ${r.principal_comment ? `<p style="margin-top:4px;font-size:10.5px"><b>Principal's Comment:</b> ${r.principal_comment}</p>` : ''}
        </div>`;
    }).join('');

    return `<!DOCTYPE html><html><head>
      <title>Results — ${items.length} Student${items.length !== 1 ? 's' : ''}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:Arial,sans-serif;font-size:11px;background:#fff;color:#111}
        @page{size:A4;margin:14mm}
        @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
        .page{max-width:720px;margin:0 auto;padding:14px 0}
        .break{page-break-before:always}
        .header{text-align:center;padding:10px 0 8px;border-bottom:2px solid #f97316;margin-bottom:8px}
        .school-name{font-size:17px;font-weight:700;color:#050d1a}
        .info td{padding:2px 8px;font-size:10.5px}
        .rt{width:100%;border-collapse:collapse;margin-top:6px}
        .rt th,.rt td{border:1px solid #ccc;padding:3px 7px}
        .rt th{background:#050d1a;color:#fff;font-size:10px}
        .rt tr:nth-child(even){background:#f9f9f9}
        .stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .sb{border:1px solid #ccc;padding:5px 14px;text-align:center}
        .sv{font-weight:700;font-size:14px;display:block}
        .sl{font-size:9px;color:#666}
      </style>
    </head><body>${pages}</body></html>`;
  }

  // ── Print single ────────────────────────────────────────────────
  function printSingle(r: Result) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildHTML([r]));
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ── Print selected ──────────────────────────────────────────────
  function printSelected() {
    const sel = filtered.filter(r => checkedIds.has(r.id));
    if (!sel.length) { showError('No results selected.'); return; }
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(buildHTML(sel));
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  // ── Export PDF (browser Save as PDF dialog) ─────────────────────
  function exportSelectedPdf() {
    const sel = filtered.filter(r => checkedIds.has(r.id));
    if (!sel.length) { showError('No results selected.'); return; }
    setExportingPdf(true);
    const win = window.open('', '_blank');
    if (!win) { showError('Pop-up blocked — please allow pop-ups and try again.'); setExportingPdf(false); return; }
    win.document.write(buildHTML(sel));
    win.document.close();
    setTimeout(() => { win.print(); setExportingPdf(false); }, 600);
  }

  // ── Options ─────────────────────────────────────────────────────
  const classOptions   = [{ value: '', label: 'All Classes' },   ...activeClasses.map(c => ({ value: c.name, label: c.name }))];
  const sessionOptions = [{ value: '', label: 'All Sessions' }, ...sessions.map(s => ({ value: s.label, label: s.label }))];
  const selectedCount  = filtered.filter(r => checkedIds.has(r.id)).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex-1">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Print Results</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Search, filter and print student report cards</p>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-orange-600 dark:text-orange-400">{selectedCount} selected</span>
            <Button size="sm" variant="outline" onClick={printSelected}>
              <Printer size={13} /> Print
            </Button>
            <Button size="sm" onClick={exportSelectedPdf} disabled={exportingPdf}>
              {exportingPdf ? <Spinner size="sm" /> : <Download size={13} />}
              {exportingPdf ? 'Preparing…' : 'Save PDF'}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        <div className="col-span-2 sm:col-span-3 lg:col-span-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            placeholder="Search name, adm no, class…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select options={classOptions}   value={filterClass} onChange={e => setFilterClass(e.target.value)} />
        <Select options={TERM_OPTIONS}   value={filterTerm}  onChange={e => setFilterTerm(e.target.value)} />
        <select
          value={filterSess} onChange={e => setFilterSess(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
        >
          {sessionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Select options={TYPE_OPTIONS}   value={filterType}  onChange={e => setFilterType(e.target.value)} />
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner /></div>
      ) : !filtered.length ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-600">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No results found</p>
          <p className="text-sm mt-1">Adjust the filters above</p>
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th className="w-10">
                <button onClick={toggleAll} className="flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors">
                  {allChecked
                    ? <CheckSquare size={16} className="text-orange-500" />
                    : someChecked
                    ? <CheckSquare size={16} className="text-orange-300" />
                    : <Square size={16} />}
                </button>
              </Th>
              <Th>Student Name</Th>
              <Th>Adm No</Th>
              <Th>Class</Th>
              <Th>Term</Th>
              <Th>Session</Th>
              <Th>Type</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </Thead>
          <Tbody>
            {filtered.map(r => {
              const checked = checkedIds.has(r.id);
              return (
                <Tr key={r.id} className={checked ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                  <Td>
                    <button onClick={() => toggleOne(r.id)} className="flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors">
                      {checked ? <CheckSquare size={16} className="text-orange-500" /> : <Square size={16} />}
                    </button>
                  </Td>
                  <Td className="font-medium">{r.student_name}</Td>
                  <Td className="text-xs text-gray-500 font-mono">{r.student_adm ?? '—'}</Td>
                  <Td>{r.class ?? '—'}</Td>
                  <Td>{r.term}</Td>
                  <Td>{r.session}</Td>
                  <Td>
                    <Badge variant={r.result_type === 'midterm' ? 'warning' : 'success'}>
                      {r.result_type === 'midterm' ? 'Mid-Term' : 'Full Term'}
                    </Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setPreviewResult(r)}
                        className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button
                        onClick={() => printSingle(r)}
                        className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 font-medium"
                      >
                        <Printer size={13} /> Print
                      </button>
                    </div>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      )}

      {/* Floating action bar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(249,115,22,0.25)',
              boxShadow: '0 8px 32px rgba(249,115,22,0.18)',
            }}
          >
            <span className="text-sm font-bold text-gray-900">{selectedCount} student{selectedCount !== 1 ? 's' : ''} selected</span>
            <button onClick={() => setCheckedIds(new Set())} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
            <div className="w-px h-5 bg-gray-200" />
            <button onClick={printSelected} className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-800">
              <Printer size={14} /> Print All
            </button>
            <button onClick={exportSelectedPdf} disabled={exportingPdf} className="flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-800 disabled:opacity-50">
              {exportingPdf ? <Spinner size="sm" /> : <Download size={14} />} Save PDF
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewResult && (
        <Modal open onClose={() => setPreviewResult(null)} title={`Preview — ${previewResult.student_name}`} size="lg">
          <ReportCard result={previewResult} onBack={() => setPreviewResult(null)} />
        </Modal>
      )}

      <div ref={printContainerRef} className="hidden" />
    </div>
  );
}