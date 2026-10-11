-- ==============================================================================
-- TWO ROLES ONLY: admin | member   (single script — run this whole file once)
--
-- The site has two portals — the member portal and the admin portal — so the
-- role column now holds exactly two values:
--
--   admin   -> /admin portal, role management, everything gated by requireAdmin
--   member  -> the default for every signed-up account (member portal only)
--
-- `core_member` and `user` no longer exist. Both become `member`, so every
-- former core member keeps an account but loses admin portal access (the admin
-- portal is now strictly `admin`: layout guard, requireAdmin(), RLS staff
-- policies, navbar).
--
-- WHY THE COMMIT IS IN THE MIDDLE OF THIS FILE
-- -------------------------------------------
-- `member_profiles.role` is the enum `user_role` (supabase/schema.sql declares
-- `text`; the live database is an enum). PostgreSQL has no way to delete enum
-- values, and it forbids *using* a value added in the same transaction:
--
--   ERROR: 22P02: invalid input value for enum user_role: "member"    <- no
--                                                            value added yet
--   ERROR: 55P04: unsafe use of new value of enum type user_role      <- value
--                                                  added but not committed
--
-- An SQL editor may wrap this whole script in a single transaction, which
-- would hit 55P04. The explicit `COMMIT;` below closes that transaction and
-- forces the new value to be committed before it is used, exactly as in the
-- PostgreSQL docs (protocol flow, "Multiple Statements in a Simple Query"):
-- explicit transaction control divides an implicit transaction block.
--
-- Expected noise, both harmless:
--   * "WARNING: there is no transaction in progress"  (editor autocommits,
--     so our COMMIT has nothing to close)
--   * a trailing COMMIT from the editor doing the same
--
-- Every statement below is idempotent — if a previous attempt partially
-- applied, just run it again.
--
-- If you instead get `type user_role does not exist`, your `role` column is
-- already `text` (fresh install from schema.sql): delete the `alter type` and
-- `commit;` lines and run the rest.
--
-- Apply order with the other migrations:
--   20260926_manual_admin_bootstrap.sql   (existing, manual)
--   20261011_single_admin_constraint.sql
--   20261011_two_roles_member_admin.sql   <- this file
-- ==============================================================================

-- 0. Give the enum the new label, and commit it immediately so the statements
--    below are allowed to use it.
alter type user_role add value if not exists 'member';
commit;

-- 1. Backfill: 'user' and 'core_member' both become 'member'.
--    (Runs before the check constraint is replaced, so old values are legal.)
update public.member_profiles
   set role = 'member'
 where role in ('user', 'core_member');

-- 2. Replace the role check constraint with the two allowed values. The
--    constraint name is discovered rather than assumed, so it works whether the
--    table came from schema.sql (a `text` column with the three-value check) or
--    from the enum-backed production schema (no check at all). The constraint
--    is what enforces the two-role rule, since enum labels cannot be deleted.
do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
      from pg_constraint
     where conrelid = 'public.member_profiles'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) like '%role%'
  loop
    execute format('alter table public.member_profiles drop constraint %I', v_constraint.conname);
  end loop;
end $$;

alter table public.member_profiles
  add constraint member_profiles_role_check check (role in ('admin', 'member'));

alter table public.member_profiles alter column role set default 'member';

-- 3. New signups are plain members.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_profiles (id, email, role, is_onboarded)
  values (new.id, new.email, 'member', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. RLS: every staff policy that used to include `core_member` is now admin
--    only. Policies are dropped and recreated so this works on an existing
--    database where they were created from the previous schema.sql.
drop policy if exists "member_profiles_owner_read" on public.member_profiles;
create policy "member_profiles_owner_read" on public.member_profiles
  for select using (auth.uid() = id or public.current_user_role() = 'admin');

drop policy if exists "events_public_read" on public.events;
create policy "events_public_read" on public.events
  for select using (is_published = true or public.current_user_role() = 'admin');

drop policy if exists "events_staff_write" on public.events;
create policy "events_staff_write" on public.events
  for all using (public.current_user_role() = 'admin');

drop policy if exists "registrations_read" on public.registrations;
create policy "registrations_read" on public.registrations
  for select using (
    auth.uid() = user_id or
    public.current_user_role() = 'admin'
  );

drop policy if exists "registrations_staff_update" on public.registrations;
create policy "registrations_staff_update" on public.registrations
  for update using (public.current_user_role() = 'admin');

drop policy if exists "teams_staff_write" on public.teams;
create policy "teams_staff_write" on public.teams
  for all using (public.current_user_role() = 'admin');

drop policy if exists "team_members_staff_write" on public.team_members;
create policy "team_members_staff_write" on public.team_members
  for all using (public.current_user_role() = 'admin');

drop policy if exists "gallery_items_staff_write" on public.gallery_items;
create policy "gallery_items_staff_write" on public.gallery_items
  for all using (public.current_user_role() = 'admin');

-- 5. Existing administrators are untouched: there can be only one
--    (20261011_single_admin_constraint.sql), and this migration never demotes
--    an `admin` row.

-- 6. Safety net: policies above are the canonical set. If the database also
--    carries older, differently-named policies that still grant `core_member`
--    rights, call that out loudly instead of leaving it invisible.
do $$
declare
  v_left integer;
begin
  select count(*) into v_left
    from pg_policies
   where schemaname = 'public'
     and (coalesce(qual, '') like '%core_member%'
          or coalesce(with_check, '') like '%core_member%');
  if v_left > 0 then
    raise notice 'ATTENTION: % policy definition(s) still mention core_member - list them with the query below', v_left;
  end if;
end $$;

-- ==============================================================================
-- VERIFY (run separately, after this script succeeds):
--
--   select enumlabel from pg_enum
--    where enumtypid = 'user_role'::regtype order by enumsortorder;
--     -> admin, core_member, user, member
--
--   select id, email, role from public.member_profiles order by role;
--     -> only 'admin' and 'member'
--
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--    where conrelid = 'public.member_profiles'::regclass;
--     -> includes member_profiles_role_check
--
--   select tablename, policyname, cmd, qual from pg_policies
--    where schemaname = 'public' order by tablename, policyname;
--     -> every qual says current_user_role() = 'admin'
--
--   select count(*) from pg_policies
--    where schemaname = 'public'
--      and (coalesce(qual, '') like '%core_member%'
--           or coalesce(with_check, '') like '%core_member%');
--     -> 0
-- ==============================================================================
