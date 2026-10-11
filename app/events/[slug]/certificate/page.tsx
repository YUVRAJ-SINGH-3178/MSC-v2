import React from 'react';
import { notFound } from 'next/navigation';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';
import { getAdminClient } from '@/lib/supabase/admin';
import CertificateClient from './CertificateClient';

export const dynamic = 'force-dynamic';

interface CertificatePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ email?: string }>;
}

async function getEventBySlug(slug: string): Promise<EventItem | null> {
  try {
    const supabase = getAdminClient();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

    if (isUUID) {
      const { data } = await supabase.from('events').select('*').eq('id', slug).maybeSingle();
      if (data) return data as EventItem;
    } else {
      const { data } = await supabase.from('events').select('*').eq('slug', slug).maybeSingle();
      if (data) return data as EventItem;

      if (slug === 'synora' || slug === 'synora-2026') {
        const { data: synoraData } = await supabase.from('events').select('*').eq('slug', 'synora-26').maybeSingle();
        if (synoraData) return synoraData as EventItem;
      }
    }
  } catch (err) {
    console.warn('[CertificatePage DB error]:', err);
  }

  return FALLBACK_EVENTS.find((e) => e.slug === slug || (slug === 'synora' && e.slug === 'synora-26')) || null;
}

export async function generateMetadata({ params }: CertificatePageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Certificate' };

  return {
    title: `Certificate of Participation - ${event.title} | MSC SRM AP`,
    description: `Official verified certificate of participation for ${event.title} issued by Microsoft Student Community SRM AP.`,
    alternates: {
      canonical: `/events/${event.slug}/certificate`,
    },
    openGraph: {
      title: `Certificate of Participation - ${event.title} | MSC SRM AP`,
      description: `Official verified certificate of participation for ${event.title} issued by Microsoft Student Community SRM AP.`,
      url: `/events/${event.slug}/certificate`,
      images: [
        {
          url: event.image_url || '/hero_bg.png',
          width: 1200,
          height: 630,
          alt: `${event.title} Certificate`,
        },
      ],
    },
  };
}

export default async function CertificatePage({ params, searchParams }: CertificatePageProps) {
  const { slug } = await params;
  const { email } = await searchParams;

  const event = await getEventBySlug(slug);
  if (!event) {
    notFound();
  }

  return (
    <CertificateClient
      event={event}
      initialEmail={email || ''}
    />
  );
}
