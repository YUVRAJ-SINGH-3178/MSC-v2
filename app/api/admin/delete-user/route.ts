import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { auditLog, isUuid, noStoreJson, readJsonObject, requireAdmin } from '@/lib/api-security';
import { guardAdminRemoval } from '@/lib/single-admin';

export const dynamic = 'force-dynamic';

/**
 * Deletes a member account.
 *
 * Ported from the older project's `admin/delete-user`. Accepts the target id
 * from either the JSON body (`targetUserId`, the old contract) or a `user_id`
 * query parameter, so either calling convention works.
 *
 * The old version only removed the Auth user, leaving an orphaned
 * `member_profiles` row. This removes both.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await readJsonObject(req);
    const fromQuery = new URL(req.url).searchParams.get('user_id');
    const targetUserId =
      (body?.targetUserId as string | undefined) ||
      (body?.user_id as string | undefined) ||
      fromQuery;

    if (!targetUserId || !isUuid(targetUserId)) {
      return noStoreJson({ error: 'Invalid targetUserId' }, 400);
    }

    // Self-deletion guard, ported from the old version.
    if (targetUserId === auth.user.id) {
      return noStoreJson({ error: 'Cannot delete your own account' }, 400);
    }

    const supabase = getAdminClient();

    // One administrator only: the sole administrator account cannot be deleted.
    const guard = await guardAdminRemoval(supabase, targetUserId);
    if (!guard.ok) return noStoreJson({ error: guard.message }, guard.status);

    const { error } = await supabase.auth.admin.deleteUser(targetUserId);
    if (error) {
      console.error('[Delete-user] auth delete failed:', error.message);
      return noStoreJson({ error: error.message }, 400);
    }

    // member_profiles.id cascades from auth.users, so this is normally a no-op.
    // Done explicitly so the row is removed even if the cascade is missing.
    const { error: profErr } = await supabase
      .from('member_profiles')
      .delete()
      .eq('id', targetUserId);
    if (profErr) {
      console.warn('[Delete-user] profile cleanup warning:', profErr.message);
    }

    auditLog('DELETE_USER', auth.user.id, `deleted ${targetUserId}`);
    return noStoreJson({ success: true });
  } catch (err: any) {
    console.error('[Delete-user error]:', err);
    return noStoreJson({ error: 'Failed to delete user' }, 500);
  }
}

/** Convenience alias so this route matches the consolidated DELETE surface. */
export async function DELETE(req: NextRequest) {
  return POST(req);
}
