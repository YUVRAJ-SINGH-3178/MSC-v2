import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { auditLog, isUuid, noStoreJson, readJsonObject, requireAdmin } from '@/lib/api-security';
import { guardRoleChange } from '@/lib/single-admin';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'member'] as const;

/**
 * Changes a member's role.
 *
 * Ported from the older project's `admin/elevate-role`. Same semantics, but
 * using the shared guard, and accepting both the old field names
 * (`targetUserId` / `newRole`) and the consolidated route's (`user_id` / `role`).
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await readJsonObject(req);
    if (!body) return noStoreJson({ error: 'Invalid request body' }, 400);

    const targetUserId = (body.targetUserId ?? body.user_id) as string | undefined;
    const newRole = (body.newRole ?? body.role) as string | undefined;

    if (!targetUserId || !isUuid(targetUserId)) {
      return noStoreJson({ error: 'Invalid targetUserId' }, 400);
    }
    if (!newRole || !VALID_ROLES.includes(newRole as (typeof VALID_ROLES)[number])) {
      return noStoreJson(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        400
      );
    }

    // Self-demotion guard, ported from the old version.
    if (targetUserId === auth.user.id) {
      return noStoreJson({ error: 'Cannot change your own role' }, 400);
    }

    const supabase = getAdminClient();

    // One administrator only: refuse a second admin, and refuse demoting the
    // last one (lib/single-admin.ts mirrors the database constraint).
    const guard = await guardRoleChange(supabase, targetUserId, newRole);
    if (!guard.ok) return noStoreJson({ error: guard.message }, guard.status);

    const { error } = await supabase
      .from('member_profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUserId);

    if (error) {
      console.error('[Elevate-role] update failed:', error.message);
      return noStoreJson({ error: 'Failed to update role' }, 400);
    }

    auditLog('UPDATE_ROLE', auth.user.id, `set ${targetUserId} to ${newRole}`);
    return noStoreJson({ success: true, user_id: targetUserId, role: newRole });
  } catch (err: any) {
    console.error('[Elevate-role error]:', err);
    return noStoreJson({ error: 'Failed to update member role' }, 500);
  }
}
