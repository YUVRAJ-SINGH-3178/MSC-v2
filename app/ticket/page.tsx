'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Ticket, Calendar, MapPin, ArrowRight, AlertCircle } from 'lucide-react';

interface ResolvedTicket {
  hash_payload: string;
  event_title: string;
  date_start: string;
  location: string;
  status: string;
  is_team_member?: boolean;
}

export default function TicketLookupPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResolvedTicket[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setResults(null);

    try {
      const res = await fetch('/api/ticket/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search for tickets.');
      }

      setResults(data.tickets || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lookup failed. Please check the email or registration number entered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '60px 0 100px 0' }}>
      <div className="container" style={{ maxWidth: '600px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              background: 'var(--brand-soft)',
              color: 'var(--brand)',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            <Ticket size={22} />
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '6px' }}>
            Find your ticket
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Enter your registered email address or college registration number below to retrieve your event pass.
          </p>
        </div>

        {/* Search Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            boxShadow: 'var(--shadow-rest)',
            padding: '28px',
            marginBottom: '28px',
          }}
        >
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-strong)' }}>
                Registered email address or registration number
              </label>
              <input
                type="text"
                required
                placeholder="name@srmap.edu.in or AP21110010..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="fluent-input"
                style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="fluent-btn fluent-btn-primary"
              style={{ padding: '10px 16px', fontSize: '14px', borderRadius: '4px' }}
            >
              {loading ? 'Searching...' : 'Find ticket'}
            </button>
          </form>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            style={{
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              padding: '12px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '24px',
            }}
          >
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Search Results */}
        {results !== null && (
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '14px' }}>
              Found tickets ({results.length})
            </h3>

            {results.length === 0 ? (
              <div
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  padding: '28px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13.5px',
                }}
              >
                No confirmed tickets found matching <strong>{email}</strong>. Please check for typos or register for an upcoming event.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {results.map((t) => (
                  <div
                    key={t.hash_payload}
                    className="fluent-card"
                    style={{
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '14px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <span className="fluent-badge badge-success" style={{ marginBottom: '6px' }}>
                        {t.status.toUpperCase()}
                      </span>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-strong)', margin: '4px 0' }}>
                        {t.event_title}
                      </h4>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} color="var(--brand)" />
                          {new Date(t.date_start).toLocaleDateString()}
                        </span>
                        <span>&bull;</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} color="var(--brand)" />
                          {t.location}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/ticket/${t.hash_payload}`}
                      className="fluent-btn fluent-btn-primary"
                      style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      View ticket <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
