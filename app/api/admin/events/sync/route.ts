import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { auditLog, isUuid, noStoreJson, readJsonObject, requireAdmin } from '@/lib/api-security';

export const dynamic = 'force-dynamic';

/** Upper bound on items accepted in a single batch. */
const MAX_BATCH = 500;

interface SyncItem {
  event_id?: string;
  hash?: string;
  type?: 'PRIMARY' | 'MEMBER';
  member_index?: number;
}

interface SyncError {
  index: number;
  hash?: string;
  error: string;
}

/**
 * Batched offline check-in sync.
 *
 * The QR turnstile's offline queue currently replays one HTTP request per
 * queued scan, which costs N rate-limit units and can apply only part of a
 * batch before failing. This endpoint accepts the whole queue at once.
 *
 * Item shape:
 *   { event_id, hash, type: 'PRIMARY' }                  -> mark registration
 *   { event_id, hash, type: 'MEMBER', member_index: n } -> mark one member
 *
 * Note: `app/admin/scanner` still uses the per-item endpoint; switching it to
 * this one is a client-side change.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await readJsonObject(req);
    if (!body) return noStoreJson({ error: 'Invalid request body' }, 400);

    const items = (body as { items?: unknown }).items;
    if (!Array.isArray(items) || items.length === 0) {
      return noStoreJson({ error: 'items must be a non-empty array' }, 400);
    }
    if (items.length > MAX_BATCH) {
      return noStoreJson({ error: `Batch too large (max ${MAX_BATCH})` }, 400);
    }

    const supabase = getAdminClient();
    let processed = 0;
    const errors: SyncError[] = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index] as SyncItem;
      const { event_id, hash, type, member_index } = item || {};

      if (!hash || !isUuid(hash) || !event_id || !isUuid(event_id)) {
        errors.push({ index, hash, error: 'Missing or invalid hash/event_id' });
        continue;
      }

      const { data: reg, error: fetchError } = await supabase
        .from('registrations')
        .select('*')
        .eq('hash_payload', hash)
        .eq('event_id', event_id)
        .maybeSingle();

      if (fetchError || !reg) {
        errors.push({ index, hash, error: 'Registration not found' });
        continue;
      }

      const now = new Date().toISOString();
      let updatePayload: Record<string, unknown>;

      if (type === 'PRIMARY' || type === undefined) {
        updatePayload = { checked_in: true, updated_at: now };
      } else if (type === 'MEMBER') {
        const members: Array<Record<string, unknown>> = Array.isArray(reg.team_data?.members)
          ? reg.team_data.members
          : [];

        if (typeof member_index !== 'number' || !members[member_index]) {
          errors.push({ index, hash, error: 'Member index out of bounds' });
          continue;
        }

        members[member_index].checked_in = true;
        updatePayload = {
          team_data: { ...reg.team_data, members },
          updated_at: now,
        };
      } else {
        errors.push({ index, hash, error: 'Invalid type' });
        continue;
      }

      const { error: updateError } = await supabase
        .from('registrations')
        .update(updatePayload)
        .eq('id', reg.id);

      if (updateError) {
        errors.push({ index, hash, error: 'Update failed' });
      } else {
        processed++;
      }
    }

    auditLog('BATCH_CHECKIN_SYNC', auth.user.id, `synced ${processed}/${items.length}`);

    return noStoreJson({ success: true, processed, errors });
  } catch (err: any) {
    console.error('Sync Error:', err);
    return noStoreJson({ error: 'Sync failed' }, 500);
  }
}
