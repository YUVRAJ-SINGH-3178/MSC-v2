import { NextRequest } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isValidEmail } from '@/lib/security';
import {
  auditLog,
  isUuid,
  noStoreJson,
  readJsonObject,
  requireAdmin,
  securityLog,
} from '@/lib/api-security';
import { guardRoleChange } from '@/lib/single-admin';

export const dynamic = 'force-dynamic';

const VALID_ROLES = ['admin', 'member'] as const;

/**
 * Provisions a member account.
 *
 * Ported from the older project's `admin/create-user` route. That version
 * inlined its own auth guard; this uses the shared `requireAdmin()` helper, so
 * the check cannot drift from the rest of the admin surface.
 *
 * Adds: the `full_name` / `department` / `year` profile fields the consolidated
 * `/api/admin/users` route already supported, UUID validation, and a strict
 * email check.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  try {
    const body = await readJsonObject(req);
    if (!body) return noStoreJson({ error: 'Invalid request body' }, 400);

    const { email, password, role, full_name, department, year } = body as {
      email?: string;
      password?: string;
      role?: string;
      full_name?: string;
      department?: string;
      year?: string;
    };

    if (!email || !isValidEmail(email)) {
      return noStoreJson({ error: 'Valid email is required' }, 400);
    }
    if (!password || password.length < 8) {
      return noStoreJson({ error: 'Password must be at least 8 characters' }, 400);
    }
    if (role && !VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
      return noStoreJson({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` }, 400);
    }

    const assignedRole = VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])
      ? role!
      : 'member';

    const supabase = getAdminClient();

    // One administrator only: refuse to provision a second admin account.
    const guard = await guardRoleChange(supabase, undefined, assignedRole);
    if (!guard.ok) return noStoreJson({ error: guard.message }, guard.status);

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: assignedRole },
    });

    if (error) {
      console.error('[Create-user] auth error:', error.message);
      return noStoreJson({ error: error.message }, 400);
    }

    if (data?.user) {
      const { error: profErr } = await supabase.from('member_profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: full_name || email.split('@')[0],
        role: assignedRole,
        department: department || 'CSE',
        year_of_study: year || '3rd Year',
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      });

      if (profErr) {
        // The auth user exists but the profile row failed. Surfaced rather than
        // swallowed, since a half-provisioned account cannot be onboarded.
        console.error('[Create-user] profile upsert failed:', profErr.message);
        return noStoreJson(
          { error: 'Account created but profile setup failed. Contact support.', user: data.user },
          500
        );
      }
    }

    auditLog('CREATE_USER', auth.user.id, `created ${email} as ${assignedRole}`);
    return noStoreJson({ success: true, user: data?.user });
  } catch (err: any) {
    console.error('[Create-user error]:', err);
    return noStoreJson({ error: 'Failed to create user' }, 500);
  }
}
