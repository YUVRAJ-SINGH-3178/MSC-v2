/**
 * Single-administrator invariant: there can be only one administrator.
 *
 * The database enforces the same rule (see
 * `supabase/migrations/20261011_single_admin_constraint.sql`), but routes should
 * reject the request with a clear 409 before writing rather than surfacing a
 * database error. Two rules:
 *
 * 1. Promoting someone to `admin` while another administrator exists is refused.
 * 2. The last administrator cannot be demoted or deleted through the API.
 *
 * Handover is a deliberate SQL-only operation, documented in the migration above.
 */

/** Minimal shape of the Supabase service-role client these guards need. */
type AdminClientLike = {
  from(table: string): any;
};

export type AdminConstraintResult =
  | { ok: true }
  | { ok: false; message: string; status: 409 | 500 };

/** Migration that documents the SQL-only handover procedure. */
const HANDOVER_DOC = 'supabase/migrations/20261011_single_admin_constraint.sql';

const singleAdminError = (current?: { email?: string | null }) =>
  `Only one administrator is allowed` +
  (current?.email ? `; ${current.email} is already the administrator.` : '.') +
  ` Handover is a SQL-only operation (see ${HANDOVER_DOC}).`;

const lastAdminError =
  'This is the only administrator account, so it cannot be demoted or deleted. ' +
  `Handover is a SQL-only operation (see ${HANDOVER_DOC}).`;

const fail = (message: string, status: 409 | 500): AdminConstraintResult => ({
  ok: false,
  message,
  status,
});

/** Accounts holding `admin`, or null when the lookup fails. */
async function listAdmins(
  supabase: AdminClientLike
): Promise<Array<{ id: string; email?: string | null }> | null> {
  try {
    const { data, error } = await supabase
      .from('member_profiles')
      .select('id, email')
      .eq('role', 'admin');

    if (error) {
      console.error('[single-admin] failed to list administrators:', error.message);
      return null;
    }

    return (data as Array<{ id: string; email?: string | null }> | null) ?? [];
  } catch (err: any) {
    console.error('[single-admin] failed to list administrators:', err?.message || err);
    return null;
  }
}

/**
 * Guards a role assignment of `nextRole` for `targetUserId`.
 *
 * Pass `undefined` as the target when provisioning a brand-new account. Returns
 * `{ ok: false, status: 409 }` when the change would break the one-administrator
 * rule, or `status: 500` when the rule could not be verified.
 */
export async function guardRoleChange(
  supabase: AdminClientLike,
  targetUserId: string | undefined,
  nextRole: string
): Promise<AdminConstraintResult> {
  // Provisioning a non-admin account can never break the rule.
  if (nextRole !== 'admin' && !targetUserId) return { ok: true };

  const admins = await listAdmins(supabase);
  if (admins === null) {
    return fail('Unable to verify the one-administrator rule. Please retry.', 500);
  }

  if (nextRole === 'admin') {
    const current = admins.find((admin) => admin.id !== targetUserId);
    if (current) return fail(singleAdminError(current), 409);
    return { ok: true };
  }

  // Nothing to check unless the target currently is the administrator.
  if (targetUserId && admins.length === 1 && admins[0].id === targetUserId) {
    return fail(lastAdminError, 409);
  }

  return { ok: true };
}

/**
 * Guards account deletion: the sole administrator cannot be removed, otherwise
 * nobody would be left to administer the community.
 */
export async function guardAdminRemoval(
  supabase: AdminClientLike,
  targetUserId: string
): Promise<AdminConstraintResult> {
  const admins = await listAdmins(supabase);
  if (admins === null) {
    return fail('Unable to verify the one-administrator rule. Please retry.', 500);
  }

  if (admins.length === 1 && admins[0].id === targetUserId) {
    return fail(lastAdminError, 409);
  }

  return { ok: true };
}
