'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Home,
  Calendar,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Terminal,
  X,
  Users,
  Award,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

const SARCASTIC_EXCUSES = [
  "It worked on my machine (localhost:3000 at 3:00 AM).",
  "A cosmic ray hit the datacenter and flipped a bit in the routing table.",
  "SRM-AP campus Wi-Fi dropped the exact packet containing this page.",
  "The intern pushed directly to production right before leaving for the weekend.",
  "It's not a missing page; it's an undocumented feature exploration challenge.",
  "Even GitHub Copilot refused to complete the route you just typed.",
  "You didn't offer a sacrifice to the TypeScript compiler gods this morning.",
  "DNS swore on its life that it wasn't its fault, but we all know it's always DNS.",
  "The page was garbage-collected because it couldn't handle your navigation skills.",
  "Our frontend team is currently playing ping-pong. Please try again later.",
];

const ROAST_OPTIONS = [
  {
    label: "I was testing your 404 page (obviously)",
    reply: "Sure you were. 10/10 QA initiative. You get 0 extra credits.",
  },
  {
    label: "My keyboard slipped and hit Enter",
    reply: "A classic. The cat-on-the-keyboard excuse never gets old.",
  },
  {
    label: "I genuinely thought this was a real link",
    reply: "Admitting the skill issue is the first step toward recovery.",
  },
  {
    label: "Copilot told me to come here",
    reply: "Blaming AI for personal navigation disasters? Peak 2026 engineering.",
  },
];

