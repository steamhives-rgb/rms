'use client';
import { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import ReportCard from '@/components/dashboard/ReportCard';
import { useToast } from '@/components/providers/ToastProvider';
import type { Result } from '@/lib/types';

export default function ResultsPage() {
  const { error: showError } = useToast();
  const [pin,     setPin]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<Result | null>(null);

  async function checkResult() {
    if (!pin.trim()) { showError('Please enter your PIN.'); return; }
    setLoading(true);
    try {
      // BUG FIX: was POST with action:'check' — must be GET with verify=1
      const res  = await fetch(`/api/results/pins?verify=1&pin=${encodeURIComponent(pin.trim().toUpperCase())}`);
      const data = await res.json();
      if (!data.success) { showError(data.error ?? 'Invalid or expired PIN.'); return; }
      // PIN route returns { student, school, results[] } — show the first (most recent) full result
      const results: Result[] = data.results ?? [];
      const full = results.find(r => r.result_type === 'full') ?? results[0];
      if (!full) { showError('No results found for this PIN.'); return; }
      setResult(full);
    } catch { showError('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-950 dark:to-gray-900 p-4">
      {!result ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-3">📋</div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Check Result</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Enter your PIN to view your result</p>
            </div>
            <div className="space-y-4">
              <Input
                label="Result PIN"
                placeholder="e.g. PIN-AB3-9KM2"
                value={pin}
                onChange={e => setPin(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && checkResult()}
              />
              <Button className="w-full" onClick={checkResult} loading={loading} size="lg">
                View Result →
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto py-6">
          <div className="flex justify-between items-center mb-4">
            <Button variant="outline" size="sm" onClick={() => { setResult(null); setPin(''); }}>
              ← Check Another
            </Button>
            <Button size="sm" onClick={() => window.print()}>🖨️ Print</Button>
          </div>
          <ReportCard result={result} onBack={() => { setResult(null); setPin(''); }} />
        </div>
      )}
    </div>
  );
}