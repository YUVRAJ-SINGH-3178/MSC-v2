import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';

export const metadata: Metadata = {
  title: '404: Page Not Found | Microsoft Student Community SRM AP',
  description: 'The requested resource could not be found on MSC SRM AP portal.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--bg)',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Microsoft 4-Color Accent */}
        <div
          style={{
            display: 'inline-grid',
            gridTemplateColumns: 'repeat(2, 8px)',
            gridTemplateRows: 'repeat(2, 8px)',
            gap: '2px',
            marginBottom: '20px',
          }}
        >
          <div style={{ background: '#f25022', borderRadius: '1px' }} />
          <div style={{ background: '#7fba00', borderRadius: '1px' }} />
          <div style={{ background: '#00a4ef', borderRadius: '1px' }} />
          <div style={{ background: '#ffb900', borderRadius: '1px' }} />
        </div>

        <div
          style={{
            fontSize: '64px',
            fontWeight: 700,
            color: 'var(--text-strong)',
            lineHeight: 1,
            marginBottom: '12px',
            letterSpacing: '-0.03em',
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--text-strong)',
            margin: '0 0 12px 0',
          }}
        >
          We can&apos;t find that page
        </h1>

        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '32px',
          }}
        >
          It might have been moved or no longer exists.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', alignItems: 'center' }}>
          <Link
            href="/"
            className="fluent-btn fluent-btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '14px',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={15} /> Back to home
          </Link>
          <Link
            href="/events"
            style={{
              fontSize: '14px',
              color: 'var(--brand)',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Browse events
          </Link>
        </div>
      </div>
    </div>
  );
}
