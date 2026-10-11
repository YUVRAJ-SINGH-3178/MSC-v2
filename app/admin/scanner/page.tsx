'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { ArrowLeft, Calendar } from 'lucide-react';

const QRScanner = dynamic(() => import('@/components/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="fluent-card" style={{ padding: '48px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Initializing camera scanner module...</p>
    </div>
  ),
});

export default function AdminGlobalScannerPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<EventItem[]>(FALLBACK_EVENTS);
  const [selectedEventId, setSelectedEventId] = useState<string>(FALLBACK_EVENTS[0].id);

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('date_start', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          setEvents(data as EventItem[]);
          setSelectedEventId(data[0].id);
        }
      });
  }, []);

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0] || FALLBACK_EVENTS[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link href="/admin" style={{ fontSize: '13px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowLeft size={14} /> Dashboard
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Door Scanner</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-strong)', margin: 0 }}>
            Live Door QR Scanner &amp; Offline Queue
          </h1>
        </div>

        {/* Event Selector Pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={16} color="var(--brand)" />
          <label htmlFor="event-select" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-body)' }}>
            Turnstile Event:
          </label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="fluent-input"
            style={{ width: 'auto', minWidth: '220px', padding: '6px 12px', fontSize: '13px' }}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scanner Container with IndexedDB Caching and Team Check-in */}
      <QRScanner key={selectedEventId} eventId={selectedEventId} eventTitle={currentEvent.title} />
    </div>
  );
}
