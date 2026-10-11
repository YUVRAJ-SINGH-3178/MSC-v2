-- =============================================================================
-- MSC SRMAP — Full Supabase / PostgreSQL schema (two-role edition)
-- Run this once in a NEW Supabase project's SQL Editor.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. member_profiles  (1:1 with auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.member_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  registration_number text,
  phone_number text,
  department text,
  year_of_study text,
  bio text,
  profile_picture_url text,
  is_onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_profiles_role_idx on public.member_profiles(role);
create index if not exists member_profiles_email_idx on public.member_profiles(email);

-- Auto-create profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.member_profiles (id, email, role, is_onboarded)
  values (
    new.id,
    new.email,
    'member',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. events
-- -----------------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  location text,
  type text,                              -- hackathon | workshop | event | ...
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed')),
  date_start timestamptz,
  date_end timestamptz,
  image_url text,
  banner_url text,
  registration_open boolean not null default false,
  show_opening_soon boolean not null default false,  -- show "Opening Soon" teaser page when registration_open is false
  is_published boolean not null default true,
  max_capacity integer,
  form_requirements jsonb not null default '{}'::jsonb,
  -- form_requirements keys used by the app:
  --   req_reg_num, req_branch, req_spec, allow_teams, allow_external_students,
  --   max_team_size, provide_certificates, certificate_html,
  --   event_pricing ('free'|'paid'), charge_type ('per_person'|'per_team'),
  --   registration_fee, agenda[], speakers[]
  certificate_html text,
  gallery_urls text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_events_slug on public.events(slug);
create index if not exists events_status_date_idx on public.events(status, date_start desc);
create index if not exists events_published_idx on public.events(is_published);

-- -----------------------------------------------------------------------------
-- 3. registrations
-- -----------------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  lead_email text not null,
  hash_payload uuid not null default gen_random_uuid(),
  form_data jsonb not null default '{}'::jsonb,
  -- form_data keys: fullName, email, year, regNum, branch, specialization,
  --   collegeName, city, payment_data, certificate_type ('none'|'participation'|'winner'|'runner_up')
  team_data jsonb,
  -- team_data keys: team_id, team_name / teamName, members[], team_lead_index / leadIndex
  -- members[]: { fullName, email, year, regNum, branch, checked_in }
  checked_in boolean not null default false,
  status text not null default 'confirmed'
    check (status in ('pending_payment', 'confirmed', 'waitlisted', 'cancelled')),
  idempotency_key uuid,
  reservation_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists registrations_hash_payload_unique
  on public.registrations(hash_payload);
create unique index if not exists registrations_event_lead_email_unique
  on public.registrations(event_id, lower(lead_email));
create unique index if not exists registrations_event_user_unique
  on public.registrations(event_id, user_id) where user_id is not null;
create unique index if not exists registrations_event_idempotency_unique
  on public.registrations(event_id, user_id, idempotency_key)
  where user_id is not null and idempotency_key is not null;
create index if not exists registrations_event_status_created_idx
  on public.registrations(event_id, status, created_at desc);
create index if not exists idx_registrations_hash_payload
  on public.registrations(hash_payload);
create index if not exists registrations_hash_payload_idx
  on public.registrations(hash_payload);

-- -----------------------------------------------------------------------------
-- 4. teams  (matchmaking / open teams)
-- -----------------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  registration_id uuid references public.registrations(id) on delete cascade,
  team_name text not null,
  leader_name text,
  leader_email text,
  leader_year text,
  leader_branch text,
  looking_for_members boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teams_event_looking_idx
  on public.teams(event_id, looking_for_members);
create index if not exists teams_registration_id_idx
  on public.teams(registration_id);

-- -----------------------------------------------------------------------------
-- 5. team_members  (public /team page roster)
-- -----------------------------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  tier text default 'member'
    check (tier is null or tier in ('chief', 'president', 'board', 'lead', 'member')),
  category text default 'team',
  email text,
  linkedin_url text,
  github_url text,
  twitter_url text,
  instagram_url text,
  portfolio_url text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_tier_idx on public.team_members(tier);

-- -----------------------------------------------------------------------------
-- 6. gallery_items
-- -----------------------------------------------------------------------------
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  title text,
  category text default 'misc',
  image_url text not null,
  alt_text text,
  created_at timestamptz not null default now()
);

