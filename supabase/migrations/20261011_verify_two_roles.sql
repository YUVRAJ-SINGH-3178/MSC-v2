-- ==============================================================================
-- VERIFICATION QUERIES for 20261011_two_roles_member_admin.sql
-- Run these AFTER the migration succeeds to confirm everything applied.
-- ==============================================================================

-- 1. Enum labels (should include 'member' alongside old labels)
select enumlabel from pg_enum
 where enumtypid = 'user_role'::regtype order by enumsortorder;
-- Expected: admin, core_member, user, member  (core_member/user are orphaned but stay in enum)

-- 2. Actual role values in the table (should be ONLY admin and member)
select id, email, role from public.member_profiles order by role;

-- 3. Check constraint is in place
select conname, pg_get_constraintdef(oid) as definition
  from pg_constraint
 where conrelid = 'public.member_profiles'::regclass
   and contype = 'c';

-- 4. Default for new sign-ups
select column_default from information_schema.columns
 where table_schema = 'public'
   and table_name = 'member_profiles'
   and column_name = 'role';

-- 5. All RLS policies (every staff policy must say current_user_role() = 'admin')
select tablename, policyname, cmd, qual
  from pg_policies
 where schemaname = 'public'
 order by tablename, policyname;

-- 6. No legacy policies still referencing core_member
select count(*) as legacy_policies_mentioning_core_member
  from pg_policies
 where schemaname = 'public'
   and (coalesce(qual, '') like '%core_member%'
        or coalesce(with_check, '') like '%core_member%');

-- 7. New sign-up path works (optional smoke test)
-- insert into public.member_profiles (id, email, role, is_onboarded)
--   values ('00000000-0000-0000-0000-000000000000', 'verify@test.in', 'member', false)
--   on conflict (id) do nothing;
-- select role from public.member_profiles where email = 'verify@test.in';
-- -> should return 'member'