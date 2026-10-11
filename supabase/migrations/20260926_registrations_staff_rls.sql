-- ==============================================================================
-- Migration: Add missing RLS policies for registrations table
-- Fixes: "new row violates row-level security policy for table 'registrations'"
-- ==============================================================================

-- 1. Allow admins and core members to insert registrations
drop policy if exists "registrations_staff_insert" on public.registrations;
create policy "registrations_staff_insert" on public.registrations
  for insert
  with check (public.current_user_role() in ('admin', 'core_member'));

-- 2. Allow admins and core members to delete registrations (if needed)
drop policy if exists "registrations_staff_delete" on public.registrations;
create policy "registrations_staff_delete" on public.registrations
  for delete
  using (public.current_user_role() in ('admin', 'core_member'));