create index if not exists gallery_items_created_idx
  on public.gallery_items(created_at desc);
create index if not exists gallery_items_category_idx
  on public.gallery_items(category);

-- -----------------------------------------------------------------------------
-- 7. password_reset_requests
-- -----------------------------------------------------------------------------
create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  new_password text not null,           -- encrypted blob from app (utils/security.ts)
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists password_reset_requests_status_idx
  on public.password_reset_requests(status, created_at desc);

-- -----------------------------------------------------------------------------
-- 8. payments + payment_orders  (Razorpay hardening)
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete set null,
  registration_id uuid references public.registrations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  razorpay_order_id text,
  razorpay_payment_id text unique,
  amount integer not null,
  charge_type text,
  payer_email text,
  status text not null default 'pending',
  gateway_payload jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists payments_razorpay_payment_id_unique
  on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;
create unique index if not exists payments_razorpay_order_id_unique
  on public.payments(razorpay_order_id) where razorpay_order_id is not null;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  registration_id uuid not null references public.registrations(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null,
  razorpay_order_id text unique,
  amount integer not null check (amount > 0 and amount <= 10000000),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'creating'
    check (status in ('creating', 'created', 'paid', 'failed', 'cancelled')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id, idempotency_key)
);

create index if not exists payment_orders_order_id_idx
  on public.payment_orders(razorpay_order_id);
create index if not exists payment_orders_expiry_idx
  on public.payment_orders(status, expires_at);

