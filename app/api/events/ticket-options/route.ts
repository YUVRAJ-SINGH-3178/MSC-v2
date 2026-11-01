import { NextResponse } from 'next/server';
import { isValidUUID } from '@/lib/security';
import { checkRateLimit, getClientIP } from '@/lib/ratelimit';
import { getAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const ip = getClientIP(req.headers);
    const limit = await checkRateLimit(`ticket_options_${ip}`, 'api');
    if (!limit.success) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });

    const eventId = new URL(req.url).searchParams.get('event_id');
    if (!isValidUUID(eventId || '')) return NextResponse.json({ error: 'Invalid event ID.' }, { status: 400 });

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('ticket_categories')
      .select('id, name, description, price_paise, early_bird_price_paise, early_bird_starts_at, early_bird_ends_at, sales_start_at, sales_end_at, sort_order')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    const now = Date.now();
    const categories = (data || []).filter((item: any) =>
      (!item.sales_start_at || new Date(item.sales_start_at).getTime() <= now) &&
      (!item.sales_end_at || new Date(item.sales_end_at).getTime() > now)
    ).map((item: any) => ({
      ...item,
      current_price_paise:
        item.early_bird_price_paise !== null &&
        (!item.early_bird_starts_at || new Date(item.early_bird_starts_at).getTime() <= now) &&
        (!item.early_bird_ends_at || new Date(item.early_bird_ends_at).getTime() > now)
          ? item.early_bird_price_paise
          : item.price_paise,
    }));

    return NextResponse.json({ success: true, categories }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[Ticket options error]:', error);
    return NextResponse.json({ error: 'Unable to load ticket categories.' }, { status: 500 });
  }
}
