'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Home,
  Terminal,
  Bug,
  Coffee,
  MessageSquare,
  X,
  Sparkles,
} from 'lucide-react';

const SARCASTIC_CRASH_ROASTS = [
  "Have you tried turning your computer off, walking outside, and rethinking your life choices?",
  "Error 500: Server had an existential crisis and decided to take a coffee break.",
  "Our code worked flawlessly until you interacted with it. Coincidence? We think not.",
  "Don't worry, we won't run `git blame`. (Okay, someone is definitely running `git blame`).",
  "A wild runtime exception appeared! You used 'Refresh'. It might be super effective.",
  "If this happened during a hackathon: do NOT punch your monitor. Grab a Red Bull instead.",
];

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [roastIndex, setRoastIndex] = useState(0);
  const [showErrorPopup, setShowErrorPopup] = useState(true);

  useEffect(() => {
    // Log normalized error server-side / console
    console.error('[MSC ErrorBoundary caught]:', error);
  }, [error]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setRoastIndex((prev) => (prev + 1) % SARCASTIC_CRASH_ROASTS.length);
    reset();
  };

  return (
    <div
      style={{
        minHeight: '85vh',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 20px',
        background: 'radial-gradient(ellipse at center, var(--bg-soft) 0%, var(--bg) 80%)',
        overflow: 'hidden',
      }}
    >
      {/* Background Matrix/Subtle Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Sarcastic Popup Notification Banner */}
      {showErrorPopup && (
        <div
          role="dialog"
          aria-label="Crash Advisory"
          style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            maxWidth: '400px',
            width: 'calc(100% - 48px)',
            background: 'var(--surface)',
            border: '1px solid var(--danger, #c50f1f)',
            borderLeft: '5px solid var(--danger, #c50f1f)',
            borderRadius: '6px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.22)',
            padding: '16px',
            zIndex: 9999,
            animation: 'slideInRight 0.35s ease forwards',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bug size={18} style={{ color: 'var(--danger)' }} />
              <strong style={{ fontSize: '13px', color: 'var(--text-strong)' }}>
                TASK FAILED SUCCESSFULLY
              </strong>
            </div>
            <button
              onClick={() => setShowErrorPopup(false)}
              aria-label="Dismiss crash notice"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={15} />
            </button>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-body)', margin: '8px 0 0', lineHeight: 1.4 }}>
            A catastrophic event took place, but our team looked at it and smiled politely.
            Retry count: <strong>{retryCount}</strong>.
          </p>
        </div>
      )}

      {/* Main Crash Card */}
      <div
        style={{
          position: 'relative',
          maxWidth: '640px',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl, 12px)',
          boxShadow: 'var(--shadow-lift)',
          padding: '36px 28px',
          textAlign: 'center',
          zIndex: 10,
        }}
      >
        {/* Microsoft 4-Color Accent Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '3px',
            marginBottom: '20px',
          }}
        >
          <div style={{ width: '10px', height: '10px', background: '#f25022', borderRadius: '1px' }} />
          <div style={{ width: '10px', height: '10px', background: '#7fba00', borderRadius: '1px' }} />
          <div style={{ width: '10px', height: '10px', background: '#00a4ef', borderRadius: '1px' }} />
          <div style={{ width: '10px', height: '10px', background: '#ffb900', borderRadius: '1px' }} />
        </div>

        {/* Windows BSOD Style Emoticon Badge */}
        <div
          style={{
            fontSize: '44px',
            fontWeight: 800,
            color: 'var(--brand)',
            marginBottom: '8px',
            fontFamily: 'monospace',
          }}
        >
          :(
        </div>

        {/* Glitchy Error Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '16px',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            marginBottom: '14px',
            fontFamily: 'monospace',
          }}
        >
          <Terminal size={13} /> STOP: 0x000000DE (ERR_HUMAN_INTERACTION)
        </div>

        <h1
          style={{
            fontSize: 'clamp(20px, 3.5vw, 24px)',
            fontWeight: 700,
            color: 'var(--text-strong)',
            marginBottom: '10px',
          }}
        >
          Oops! Something crashed harder than end-sem grades.
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            maxWidth: '480px',
            margin: '0 auto 20px',
          }}
        >
          An unexpected error occurred. The server didn&apos;t know what to do with your request,
          so it threw its hands in the air and gave up.
        </p>

        {/* Sarcastic Roast Box */}
        <div
          style={{
            background: 'var(--bg-soft)',
            border: '1px dashed var(--border-strong, #777)',
            borderRadius: '8px',
            padding: '14px 18px',
            maxWidth: '500px',
            margin: '0 auto 24px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--danger)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={12} /> Tech Lead Advice #{roastIndex + 1}
          </div>
          <p
            style={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: 'var(--text-strong)',
              margin: 0,
            }}
          >
            &ldquo;{SARCASTIC_CRASH_ROASTS[roastIndex]}&rdquo;
          </p>
          {error?.digest && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              Error Digest: {error.digest}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '24px',
          }}
        >
          <button
            onClick={handleRetry}
            className="fluent-btn fluent-btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <RefreshCw size={15} /> Try Again {retryCount > 0 ? `(Attempt #${retryCount + 1})` : ''}
          </button>

          <Link
            href="/"
            className="fluent-btn fluent-btn-secondary"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <Home size={15} /> Return Home Safely
          </Link>

          <button
            onClick={() => setShowErrorPopup(true)}
            className="fluent-btn fluent-btn-secondary"
            style={{
              padding: '10px 14px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Coffee size={15} /> Need Emotional Support
          </button>
        </div>

        {/* Micro-footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '16px',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <span>If this persists, ping us on Discord:</span>
          <a
            href="https://discord.gg/K5NC5wAhg"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <MessageSquare size={13} /> MSC Discord Community
          </a>
        </div>
      </div>
    </div>
  );
}
