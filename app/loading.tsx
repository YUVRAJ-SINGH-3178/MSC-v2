import React from 'react';

export default function Loading() {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: 'var(--bg)',
      }}
    >
      {/* Fluent 2 Circular Progress */}
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '2.5px solid var(--border)',
          borderTopColor: 'var(--brand)',
          animation: 'fluent-spin 0.75s cubic-bezier(0.53, 0.21, 0.29, 0.67) infinite',
        }}
      />
      <span
        style={{
          fontSize: '13px',
          color: 'var(--text-muted)',
          fontWeight: 500,
        }}
      >
        Loading...
      </span>
      <style>{`
        @keyframes fluent-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