-- -----------------------------------------------------------------------------
-- 9. RPC helpers (authenticated paid registration path)
-- -----------------------------------------------------------------------------
create or replace function public.register_for_event(
  p_event_id uuid,
  p_idempotency_key uuid,
  p_form_data jsonb,
  p_team_data jsonb,
  p_hash_payload uuid
) returns table (registration_id uuid, registration_status text, payment_required boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_existing public.registrations%rowtype;
  v_registered_count integer;
  v_pricing text;
  v_status text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_event from public.events where id = p_event_id for update;
  if not found or not coalesce(v_event.registration_open, false) or v_event.status = 'completed' then
    raise exception 'registration is closed or this event is not available';
  end if;

  select * into v_existing
    from public.registrations
   where event_id = p_event_id and user_id = auth.uid()
   limit 1;
  if found then
    if v_existing.idempotency_key = p_idempotency_key then
      return query select v_existing.id, v_existing.status, (v_existing.status = 'pending_payment');
      return;
    end if;
    raise exception 'already registered for this event';
  end if;

  select count(*) into v_registered_count
    from public.registrations
   where event_id = p_event_id
     and status in ('confirmed', 'pending_payment')
     and (status <> 'pending_payment' or reservation_expires_at > now());

  if v_event.max_capacity is not null and v_registered_count >= v_event.max_capacity then
    v_status := 'waitlisted';
  else
    v_pricing := coalesce(v_event.form_requirements->>'event_pricing', 'free');
    v_status := case when v_pricing = 'paid' then 'pending_payment' else 'confirmed' end;
  end if;

  insert into public.registrations (
    event_id, user_id, lead_email, form_data, team_data, hash_payload,
    status, idempotency_key, reservation_expires_at
  ) values (
    p_event_id,
    auth.uid(),
    coalesce(auth.jwt()->>'email', ''),
    p_form_data,
    p_team_data,
    p_hash_payload,
    v_status,
    p_idempotency_key,
    case when v_status = 'pending_payment' then now() + interval '15 minutes' else null end
  )
  returning id into registration_id;

  registration_status := v_status;
  payment_required := v_status = 'pending_payment';
  return next;
end;
$$;

revoke all on function public.register_for_event(uuid, uuid, jsonb, jsonb, uuid) from public;
grant execute on function public.register_for_event(uuid, uuid, jsonb, jsonb, uuid) to authenticated;

create or replace function public.confirm_captured_payment(
  p_razorpay_order_id text,
  p_razorpay_payment_id text,
  p_amount integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
begin
  select * into v_order
    from public.payment_orders
   where razorpay_order_id = p_razorpay_order_id
   for update;
  if not found then raise exception 'payment order not found'; end if;
  if v_order.amount <> p_amount or v_order.currency <> 'INR' then
    raise exception 'payment amount mismatch';
  end if;
  if v_order.status = 'paid' then return; end if;
  if v_order.status not in ('created', 'creating') then
    raise exception 'payment order is not payable';
  end if;

  insert into public.payments (
    event_id, registration_id, user_id, razorpay_order_id, razorpay_payment_id,
    amount, charge_type, payer_email, status, verified_at
  )
  select
    v_order.event_id, v_order.registration_id, v_order.user_id,
    p_razorpay_order_id, p_razorpay_payment_id, v_order.amount,
    'registration', u.email, 'paid', now()
  from auth.users u
  where u.id = v_order.user_id
  on conflict (razorpay_payment_id) do nothing;

  update public.payment_orders
     set status = 'paid', updated_at = now()
   where id = v_order.id;

  update public.registrations
     set status = 'confirmed', reservation_expires_at = null
   where id = v_order.registration_id and status = 'pending_payment';
end;
$$;

revoke all on function public.confirm_captured_payment(text, text, integer) from public;
grant execute on function public.confirm_captured_payment(text, text, integer) to service_role;

create or replace function public.expire_payment_reservations() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  update public.registrations
     set status = 'cancelled'
   where status = 'pending_payment'
     and reservation_expires_at <= now();
  get diagnostics v_count = row_count;

  update public.payment_orders
     set status = 'cancelled', updated_at = now()
   where status in ('creating', 'created')
     and expires_at <= now();

  return v_count;
end;
$$;

revoke all on function public.expire_payment_reservations() from public;
grant execute on function public.expire_payment_reservations() to service_role;

-- -----------------------------------------------------------------------------
-- 10. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.member_profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.gallery_items enable row level security;
alter table public.password_reset_requests enable row level security;
alter table public.payments enable row level security;
alter table public.payment_orders enable row level security;

-- Payment tables: service-role only (no anon/authenticated grants)
revoke all on public.payment_orders from anon, authenticated;
revoke all on public.payments from anon, authenticated;

-- member_profiles
drop policy if exists "Profiles are viewable by owner" on public.member_profiles;
create policy "Profiles are viewable by owner"
  on public.member_profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.member_profiles;
create policy "Profiles are updatable by owner"
  on public.member_profiles for update
  using (auth.uid() = id);

-- Avoid recursive RLS on member_profiles by using a security-definer helper
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.member_profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists "Admins can view all profiles" on public.member_profiles;
create policy "Admins can view all profiles"
  on public.member_profiles for select
  using (public.current_user_role() = 'admin');

drop policy if exists "Admins can update all profiles" on public.member_profiles;
create policy "Admins can update all profiles"
  on public.member_profiles for update
  using (public.current_user_role() = 'admin');

-- events: public read of published; admins manage
drop policy if exists "Public can read published events" on public.events;
create policy "Public can read published events"
  on public.events for select
  using (is_published = true);

drop policy if exists "Authenticated staff can manage events" on public.events;
create policy "Authenticated staff can manage events"
  on public.events for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- registrations: owners + staff; public inserts go through service-role server actions
drop policy if exists "Owners can read own registrations" on public.registrations;
create policy "Owners can read own registrations"
  on public.registrations for select
  using (
    auth.uid() = user_id
    or public.current_user_role() = 'admin'
  );

drop policy if exists "Staff can update registrations" on public.registrations;
create policy "Staff can update registrations"
  on public.registrations for update
  using (public.current_user_role() = 'admin');

-- teams: public read (app filters looking_for_members); staff manage
drop policy if exists "Public can read teams" on public.teams;
create policy "Public can read teams"
  on public.teams for select
  using (true);

drop policy if exists "Staff can manage teams" on public.teams;
create policy "Staff can manage teams"
  on public.teams for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- team_members + gallery: public read
drop policy if exists "Public can read team members" on public.team_members;
create policy "Public can read team members"
  on public.team_members for select
  using (true);

drop policy if exists "Staff can manage team members" on public.team_members;
create policy "Staff can manage team members"
  on public.team_members for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists "Public can read gallery items" on public.gallery_items;
create policy "Public can read gallery items"
  on public.gallery_items for select
  using (true);

drop policy if exists "Staff can manage gallery items" on public.gallery_items;
create policy "Staff can manage gallery items"
  on public.gallery_items for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- password reset requests: admins only (inserts via service role)
drop policy if exists "Admins can read password reset requests" on public.password_reset_requests;
create policy "Admins can read password reset requests"
  on public.password_reset_requests for select
  using (public.current_user_role() = 'admin');

drop policy if exists "Admins can update password reset requests" on public.password_reset_requests;
create policy "Admins can update password reset requests"
  on public.password_reset_requests for update
  using (public.current_user_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 11. Realtime (QR scanner + matchmaking + admin registrations table)
-- -----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.registrations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.teams;
  exception when duplicate_object then null;
  end;
end $$;

-- -----------------------------------------------------------------------------
-- 12. Storage buckets
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('images', 'images', true),
  ('avatars', 'avatars', true),
  ('webpage', 'webpage', true)
on conflict (id) do nothing;

-- Public read
drop policy if exists "Public read images" on storage.objects;
create policy "Public read images"
  on storage.objects for select
  using (bucket_id in ('images', 'avatars', 'webpage'));

-- Authenticated staff can upload/update/delete images + webpage
drop policy if exists "Staff write images" on storage.objects;
create policy "Staff write images"
  on storage.objects for all
  using (
    bucket_id in ('images', 'webpage')
    and exists (
      select 1 from public.member_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    bucket_id in ('images', 'webpage')
    and exists (
      select 1 from public.member_profiles
      where id = auth.uid() and role = 'admin'
    )
  );
create policy "registrations_staff_insert" on public.registrations
  for insert with check (public.current_user_role() in ('admin', 'core_member'));

create policy "registrations_staff_update" on public.registrations
  for update using (public.current_user_role() in ('admin', 'core_member'));

create policy "registrations_staff_delete" on public.registrations
  for delete using (public.current_user_role() in ('admin', 'core_member'));

-- 4. teams
create policy "teams_public_read" on public.teams
  for select using (true);

create policy "teams_staff_write" on public.teams
  for all using (public.current_user_role() in ('admin', 'core_member'));

-- 5. team_members
create policy "team_members_public_read" on public.team_members
  for select using (true);

create policy "team_members_staff_write" on public.team_members
  for all using (public.current_user_role() in ('admin', 'core_member'));

-- 6. gallery_items
create policy "gallery_items_public_read" on public.gallery_items
  for select using (true);

create policy "gallery_items_staff_write" on public.gallery_items
  for all using (public.current_user_role() in ('admin', 'core_member'));

-- 7. password_reset_requests
create policy "password_reset_requests_admin_read" on public.password_reset_requests
  for select using (public.current_user_role() = 'admin');

create policy "password_reset_requests_admin_update" on public.password_reset_requests
  for update using (public.current_user_role() = 'admin');

-- 8. payments & payment_orders: Revoke all from anon & authenticated
revoke all on public.payments from anon, authenticated;
revoke all on public.payment_orders from anon, authenticated;


-- Users manage their own avatars (path starts with their user id)
drop policy if exists "Users manage own avatars" on storage.objects;
create policy "Users manage own avatars"
  on storage.objects for all
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- -----------------------------------------------------------------------------
-- 13. Bootstrap first admin (OPTIONAL — edit email then uncomment)
-- -----------------------------------------------------------------------------
-- After you create a user in Authentication → Users, run:
--
-- update public.member_profiles
--    set role = 'admin', is_onboarded = true
--  where email = 'you@srmap.edu.in';

-- =============================================================================
-- Done.
-- Tables: member_profiles, events, registrations, teams, team_members,
--         gallery_items, password_reset_requests, payments, payment_orders
-- Storage: images, avatars, webpage
-- =============================================================================