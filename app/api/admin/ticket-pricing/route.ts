import { getAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, noStoreJson } from '@/lib/api-security';
import { checkRateLimit } from '@/lib/ratelimit';
import { isValidUUID } from '@/lib/security';

export const dynamic = 'force-dynamic';

const validDate = (value: unknown) =>
  value === null || value === undefined || (typeof value === 'string' && !Number.isNaN(Date.parse(value)));

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const limit = await checkRateLimit(auth.user.id, 'api');
    if (!limit.success) return noStoreJson({ error: 'Rate limit exceeded.' }, 429);
    const eventId = new URL(req.url).searchParams.get('event_id');
    if (!isValidUUID(eventId || '')) return noStoreJson({ error: 'Valid event_id is required.' }, 400);

    const supabase = getAdminClient();
    const [categories, promos] = await Promise.all([
      supabase.from('ticket_categories').select('*').eq('event_id', eventId).order('sort_order'),
      supabase.from('promo_codes').select('id, event_id, code, discount_type, discount_value, max_discount_paise, min_order_paise, max_redemptions, starts_at, ends_at, is_active, created_at').eq('event_id', eventId).order('created_at', { ascending: false }),
    ]);
    if (categories.error) throw categories.error;
    if (promos.error) throw promos.error;
    return noStoreJson({ success: true, categories: categories.data || [], promo_codes: promos.data || [] });
  } catch (error: any) {
    console.error('[Admin ticket pricing GET]:', error);
    return noStoreJson({ error: 'Unable to load ticket pricing.' }, 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const limit = await checkRateLimit(auth.user.id, 'api');
    if (!limit.success) return noStoreJson({ error: 'Rate limit exceeded.' }, 429);
    const body = await req.json();
    const supabase = getAdminClient();

    if (body.kind === 'category') {
      if (!isValidUUID(body.event_id) || typeof body.name !== 'string' || !body.name.trim() ||
          !Number.isSafeInteger(body.price_paise) || body.price_paise < 0 ||
          (body.early_bird_price_paise != null && (!Number.isSafeInteger(body.early_bird_price_paise) || body.early_bird_price_paise < 0 || body.early_bird_price_paise > body.price_paise)) ||
          !validDate(body.early_bird_starts_at) || !validDate(body.early_bird_ends_at) ||
          !validDate(body.sales_start_at) || !validDate(body.sales_end_at) ||
          (body.capacity != null && (!Number.isSafeInteger(body.capacity) || body.capacity < 1))) {
        return noStoreJson({ error: 'Invalid ticket category details. Prices must be supplied in paise.' }, 400);
      }
      const { data, error } = await supabase.from('ticket_categories').insert({
        event_id: body.event_id,
        name: body.name.trim().slice(0, 80),
        description: typeof body.description === 'string' ? body.description.trim().slice(0, 500) : null,
        price_paise: body.price_paise,
        early_bird_price_paise: body.early_bird_price_paise ?? null,
        early_bird_starts_at: body.early_bird_starts_at || null,
        early_bird_ends_at: body.early_bird_ends_at || null,
        sales_start_at: body.sales_start_at || null,
        sales_end_at: body.sales_end_at || null,
        capacity: body.capacity ?? null,
        sort_order: Number.isSafeInteger(body.sort_order) ? body.sort_order : 0,
        is_active: body.is_active !== false,
      }).select().single();
      if (error) throw error;
      return noStoreJson({ success: true, category: data }, 201);
    }

    if (body.kind === 'promo') {
      const validDiscount = body.discount_type === 'percentage'
        ? Number.isSafeInteger(body.discount_value) && body.discount_value >= 1 && body.discount_value <= 100
        : body.discount_type === 'fixed' && Number.isSafeInteger(body.discount_value) && body.discount_value > 0;
      if (!isValidUUID(body.event_id) || typeof body.code !== 'string' || !/^[A-Za-z0-9_-]{3,32}$/.test(body.code.trim()) ||
          !validDiscount || !validDate(body.starts_at) || !validDate(body.ends_at) ||
          (body.max_discount_paise != null && (!Number.isSafeInteger(body.max_discount_paise) || body.max_discount_paise < 1)) ||
          (body.min_order_paise != null && (!Number.isSafeInteger(body.min_order_paise) || body.min_order_paise < 0)) ||
          (body.max_redemptions != null && (!Number.isSafeInteger(body.max_redemptions) || body.max_redemptions < 1))) {
        return noStoreJson({ error: 'Invalid promo code details. Fixed discounts and order amounts must be supplied in paise.' }, 400);
      }
      const { data, error } = await supabase.from('promo_codes').insert({
        event_id: body.event_id,
        code: body.code.trim().toUpperCase(),
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        max_discount_paise: body.max_discount_paise ?? null,
        min_order_paise: body.min_order_paise ?? 0,
        max_redemptions: body.max_redemptions ?? null,
        starts_at: body.starts_at || null,
        ends_at: body.ends_at || null,
        is_active: body.is_active !== false,
      }).select('id, event_id, code, discount_type, discount_value, max_discount_paise, min_order_paise, max_redemptions, starts_at, ends_at, is_active').single();
      if (error) throw error;
      return noStoreJson({ success: true, promo_code: data }, 201);
    }

    return noStoreJson({ error: 'kind must be category or promo.' }, 400);
  } catch (error: any) {
    console.error('[Admin ticket pricing POST]:', error);
    return noStoreJson({ error: error.code === '23505' ? 'A promo code with this name already exists for the event.' : 'Unable to save ticket pricing.' }, 500);
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const limit = await checkRateLimit(auth.user.id, 'api');
    if (!limit.success) return noStoreJson({ error: 'Rate limit exceeded.' }, 429);
    const body = await req.json();
    if (!isValidUUID(body.id) || !['category', 'promo'].includes(body.kind)) {
      return noStoreJson({ error: 'A valid id and kind are required.' }, 400);
    }

    const supabase = getAdminClient();
    const table = body.kind === 'category' ? 'ticket_categories' : 'promo_codes';
    const allowed = body.kind === 'category'
      ? ['name', 'description', 'price_paise', 'early_bird_price_paise', 'early_bird_starts_at', 'early_bird_ends_at', 'sales_start_at', 'sales_end_at', 'capacity', 'sort_order', 'is_active']
      : ['code', 'discount_type', 'discount_value', 'max_discount_paise', 'min_order_paise', 'max_redemptions', 'starts_at', 'ends_at', 'is_active'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) if (key in body) updates[key] = body[key];
    if (Object.keys(updates).length === 0) return noStoreJson({ error: 'No editable fields supplied.' }, 400);
    if ('price_paise' in updates && (!Number.isSafeInteger(updates.price_paise) || Number(updates.price_paise) < 0)) return noStoreJson({ error: 'Invalid price_paise.' }, 400);
    if ('discount_type' in updates && !['percentage', 'fixed'].includes(String(updates.discount_type))) return noStoreJson({ error: 'Invalid discount_type.' }, 400);
    if ('discount_value' in updates && (!Number.isSafeInteger(updates.discount_value) || Number(updates.discount_value) <= 0)) return noStoreJson({ error: 'Invalid discount_value.' }, 400);
    if ('code' in updates) updates.code = String(updates.code).trim().toUpperCase();
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase.from(table).update(updates).eq('id', body.id).select().single();
    if (error) throw error;
    return noStoreJson({ success: true, item: data });
  } catch (error: any) {
    console.error('[Admin ticket pricing PATCH]:', error);
    return noStoreJson({ error: 'Unable to update ticket pricing.' }, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const limit = await checkRateLimit(auth.user.id, 'api');
    if (!limit.success) return noStoreJson({ error: 'Rate limit exceeded.' }, 429);
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const kind = searchParams.get('kind');
    if (!isValidUUID(id || '') || !['category', 'promo'].includes(kind || '')) return noStoreJson({ error: 'Valid id and kind are required.' }, 400);
    const table = kind === 'category' ? 'ticket_categories' : 'promo_codes';
    const { error } = await getAdminClient().from(table).update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
    return noStoreJson({ success: true });
  } catch (error: any) {
    console.error('[Admin ticket pricing DELETE]:', error);
    return noStoreJson({ error: 'Unable to deactivate ticket pricing.' }, 500);
  }
}