export default function NotFoundClient() {
  const [excuseIndex, setExcuseIndex] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [roastResponse, setRoastResponse] = useState<string | null>(null);
  const [lostLevel, setLostLevel] = useState(99);
  const [typingPath, setTypingPath] = useState('');

  useEffect(() => {
    // Show sarcastic modal after a short delay
    const timer = setTimeout(() => {
      setShowPopup(true);
    }, 600);

    // Get the requested bad path from window if available
    if (typeof window !== 'undefined') {
      setTypingPath(window.location.pathname);
    }

    return () => clearTimeout(timer);
  }, []);

  const nextExcuse = () => {
    setExcuseIndex((prev) => (prev + 1) % SARCASTIC_EXCUSES.length);
    setLostLevel(Math.min(100, Math.max(80, Math.floor(Math.random() * 20) + 80)));
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
        background: 'radial-gradient(ellipse at top, var(--bg-soft) 0%, var(--bg) 70%)',
        overflow: 'hidden',
      }}
    >
      {/* Background Decorative Matrix Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, var(--border) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          opacity: 0.35,
          pointerEvents: 'none',
        }}
      />

      {/* Sarcastic Popup Toast/Modal */}
      {showPopup && (
        <div
          role="dialog"
          aria-label="Navigation Alert"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            maxWidth: '380px',
            width: 'calc(100% - 48px)',
            background: 'var(--surface)',
            border: '1px solid var(--border-strong, #555)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.28)',
            borderRadius: 'var(--radius-lg, 8px)',
            padding: '20px',
            zIndex: 9999,
            animation: 'slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'var(--warning-bg)',
                  color: 'var(--warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={16} />
              </div>
              <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text-strong)' }}>
                GPS: LOST STUDENT PROTOCOL
              </h2>
            </div>
            <button
              onClick={() => setShowPopup(false)}
              aria-label="Close sarcastic popup"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: '2px',
                display: 'flex',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.5, margin: '12px 0' }}>
            We noticed you wandered off the map. A search party has <strong>NOT</strong> been dispatched.
            Why did you click here?
          </p>

          {!roastResponse ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ROAST_OPTIONS.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setRoastResponse(opt.reply)}
                  style={{
                    textAlign: 'left',
                    fontSize: '12px',
                    padding: '8px 10px',
                    borderRadius: '4px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-soft)',
                    color: 'var(--text-strong)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--brand)';
                    e.currentTarget.style.background = 'var(--brand-soft)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'var(--bg-soft)';
                  }}
                >
                  &bull; {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: 'var(--brand-soft)',
                border: '1px solid var(--brand)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '13px',
                color: 'var(--text-strong)',
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', color: 'var(--brand)' }}>
                <Lightbulb size={14} /> Diagnostic Result:
              </div>
              {roastResponse}
            </div>
          )}

          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Link
              href="/"
              onClick={() => setShowPopup(false)}
              className="fluent-btn fluent-btn-primary"
              style={{
                fontSize: '12px',
                padding: '6px 14px',
                borderRadius: '4px',
                textDecoration: 'none',
              }}
            >
              Evacuate to Home &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div
        style={{
          position: 'relative',
          maxWidth: '680px',
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl, 12px)',
          boxShadow: 'var(--shadow-lift)',
          padding: '40px 32px',
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
          <div style={{ width: '12px', height: '12px', background: '#f25022', borderRadius: '2px' }} title="Red: Page missing" />
          <div style={{ width: '12px', height: '12px', background: '#7fba00', borderRadius: '2px' }} title="Green: Developers chuckling" />
          <div style={{ width: '12px', height: '12px', background: '#00a4ef', borderRadius: '2px' }} title="Blue: Infinite void" />
          <div style={{ width: '12px', height: '12px', background: '#ffb900', borderRadius: '2px' }} title="Yellow: Skill issue alert" />
        </div>

        {/* Glitchy Code Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '16px',
            fontFamily: 'monospace',
          }}
        >
          <Terminal size={14} /> STATUS_404_PAGE_NOT_FOUND
        </div>

        {/* Giant Sarcastic 404 Headline */}
        <div
          style={{
            fontSize: 'clamp(56px, 12vw, 84px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: '-0.05em',
            color: 'var(--text-strong)',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>4</span>
          <span
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #0078d4, #f25022)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              transform: 'rotate(-10deg)',
            }}
          >
            0
          </span>
          <span>4</span>
        </div>

        <h1
          style={{
            fontSize: 'clamp(20px, 4vw, 26px)',
            fontWeight: 700,
            color: 'var(--text-strong)',
            marginBottom: '10px',
            lineHeight: 1.25,
          }}
        >
          Congratulations, you found the digital void.
        </h1>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            maxWidth: '520px',
            margin: '0 auto 24px',
          }}
        >
          Out of all the routes on the MSC portal, you typed or clicked your way into a dimension that
          does not exist. {typingPath ? <code style={{ background: 'var(--bg-soft)', padding: '2px 6px', borderRadius: '4px', fontSize: '13px' }}>{typingPath}</code> : 'This route'} has 0 bits and 0 bytes.
        </p>

        {/* Interactive Excuse Generator Box */}
        <div
          style={{
            background: 'var(--bg-soft)',
            border: '1px dashed var(--border-strong, #888)',
            borderRadius: '8px',
            padding: '16px 20px',
            margin: '0 auto 28px',
            maxWidth: '540px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--brand)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Sparkles size={13} /> Official Developer Excuse #{excuseIndex + 1}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                fontFamily: 'monospace',
              }}
            >
              Lostness: {lostLevel}%
            </span>
          </div>

          <p
            style={{
              fontSize: '14px',
              fontStyle: 'italic',
              color: 'var(--text-strong)',
              margin: '0 0 12px 0',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            &ldquo;{SARCASTIC_EXCUSES[excuseIndex]}&rdquo;
          </p>

          <button
            onClick={nextExcuse}
            className="fluent-btn fluent-btn-secondary"
            style={{
              fontSize: '12px',
              padding: '6px 14px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={13} /> Generate Another Excuse
          </button>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '32px',
          }}
        >
          <Link
            href="/"
            className="fluent-btn fluent-btn-primary"
            style={{
              padding: '10px 22px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <Home size={16} /> Teleport Back Home
          </Link>

          <Link
            href="/events"
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
            <Calendar size={16} /> Browse Real Events
          </Link>

          <button
            onClick={() => setShowPopup(true)}
            className="fluent-btn fluent-btn-secondary"
            style={{
              padding: '10px 16px',
              fontSize: '14px',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <HelpCircle size={16} /> Explain Yourself
          </button>
        </div>

        {/* Useful Quick Shortcuts */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
            fontSize: '13px',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-strong)' }}>Legitimate destinations:</span>
          <Link href="/events" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> Events
          </Link>
          <Link href="/team" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Users size={14} /> Meet the Team
          </Link>
          <Link href="/ticket" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Award size={14} /> Find Ticket
          </Link>
          <Link href="/about" style={{ color: 'var(--brand)', textDecoration: 'none' }}>
            About MSC
          </Link>
        </div>
      </div>
    </div>
  );
}
