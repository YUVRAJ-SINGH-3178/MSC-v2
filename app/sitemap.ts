import type { MetadataRoute } from 'next';
import { getAdminClient } from '@/lib/supabase/admin';
import { FALLBACK_EVENTS, EventItem } from '@/lib/data/mock-fallback';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mscsrmap.xyz';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const currentDate = new Date().toISOString();

  // Core static public routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/team`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gallery`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  // Fetch dynamic published events from database
  let eventsList: EventItem[] = FALLBACK_EVENTS;
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('events')
      .select('slug, updated_at, date_start, is_published, form_requirements')
      .eq('is_published', true);

    if (!error && data && data.length > 0) {
      eventsList = data as any;
    }
  } catch (err) {
    console.warn('[sitemap] Failed to fetch events from Supabase, using fallback list:', err);
  }

  const eventRoutes: MetadataRoute.Sitemap = [];

  eventsList.forEach((ev) => {
    if (!ev.slug) return;
    const lastMod = (ev as any).updated_at || ev.date_start || currentDate;

    // Main event page
    eventRoutes.push({
      url: `${BASE_URL}/events/${ev.slug}`,
      lastModified: lastMod,
      changeFrequency: 'weekly',
      priority: 0.85,
    });

    // Certificate verification page (if certificates enabled)
    if (ev.form_requirements?.provide_certificates) {
      eventRoutes.push({
        url: `${BASE_URL}/events/${ev.slug}/certificate`,
        lastModified: lastMod,
        changeFrequency: 'monthly',
        priority: 0.6,
      });
    }
  });

  return [...staticRoutes, ...eventRoutes];
}
