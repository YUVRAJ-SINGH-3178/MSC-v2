'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FALLBACK_EVENTS } from '@/lib/data/mock-fallback';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { ArrowLeft } from 'lucide-react';

const QRScanner = dynamic(() => import('@/components/QRScanner'), {
  ssr: false,
  loading: () => (
    <div className="fluent-card" style={{ padding: '48px', textAlign: 'center' }}>
      <div className="spinner" style={{ margin: '0 auto 16px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Initializing camera scanner module...</p>
    </div>
  ),
});

export default function EventSpecificScannerPage() {
  const params = useParams();
  const eventId = params?.id as string;
  const supabase = createClient();
  const [eventTitle, setEventTitle] = useState('Event Scanner');

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from('events')
      .select('title')
      .eq('id', eventId)
      .single()
      .then(({ data }) => {
        if (data?.title) {
          setEventTitle(data.title);
        } else {
          const fallback = FALLBACK_EVENTS.find((e) => e.id === eventId);
          if (fallback) setEventTitle(fallback.title);
        }
      });
  }, [eventId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href={`/admin/events/${eventId}`}
          style={{ fontSize: '13px', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          <ArrowLeft size={14} /> Back to Event Management
        </Link>
      </div>

      <QRScanner eventId={eventId} eventTitle={eventTitle} />
    </div>
  );
}
