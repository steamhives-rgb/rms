'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import AdminPanel from '@/components/admin/AdminPanel';
import Spinner from '@/components/ui/Spinner';
import { useToast } from '@/components/providers/ToastProvider';

export default function AdminPage() {
  const { is_dev, loading, refetch } = useAuth();
  const { error: showError } = useToast();
  const [key, setKey] = useState('');
  const [logging, setLogging] = useState(false);

  async function handleDevLogin() {
    if (!key) {
      showError('Enter your developer key.');
      return;
    }

    setLogging(true);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();
      if (!data.success) {
        showError(data.error ?? 'Invalid key.');
        return;
      }

      await refetch();
      // is_dev is now true — the conditional render below handles the transition
    } catch {
      showError('Network error.');
    } finally {
      setLogging(false);
    }
  }

  if (loading) {
    return (
      <div className="dev-shell">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!is_dev) {
    return (
      <>
        <div className="dev-shell">
          <div className="dev-blob dev-blob-1" />
          <div className="dev-blob dev-blob-2" />
          <div className="dev-grid" />

          <div className="dev-card">
            <div className="dev-badge">
              <span className="dev-badge-dot" />
              DEVELOPER ACCESS
            </div>

            <div className="dev-icon">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <circle cx="12" cy="16" r="1.5" fill="white" />
              </svg>
            </div>

            <h1 className="dev-title">Developer Panel</h1>
            <p className="dev-sub">STEAMhives RMS · Restricted access</p>

            <div className="dev-divider" />

            <div className="dev-field-wrap">
              <label className="dev-label">Developer Key</label>
              <input
                className="dev-input"
                type="password"
                placeholder="Enter your developer key"
                value={key}
                onChange={e => setKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleDevLogin()}
                autoComplete="new-password"
              />
            </div>

            <button
              className={`dev-btn${logging ? ' dev-btn--loading' : ''}`}
              onClick={handleDevLogin}
              disabled={logging}
            >
              {logging ? <span className="dev-spinner" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {logging ? 'Verifying…' : 'Access Panel'}
            </button>

            <p className="dev-warning">⚠ All actions in this panel are logged and audited.</p>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          .dev-shell {
            position: relative;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #0a0208;
            overflow: clip;
            padding: 1.5rem;
            font-family: 'Montserrat', sans-serif;
          }

          .dev-blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(90px);
            opacity: 0.28;
            animation: devFloat 20s ease-in-out infinite alternate;
            pointer-events: none;
          }
          .dev-blob-1 {
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, #7f1d1d 0%, #991b1b88 60%, transparent 100%);
            top: -160px;
            right: -100px;
            animation-duration: 22s;
          }
          .dev-blob-2 {
            width: 380px;
            height: 380px;
            background: radial-gradient(circle, #3b0764 0%, transparent 70%);
            bottom: -80px;
            left: -80px;
            animation-duration: 18s;
            animation-direction: alternate-reverse;
          }
          @keyframes devFloat {
            from { transform: translate(0,0) scale(1); }
            to { transform: translate(40px,30px) scale(1.1); }
          }

          .dev-grid {
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
          }

          .dev-card {
            position: relative;
            z-index: 10;
            width: 100%;
            max-width: 380px;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(32px) saturate(180%);
            -webkit-backdrop-filter: blur(32px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-top: 1px solid rgba(239, 68, 68, 0.2);
            border-radius: 20px;
            padding: 2rem 1.75rem;
            box-shadow:
              0 0 0 1px rgba(239, 68, 68, 0.06),
              0 32px 64px -16px rgba(0, 0, 0, 0.7),
              inset 0 1px 0 rgba(255,255,255,0.06);
            animation: devCardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          @keyframes devCardIn {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }

          .dev-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.25);
            border-radius: 100px;
            padding: 0.2rem 0.75rem;
            font-size: 0.65rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            color: #fca5a5;
            margin-bottom: 1.5rem;
          }
          .dev-badge-dot {
            width: 6px;
            height: 6px;
            background: #ef4444;
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(0.8); }
          }

          .dev-icon {
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #7f1d1d, #b91c1c);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 24px rgba(185, 28, 28, 0.4);
            margin-bottom: 1rem;
          }

          .dev-title {
            font-size: 1.5rem;
            font-weight: 800;
            color: #fff;
            letter-spacing: -0.03em;
            margin: 0 0 0.25rem;
          }
          .dev-sub {
            font-size: 0.78rem;
            color: rgba(255,255,255,0.35);
            margin: 0 0 1.25rem;
          }

          .dev-divider {
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
            margin-bottom: 1.25rem;
          }

          .dev-field-wrap {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
            margin-bottom: 1rem;
            text-align: left;
          }
          .dev-label {
            font-size: 0.72rem;
            font-weight: 600;
            color: rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 0.1em;
          }
          .dev-input {
            width: 100%;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            padding: 0.7rem 1rem;
            font-size: 0.9rem;
            color: rgba(255,255,255,0.88);
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
          }
          .dev-input::placeholder { color: rgba(255,255,255,0.2); }
          .dev-input:focus {
            border-color: rgba(239, 68, 68, 0.45);
            box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
          }

          .dev-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            background: linear-gradient(135deg, #b91c1c, #7f1d1d);
            color: white;
            font-size: 0.88rem;
            font-weight: 700;
            padding: 0.75rem 1.5rem;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
            box-shadow: 0 6px 20px rgba(185, 28, 28, 0.4);
            margin-bottom: 1rem;
          }
          .dev-btn:hover:not(:disabled) {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 10px 28px rgba(185, 28, 28, 0.5);
          }
          .dev-btn:active:not(:disabled) { transform: translateY(0); }
          .dev-btn--loading { opacity: 0.65; cursor: not-allowed; }

          .dev-spinner {
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.7s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }

          .dev-warning {
            font-size: 0.72rem;
            color: rgba(255,255,255,0.22);
            margin: 0;
            line-height: 1.4;
          }
        ` }} />
      </>
    );
  }

  return <AdminPanel />;
}
