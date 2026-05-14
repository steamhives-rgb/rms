'use client';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-shell">
      <div className="auth-blob auth-blob-1" />
      <div className="auth-blob auth-blob-2" />
      <main className="auth-content">{children}</main>
      <style dangerouslySetInnerHTML={{ __html: `
        .auth-shell {
          position: relative;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          padding: 1.5rem;
          overflow: hidden;
        }

        .auth-content {
          position: relative;
          z-index: 10;
          width: min(100%, 440px);
        }

        .auth-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.55;
          pointer-events: none;
        }

        .auth-blob-1 {
          width: 480px;
          height: 480px;
          top: -180px;
          right: -120px;
          background: radial-gradient(circle, rgba(251, 146, 60, 0.45) 0%, rgba(249, 115, 22, 0.10) 60%, transparent 100%);
        }

        .auth-blob-2 {
          width: 380px;
          height: 380px;
          bottom: -120px;
          left: -80px;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.30) 0%, rgba(37, 99, 235, 0.08) 60%, transparent 100%);
        }
      ` }} />
    </div>
  );
}
