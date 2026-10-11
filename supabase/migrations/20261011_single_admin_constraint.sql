-- ==============================================================================
-- SINGLE ADMINISTRATOR CONSTRAINT
--
-- Requirement: there can be only one administrator.
--
-- The application already rejects a second administrator with HTTP 409
-- (lib/single-admin.ts guards /api/admin/roles, /api/admin/elevate-role,
-- /api/admin/users and /api/admin/create-user). This migration is the database
-- backstop so that direct PostgREST / service-role / SQL writes cannot create a
-- second administrator either, and so that a member cannot promote themselves
-- from their own session (the `member_profiles_owner_update` RLS policy lets a
-- user update their own row, role column included).
--
-- HANDOVER: because every role-changing API route requires the caller to be an
-- administrator, the app can never swap one administrator for another. Handover
-- is therefore a SQL-only operation, done in a single transaction:
--
--   begin;
--     update public.member_profiles
--        set role = 'member'
--      where id = '<current-admin-uuid>';
--
--     update public.member_profiles
--        set role = 'admin'
--      where id = '<successor-uuid>';
--   commit;
--
-- The single-admin check below is a DEFERRED constraint trigger, so it is only
-- evaluated at COMMIT: the two statements above are validated together and the
-- database never stores two administrators.
--
-- Recovery: if the administrator row is ever removed or demoted directly, the
-- table is left with zero administrators; re-run the bootstrap procedure in
-- supabase/migrations/20260926_manual_admin_bootstrap.sql.
-- ==============================================================================

-- Enforces "at most one row with role = 'admin'" at COMMIT time.
-- SECURITY DEFINER so the count cannot be skewed by the caller's own RLS view
-- of member_profiles (a plain member can only see their own row).
create or replace function public.enforce_single_admin()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_admin_count integer;
begin
  select count(*) into v_admin_count from public.member_profiles where role = 'admin';

  if v_admin_count > 1 then
    raise exception
      'single_admin_violation: only one administrator is allowed (found %)', v_admin_count
      using errcode = '23514';
  end if;

  return null;
end;
$$;

drop trigger if exists member_profiles_single_admin on public.member_profiles;
create constraint trigger member_profiles_single_admin
  after insert or update or delete on public.member_profiles
  deferrable initially deferred
  for each row
  execute function public.enforce_single_admin();

-- Blocks a user from changing their own role from their own session. Role
-- changes must come from an administrator route (service role, so auth.uid()
-- is null here) or from SQL.
create or replace function public.protect_role_change()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() = old.id then
    raise exception
      'role_self_change_forbidden: your own role cannot be changed from your session'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists member_profiles_protect_role_change on public.member_profiles;
create trigger member_profiles_protect_role_change
  before update of role on public.member_profiles
  for each row
  execute function public.protect_role_change();
