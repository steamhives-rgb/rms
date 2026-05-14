// ResultModule — Admin results management (query, bulk print, broadsheet)
// NOTE: The public PIN-based results check lives at /app/results/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Trash2, Eye, Printer, CheckSquare, Square, ChevronDown, Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import { Table, Thead, Tbody, Th, Td, Tr } from '@/components/ui/Table';
import { useToast } from '@/components/providers/ToastProvider';
import { TERMS } from '@/lib/constants';
import ResultEntry from './ResultEntry';
import BroadsheetViewer from './BroadsheetViewer';
import ReportCard from './ReportCard';
import type { Result, AcademicSession } from '@/lib/types';

interface SchoolClass { id: number; name: string; is_active: boolean; }

const TERM_OPTIONS = [{ value: '', label: 'All Terms'  }, ...TERMS.map(t => ({ value: t, label: t }))];
const TYPE_OPTIONS = [{ value: '', label: 'All Types' }, { value: 'full', label: 'Full Term' }, { value: 'midterm', label: 'Mid-Term' }];

export default function ResultModule() {
  const { success, error: showError } = useToast();
  const [results,       setResults]       = useState<Result[]>([]);
  const [sessions,      setSessions]      = useState<AcademicSession[]>([]);
  const [activeClasses, setActiveClasses] = useState<SchoolClass[]>([]);
  const [loading,       setLoading]       = useState(false);
  const [filterClass,   setFilterClass]   = useState('');
  const [filterTerm,    setFilterTerm]    = useState('');
  const [filterSess,    setFilterSess]    = useState('');
  const [filterType,    setFilterType]    = useState('');
  const [search,        setSearch]        = useState('');
  const [view,          setView]          = useState<'list' | 'entry' | 'broadsheet' | 'report'>('list');
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [deleteTarget,   setDeleteTarget]   = useState<Result | null>(null);
  const [checkedIds,     setCheckedIds]     = useState<Set<number>>(new Set());
  const [printing,       setPrinting]       = useState(false);

  // Fix #11: gate first fetch on session load to avoid race-condition blank page
  const [sessionsLoaded, setSessionsLoaded] = useState(false);

  // Fetch active classes from API
  useEffect(() => {
    fetch('/api/schools/classes?active=true')
      .then(r => r.json())
      .then(d => { if (d.success) setActiveClasses(d.classes ?? []); })
      .catch(e => console.error('[ResultModule] classes fetch error:', e));
  }, []);

  useEffect(() => {
    fetch('/api/sessions').then(r => r.json()).then(d => {
      if (d.success) {
        setSessions(d.sessions ?? []);
        const cur = (d.sessions ?? []).find((s: AcademicSession) => s.is_current);
        if (cur) { setFilterSess(cur.label); setFilterTerm(cur.current_term ?? ''); }
      }
    }).catch(e => console.error('[ResultModule] sessions fetch error:', e))
      .finally(() => setSessionsLoaded(true));
  }, []);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterClass) p.set('class', filterClass);
      if (filterTerm)  p.set('term',  filterTerm);
      if (filterSess)  p.set('session', filterSess);
      if (filterType)  p.set('result_type', filterType);
      const res  = await fetch(`/api/results?${p}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results ?? []);
      } else {
        console.error('[ResultModule] fetchResults error:', data.error);
        showError(data.error ?? 'Failed to load results.');
      }
    } catch (e) {
      console.error('[ResultModule] fetchResults network error:', e);
      showError('Failed to load results.');
    } finally  { setLoading(false); }
  }, [filterClass, filterTerm, filterSess, filterType]);

  // Only run after sessions have loaded so filterSess is already set on first fetch
  useEffect(() => {
    if (!sessionsLoaded) return;
    fetchResults();
  }, [fetchResults, sessionsLoaded]);

  async function handleDelete(r: Result) {
    try {
      const res  = await fetch('/api/results', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id }) });
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Delete failed.'); return; }
      success('Result deleted.');
      fetchResults();
    } catch { showError('Network error.'); }
    setDeleteTarget(null);
  }

  const filtered = results.filter(r =>
    !search || r.student_name.toLowerCase().includes(search.toLowerCase()) || (r.student_adm ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // --- Checkbox / bulk select ---
  const allChecked = filtered.length > 0 && filtered.every(r => checkedIds.has(r.id));
  const someChecked = filtered.some(r => checkedIds.has(r.id));

  function toggleAll() {
    if (allChecked) setCheckedIds(new Set());
    else setCheckedIds(new Set(filtered.map(r => r.id)));
  }

  function toggleOne(id: number) {
    setCheckedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  function printSingle(r: Result) {
    const win = window.open('', '_blank');
    if (!win) { showError('Pop-up blocked — allow pop-ups for this page.'); return; }
    win.document.write(`
      <html><head><title>${r.student_name} — Report Card</title>
      <style>
        body { font-family: sans-serif; margin: 20px; font-size: 13px; }
        h2 { margin: 0 0 4px; font-size: 18px; }
        .meta { color: #555; margin-bottom: 16px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 10px; text-align: left; }
        th { background: #f5f5f5; font-size: 11px; text-transform: uppercase; }
        .avg { font-weight: bold; margin-top: 12px; }
        @media print { body { margin: 0; } }
      </style></head><body>
        <h2>${r.student_name}</h2>
        <div class="meta">Adm: ${r.student_adm ?? ''} · Class: ${r.class} · ${r.term} · ${r.session} · ${r.result_type === 'midterm' ? 'Mid-Term' : 'Full Term'}</div>
        <table>
          <thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
          <tbody>
            ${(r.subjects ?? []).map(s => `<tr>
              <td>${s.name}</td><td>${s.ca}</td><td>${s.exam}</td><td>${s.total}</td><td>${s.grade}</td><td>${s.remark}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div class="avg">Average: ${r.avg?.toFixed?.(1) ?? r.avg} · Position: ${r.position ? `${r.position}/${r.out_of}` : '—'}</div>
        ${r.teacher_comment   ? `<p><strong>Teacher:</strong> ${r.teacher_comment}</p>`   : ''}
        ${r.principal_comment ? `<p><strong>Principal:</strong> ${r.principal_comment}</p>` : ''}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }

  async function bulkPrint() {
    const toPrint = results.filter(r => checkedIds.has(r.id));
    if (!toPrint.length) { showError('Select results to print.'); return; }
    setPrinting(true);
    // Open a print window with all selected report cards
    const win = window.open('', '_blank');
    if (!win) { showError('Pop-up blocked — allow pop-ups for this page.'); setPrinting(false); return; }
    win.document.write(`
      <html><head><title>Bulk Report Cards</title>
      <style>
        body { font-family: sans-serif; margin: 0; }
        .page { page-break-after: always; padding: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th, td { border: 1px solid #ccc; padding: 4px 8px; }
        th { background: #f5f5f5; }
        h2 { margin: 0 0 8px; font-size: 16px; }
        .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
        .avg  { font-weight: bold; font-size: 14px; margin-top: 8px; }
      </style>
      </head><body>
    `);
    toPrint.forEach((r, i) => {
      win.document.write(`
        <div class="page">
          <h2>${r.student_name}</h2>
          <div class="meta">Adm: ${r.student_adm ?? ''} | Class: ${r.class} | Term: ${r.term} | Session: ${r.session}</div>
          <table>
            <thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th><th>Remark</th></tr></thead>
            <tbody>
              ${(r.subjects ?? []).map(s => `<tr>
                <td>${s.name}</td><td>${s.ca}</td><td>${s.exam}</td><td>${s.total}</td><td>${s.grade}</td><td>${s.remark}</td>
              </tr>`).join('')}
            </tbody>
          </table>
          <div class="avg">Average: ${r.avg?.toFixed?.(1) ?? r.avg} | Position: ${r.position ? `${r.position}/${r.out_of}` : '—'}</div>
          ${r.teacher_comment ? `<p><strong>Teacher:</strong> ${r.teacher_comment}</p>` : ''}
          ${r.principal_comment ? `<p><strong>Principal:</strong> ${r.principal_comment}</p>` : ''}
        </div>
      `);
    });
    win.document.write('</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setPrinting(false); }, 500);
  }

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...activeClasses.map(c => ({ value: c.name, label: c.name })),
  ];

  if (view === 'entry') {
    return (
      <ResultEntry
        result={selectedResult}
        defaultClass={filterClass}
        defaultTerm={filterTerm}
        defaultSession={filterSess}
        onSaved={() => { setView('list'); fetchResults(); }}
        onCancel={() => setView('list')}
      />
    );
  }

  if (view === 'broadsheet') {
    return (
      <BroadsheetViewer
        defaultClass={filterClass}
        defaultTerm={filterTerm}
        defaultSession={filterSess}
        onBack={() => setView('list')}
      />
    );
  }

  if (view === 'report' && selectedResult) {
    return (
      <ReportCard
        result={selectedResult}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1">Results</h2>
        {someChecked && (
          <Button size="sm" variant="outline" onClick={bulkPrint} loading={printing} className="text-purple-600 border-purple-300">
            <Printer size={14} /> Print Selected ({checkedIds.size})
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setView('broadsheet')}>
          <FileText size={15} /> Broadsheet
        </Button>
        <Button size="sm" onClick={() => { setSelectedResult(null); setView('entry'); }}>
          + Enter Result
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500"
            placeholder="Search by name or admission no…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select options={classOptions} value={filterClass} onChange={e => { setFilterClass(e.target.value); setCheckedIds(new Set()); }} wrapperClass="w-36" />
        <Select options={TERM_OPTIONS}  value={filterTerm}  onChange={e => { setFilterTerm(e.target.value);  setCheckedIds(new Set()); }} wrapperClass="w-32" />
        <Select options={TYPE_OPTIONS}  value={filterType}  onChange={e => { setFilterType(e.target.value);  setCheckedIds(new Set()); }} wrapperClass="w-32" />
        <select
          value={filterSess}
          onChange={e => { setFilterSess(e.target.value); setCheckedIds(new Set()); }}
          className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 w-32"
        >
          <option value="">All Sessions</option>
          {sessions.map(s => <option key={s.id} value={s.label}>{s.label}</option>)}
        </select>
      </div>

      {/* Bulk select bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            {allChecked ? <CheckSquare size={14} className="text-orange-500" /> : <Square size={14} />}
            {allChecked ? 'Deselect all' : 'Select all'}
          </button>
          {checkedIds.size > 0 && (
            <span className="text-xs text-orange-600 font-medium">{checkedIds.size} selected</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16"><Spinner /></div>
      ) : !filtered.length ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No results found</p>
          <p className="text-sm mt-1">Adjust filters or enter results for students</p>
        </div>
      ) : (
        <Table>
          <Thead>
            <tr>
              <Th className="w-8" />
              <Th>Student</Th>
              <Th>Adm No.</Th>
              <Th>Class</Th>
              <Th>Term</Th>
              <Th>Session</Th>
              <Th>Type</Th>
              <Th>Avg</Th>
              <Th>Position</Th>
              <Th />
            </tr>
          </Thead>
          <Tbody>
            {filtered.map(r => (
              <Tr key={r.id} className={checkedIds.has(r.id) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}>
                <Td>
                  <button onClick={() => toggleOne(r.id)}>
                    {checkedIds.has(r.id)
                      ? <CheckSquare size={15} className="text-orange-500" />
                      : <Square size={15} className="text-gray-300 hover:text-gray-500" />
                    }
                  </button>
                </Td>
                <Td className="font-medium">{r.student_name}</Td>
                <Td className="text-xs text-gray-500">{r.student_adm}</Td>
                <Td>{r.class}</Td>
                <Td>{r.term}</Td>
                <Td>{r.session}</Td>
                <Td>
                  <Badge variant={r.result_type === 'full' ? 'info' : 'warning'}>
                    {r.result_type === 'full' ? 'Full Term' : 'Mid-Term'}
                  </Badge>
                </Td>
                <Td className="font-semibold">{r.avg?.toFixed?.(1) ?? r.avg}</Td>
                <Td>{r.position ? `${r.position}/${r.out_of}` : '—'}</Td>
                <Td>
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => { setSelectedResult(r); setView('report'); }}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="View report card">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => printSingle(r)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-purple-500" title="Print as PDF">
                      <Printer size={14} />
                    </button>
                    <button onClick={() => { setSelectedResult(r); setView('entry'); }}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-orange-500" title="Edit result">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(r)}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-red-500" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Result" size="sm">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete the result for <strong>{deleteTarget?.student_name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
}