import React from 'react';
import { notFound } from 'next/navigation';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';
import { getAdminClient } from '@/lib/supabase/admin';
import EventDetailClient from './EventDetailClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EventPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; invite?: string; tab?: string }>;
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mscsrmap.xyz';

async function getEventBySlug(slug: string): Promise<EventItem | null> {
  try {
    const supabase = getAdminClient();
    let filter = `slug.eq.${slug},id.eq.${slug}`;
    if (slug === 'synora' || slug === 'synora-2026' || slug === 'synora-pitstop') {
      filter += `,slug.eq.synora-26`;
    }
    const queryPromise = supabase
      .from('events')
      .select('*')
      .or(filter)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Event detail fetch timeout')), 6000)
    );

    const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (!error && data) {
      return data as EventItem;
    }
  } catch {
    // Falls back immediately to FALLBACK_EVENTS if offline or slow
  }

  return (
    FALLBACK_EVENTS.find(
      (e) => e.slug === slug || e.id === slug || (slug === 'synora' && e.slug === 'synora-26')
    ) || null
  );
}

export async function generateMetadata({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event Not Found' };

  return {
    title: `${event.title} | Microsoft Student Community SRM AP`,
    description: event.description,
    alternates: {
      canonical: `/events/${event.slug}`,
    },
    openGraph: {
      title: `${event.title} | Microsoft Student Community SRM AP`,
      description: event.description,
      url: `/events/${event.slug}`,
      type: 'article',
      images: [
        {
          url: event.image_url || '/hero_bg.png',
          width: 1200,
          height: 630,
          alt: event.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${event.title} | Microsoft Student Community SRM AP`,
      description: event.description,
      images: [event.image_url || '/hero_bg.png'],
    },
  };
}

export default async function EventDetailPage({ params, searchParams }: EventPageProps) {
  const { slug } = await params;
  const { view, invite, tab } = await searchParams;

  // Custom Flagship Microsite Routing (Section 2.A)
  if ((slug === 'synora' || slug === 'synora-pitstop') && view !== 'portal') {
    return (
      <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '16px',
            zIndex: 100,
            background: 'rgba(10, 10, 12, 0.88)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm, 4px)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: '12px', color: '#ffb900', fontWeight: 600 }}>FLAGSHIP MICROSITE</span>
          <a
            href={`/events/${slug}?view=portal`}
            style={{
              fontSize: '12px',
              color: '#ffffff',
              background: '#e10600',
              padding: '5px 12px',
              borderRadius: '2px',
              textDecoration: 'none',
              fontWeight: 600,
              transition: 'background 0.2s ease',
            }}
          >
            Switch to Standard Portal Tab View &rarr;
          </a>
        </div>
        <iframe
          src="/custom-events/synora-pitstop-01/index.html"
          title="SYNORA Flagship Microsite"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    );
  }

  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    image: event.image_url,
    startDate: event.date_start,
    endDate: event.date_end,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: event.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Amaravati',
        addressRegion: 'Andhra Pradesh',
        postalCode: '522240',
        addressCountry: 'IN',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: 'Microsoft Student Community SRM AP',
      url: BASE_URL,
    },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/events/${event.slug}`,
      price: event.form_requirements?.registration_fee || '0',
      priceCurrency: 'INR',
      availability: event.registration_open
        ? 'https://schema.org/InStock'
        : 'https://schema.org/SoldOut',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <EventDetailClient
        event={event}
        initialInvite={invite}
        initialTab={tab}
      />
    </>
  );
}
