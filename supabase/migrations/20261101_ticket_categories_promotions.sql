-- Ticket categories, early-bird pricing, promo codes, and checkout reservations.
-- Apply after 20261101_payment_hardening.sql and before deploying the matching API code.

create table if not exists public.ticket_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_paise integer not null check (price_paise >= 0 and price_paise <= 10000000),
  early_bird_price_paise integer check (early_bird_price_paise is null or (early_bird_price_paise >= 0 and early_bird_price_paise <= price_paise)),
  early_bird_starts_at timestamptz,
  early_bird_ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (early_bird_ends_at is null or early_bird_starts_at is null or early_bird_ends_at > early_bird_starts_at),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create index if not exists ticket_categories_event_active_idx
  on public.ticket_categories(event_id, is_active, sort_order);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null,
  discount_type text not null check (discount_type in ('percentage','fixed')),
  discount_value integer not null check (discount_value > 0),
  max_discount_paise integer check (max_discount_paise is null or max_discount_paise > 0),
  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (discount_type <> 'percentage' or discount_value <= 100),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create unique index if not exists promo_codes_event_code_unique
  on public.promo_codes(event_id, upper(code));

create table if not exists public.ticket_category_reservations (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  ticket_category_id uuid not null references public.ticket_categories(id) on delete restrict,
  status text not null default 'reserved' check (status in ('reserved','redeemed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ticket_category_reservations_category_idx
  on public.ticket_category_reservations(ticket_category_id, status, expires_at);

create table if not exists public.promo_code_reservations (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  promo_code_id uuid not null references public.promo_codes(id) on delete restrict,
  status text not null default 'reserved' check (status in ('reserved','redeemed')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promo_code_reservations_promo_idx
  on public.promo_code_reservations(promo_code_id, status, expires_at);

alter table public.ticket_categories enable row level security;
alter table public.promo_codes enable row level security;
alter table public.ticket_category_reservations enable row level security;
alter table public.promo_code_reservations enable row level security;

create policy "ticket_categories_public_active_read" on public.ticket_categories
  for select using (is_active = true);
create policy "ticket_categories_admin_all" on public.ticket_categories
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "promo_codes_admin_all" on public.promo_codes
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

revoke all on public.ticket_category_reservations from anon, authenticated;
revoke all on public.promo_code_reservations from anon, authenticated;
revoke all on public.ticket_categories from anon, authenticated;
revoke all on public.promo_codes from anon, authenticated;
grant select on public.ticket_categories to anon, authenticated;

create or replace function public.reserve_ticket_and_promo(
  p_registration_id uuid,
  p_event_id uuid,
  p_ticket_category_id uuid,
  p_promo_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.registrations%rowtype;
  v_event public.events%rowtype;
  v_category public.ticket_categories%rowtype;
  v_promo public.promo_codes%rowtype;
  v_base_amount integer;
  v_discount integer := 0;
  v_final_amount integer;
  v_now timestamptz := now();
  v_code text := upper(trim(coalesce(p_promo_code, '')));
  v_used integer;
  v_existing_promo uuid;
  v_category_name text := 'General Admission';
  v_category_id uuid;
  v_promo_id uuid;
  v_promo_code text;
begin
  select * into v_registration
  from public.registrations
  where id = p_registration_id and event_id = p_event_id
  for update;

  if not found or v_registration.status <> 'pending_payment' then
    return jsonb_build_object('success', false, 'error', 'Registration is not awaiting payment.');
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'Event not found.');
  end if;

  if p_ticket_category_id is not null then
    select * into v_category
    from public.ticket_categories
    where id = p_ticket_category_id and event_id = p_event_id and is_active = true
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Selected ticket category is unavailable.');
    end if;
    if v_category.sales_start_at is not null and v_now < v_category.sales_start_at then
      return jsonb_build_object('success', false, 'error', 'Ticket sales have not started for this category.');
    end if;
    if v_category.sales_end_at is not null and v_now >= v_category.sales_end_at then
      return jsonb_build_object('success', false, 'error', 'Ticket sales have ended for this category.');
    end if;

    select count(*) into v_used
    from public.ticket_category_reservations
    where ticket_category_id = v_category.id
      and (status = 'redeemed' or (status = 'reserved' and expires_at > v_now))
      and registration_id <> p_registration_id;

    if v_category.capacity is not null and v_used >= v_category.capacity then
      return jsonb_build_object('success', false, 'error', 'This ticket category is sold out.');
    end if;

    v_base_amount := case
      when v_category.early_bird_price_paise is not null
       and (v_category.early_bird_starts_at is null or v_now >= v_category.early_bird_starts_at)
       and (v_category.early_bird_ends_at is null or v_now < v_category.early_bird_ends_at)
      then v_category.early_bird_price_paise
      else v_category.price_paise
    end;
    v_category_name := v_category.name;
    v_category_id := v_category.id;
  else
    if exists (
      select 1 from public.ticket_categories
      where event_id = p_event_id and is_active = true
    ) then
      return jsonb_build_object('success', false, 'error', 'Select a ticket category to continue.');
    end if;
    v_base_amount := case
      when coalesce(v_event.form_requirements->>'registration_fee', '') ~ '^[0-9]+

  if v_base_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'A valid paid ticket price is not configured.');
  end if;

  if v_code <> '' then
    select * into v_promo
    from public.promo_codes
    where event_id = p_event_id and upper(code) = v_code and is_active = true
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Promo code is invalid or inactive.');
    end if;
    if v_promo.starts_at is not null and v_now < v_promo.starts_at then
      return jsonb_build_object('success', false, 'error', 'Promo code is not active yet.');
    end if;
    if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
      return jsonb_build_object('success', false, 'error', 'Promo code has expired.');
    end if;
    if v_base_amount < v_promo.min_order_paise then
      return jsonb_build_object('success', false, 'error', 'Order does not meet the minimum amount for this promo code.');
    end if;

    select count(*) into v_used
    from public.promo_code_reservations
    where promo_code_id = v_promo.id
      and (status = 'redeemed' or (status = 'reserved' and expires_at > v_now))
      and registration_id <> p_registration_id;

    if v_promo.max_redemptions is not null and v_used >= v_promo.max_redemptions then
      return jsonb_build_object('success', false, 'error', 'Promo code redemption limit has been reached.');
    end if;

    v_discount := case
      when v_promo.discount_type = 'percentage'
        then floor(v_base_amount * v_promo.discount_value / 100.0)::integer
      else v_promo.discount_value
    end;
    if v_promo.max_discount_paise is not null then
      v_discount := least(v_discount, v_promo.max_discount_paise);
    end if;
    v_discount := least(v_discount, v_base_amount);
    v_promo_id := v_promo.id;
    v_promo_code := v_promo.code;
  end if;

  v_final_amount := v_base_amount - v_discount;
  if v_final_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Discount must leave a positive payable amount.');
  end if;

  insert into public.ticket_category_reservations(registration_id, ticket_category_id, status, expires_at, updated_at)
  select p_registration_id, v_category_id, 'reserved', v_now + interval '15 minutes', v_now
  where v_category_id is not null
  on conflict (registration_id) do update
    set ticket_category_id = excluded.ticket_category_id,
        status = 'reserved',
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  if v_code <> '' then
    insert into public.promo_code_reservations(registration_id, promo_code_id, status, expires_at, updated_at)
    values (p_registration_id, v_promo_id, 'reserved', v_now + interval '15 minutes', v_now)
    on conflict (registration_id) do update
      set promo_code_id = excluded.promo_code_id,
          status = 'reserved',
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at;
  else
    delete from public.promo_code_reservations
    where registration_id = p_registration_id and status = 'reserved';
  end if;

  update public.registrations
  set form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object(
    'ticket_category_id', p_ticket_category_id,
    'ticket_category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'promo_code_id', v_promo_id,
    'promo_code', v_promo_code,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'pricing_snapshot_at', v_now
  ),
  updated_at = v_now
  where id = p_registration_id;

  return jsonb_build_object(
    'success', true,
    'category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'promo_code', v_promo_code
  );
end;
$$;

revoke all on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) to service_role;

create or replace function public.mark_ticket_and_promo_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured' and new.registration_id is not null then
    update public.ticket_category_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;

    update public.promo_code_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_mark_ticket_promo_redeemed on public.payments;
create trigger payments_mark_ticket_promo_redeemed
after insert on public.payments
for each row execute function public.mark_ticket_and_promo_redeemed();

notify pgrst, 'reload schema';


  if v_base_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'A valid paid ticket price is not configured.');
  end if;

  if v_code <> '' then
    select * into v_promo
    from public.promo_codes
    where event_id = p_event_id and upper(code) = v_code and is_active = true
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Promo code is invalid or inactive.');
    end if;
    if v_promo.starts_at is not null and v_now < v_promo.starts_at then
      return jsonb_build_object('success', false, 'error', 'Promo code is not active yet.');
    end if;
    if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
      return jsonb_build_object('success', false, 'error', 'Promo code has expired.');
    end if;
    if v_base_amount < v_promo.min_order_paise then
      return jsonb_build_object('success', false, 'error', 'Order does not meet the minimum amount for this promo code.');
    end if;

    select count(*) into v_used
    from public.promo_code_reservations
    where promo_code_id = v_promo.id
      and (status = 'redeemed' or (status = 'reserved' and expires_at > v_now))
      and registration_id <> p_registration_id;

    if v_promo.max_redemptions is not null and v_used >= v_promo.max_redemptions then
      return jsonb_build_object('success', false, 'error', 'Promo code redemption limit has been reached.');
    end if;

    v_discount := case
      when v_promo.discount_type = 'percentage'
        then floor(v_base_amount * v_promo.discount_value / 100.0)::integer
      else v_promo.discount_value
    end;
    if v_promo.max_discount_paise is not null then
      v_discount := least(v_discount, v_promo.max_discount_paise);
    end if;
    v_discount := least(v_discount, v_base_amount);
    v_promo_id := v_promo.id;
    v_promo_code := v_promo.code;
  end if;

  v_final_amount := v_base_amount - v_discount;
  if v_final_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Discount must leave a positive payable amount.');
  end if;

  insert into public.ticket_category_reservations(registration_id, ticket_category_id, status, expires_at, updated_at)
  select p_registration_id, v_category_id, 'reserved', v_now + interval '15 minutes', v_now
  where v_category_id is not null
  on conflict (registration_id) do update
    set ticket_category_id = excluded.ticket_category_id,
        status = 'reserved',
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  if v_code <> '' then
    insert into public.promo_code_reservations(registration_id, promo_code_id, status, expires_at, updated_at)
    values (p_registration_id, v_promo_id, 'reserved', v_now + interval '15 minutes', v_now)
    on conflict (registration_id) do update
      set promo_code_id = excluded.promo_code_id,
          status = 'reserved',
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at;
  else
    delete from public.promo_code_reservations
    where registration_id = p_registration_id and status = 'reserved';
  end if;

  update public.registrations
  set form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object(
    'ticket_category_id', p_ticket_category_id,
    'ticket_category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'promo_code_id', v_promo_id,
    'promo_code', v_promo_code,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'pricing_snapshot_at', v_now
  ),
  updated_at = v_now
  where id = p_registration_id;

  return jsonb_build_object(
    'success', true,
    'category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'promo_code', v_promo_code
  );
end;
$$;

revoke all on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) to service_role;

create or replace function public.mark_ticket_and_promo_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured' and new.registration_id is not null then
    update public.ticket_category_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;

    update public.promo_code_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_mark_ticket_promo_redeemed on public.payments;
create trigger payments_mark_ticket_promo_redeemed
after insert on public.payments
for each row execute function public.mark_ticket_and_promo_redeemed();

notify pgrst, 'reload schema';

        then (v_event.form_requirements->>'registration_fee')::integer * 100
      else 0
    end;
  end if;

  if v_base_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'A valid paid ticket price is not configured.');
  end if;

  if v_code <> '' then
    select * into v_promo
    from public.promo_codes
    where event_id = p_event_id and upper(code) = v_code and is_active = true
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Promo code is invalid or inactive.');
    end if;
    if v_promo.starts_at is not null and v_now < v_promo.starts_at then
      return jsonb_build_object('success', false, 'error', 'Promo code is not active yet.');
    end if;
    if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
      return jsonb_build_object('success', false, 'error', 'Promo code has expired.');
    end if;
    if v_base_amount < v_promo.min_order_paise then
      return jsonb_build_object('success', false, 'error', 'Order does not meet the minimum amount for this promo code.');
    end if;

    select count(*) into v_used
    from public.promo_code_reservations
    where promo_code_id = v_promo.id
      and (status = 'redeemed' or (status = 'reserved' and expires_at > v_now))
      and registration_id <> p_registration_id;

    if v_promo.max_redemptions is not null and v_used >= v_promo.max_redemptions then
      return jsonb_build_object('success', false, 'error', 'Promo code redemption limit has been reached.');
    end if;

    v_discount := case
      when v_promo.discount_type = 'percentage'
        then floor(v_base_amount * v_promo.discount_value / 100.0)::integer
      else v_promo.discount_value
    end;
    if v_promo.max_discount_paise is not null then
      v_discount := least(v_discount, v_promo.max_discount_paise);
    end if;
    v_discount := least(v_discount, v_base_amount);
    v_promo_id := v_promo.id;
    v_promo_code := v_promo.code;
  end if;

  v_final_amount := v_base_amount - v_discount;
  if v_final_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Discount must leave a positive payable amount.');
  end if;

  insert into public.ticket_category_reservations(registration_id, ticket_category_id, status, expires_at, updated_at)
  select p_registration_id, v_category_id, 'reserved', v_now + interval '15 minutes', v_now
  where v_category_id is not null
  on conflict (registration_id) do update
    set ticket_category_id = excluded.ticket_category_id,
        status = 'reserved',
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  if v_code <> '' then
    insert into public.promo_code_reservations(registration_id, promo_code_id, status, expires_at, updated_at)
    values (p_registration_id, v_promo_id, 'reserved', v_now + interval '15 minutes', v_now)
    on conflict (registration_id) do update
      set promo_code_id = excluded.promo_code_id,
          status = 'reserved',
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at;
  else
    delete from public.promo_code_reservations
    where registration_id = p_registration_id and status = 'reserved';
  end if;

  update public.registrations
  set form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object(
    'ticket_category_id', p_ticket_category_id,
    'ticket_category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'promo_code_id', v_promo_id,
    'promo_code', v_promo_code,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'pricing_snapshot_at', v_now
  ),
  updated_at = v_now
  where id = p_registration_id;

  return jsonb_build_object(
    'success', true,
    'category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'promo_code', v_promo_code
  );
end;
$$;

revoke all on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) to service_role;

create or replace function public.mark_ticket_and_promo_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured' and new.registration_id is not null then
    update public.ticket_category_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;

    update public.promo_code_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_mark_ticket_promo_redeemed on public.payments;
create trigger payments_mark_ticket_promo_redeemed
after insert on public.payments
for each row execute function public.mark_ticket_and_promo_redeemed();

notify pgrst, 'reload schema';

        then (v_event.form_requirements->>'registration_fee')::integer * 100
      else 0
    end;
  end if;

  if v_base_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'A valid paid ticket price is not configured.');
  end if;

  if v_code <> '' then
    select * into v_promo
    from public.promo_codes
    where event_id = p_event_id and upper(code) = v_code and is_active = true
    for update;

    if not found then
      return jsonb_build_object('success', false, 'error', 'Promo code is invalid or inactive.');
    end if;
    if v_promo.starts_at is not null and v_now < v_promo.starts_at then
      return jsonb_build_object('success', false, 'error', 'Promo code is not active yet.');
    end if;
    if v_promo.ends_at is not null and v_now >= v_promo.ends_at then
      return jsonb_build_object('success', false, 'error', 'Promo code has expired.');
    end if;
    if v_base_amount < v_promo.min_order_paise then
      return jsonb_build_object('success', false, 'error', 'Order does not meet the minimum amount for this promo code.');
    end if;

    select count(*) into v_used
    from public.promo_code_reservations
    where promo_code_id = v_promo.id
      and (status = 'redeemed' or (status = 'reserved' and expires_at > v_now))
      and registration_id <> p_registration_id;

    if v_promo.max_redemptions is not null and v_used >= v_promo.max_redemptions then
      return jsonb_build_object('success', false, 'error', 'Promo code redemption limit has been reached.');
    end if;

    v_discount := case
      when v_promo.discount_type = 'percentage'
        then floor(v_base_amount * v_promo.discount_value / 100.0)::integer
      else v_promo.discount_value
    end;
    if v_promo.max_discount_paise is not null then
      v_discount := least(v_discount, v_promo.max_discount_paise);
    end if;
    v_discount := least(v_discount, v_base_amount);
    v_promo_id := v_promo.id;
    v_promo_code := v_promo.code;
  end if;

  v_final_amount := v_base_amount - v_discount;
  if v_final_amount <= 0 then
    return jsonb_build_object('success', false, 'error', 'Discount must leave a positive payable amount.');
  end if;

  insert into public.ticket_category_reservations(registration_id, ticket_category_id, status, expires_at, updated_at)
  select p_registration_id, v_category_id, 'reserved', v_now + interval '15 minutes', v_now
  where v_category_id is not null
  on conflict (registration_id) do update
    set ticket_category_id = excluded.ticket_category_id,
        status = 'reserved',
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at;

  if v_code <> '' then
    insert into public.promo_code_reservations(registration_id, promo_code_id, status, expires_at, updated_at)
    values (p_registration_id, v_promo_id, 'reserved', v_now + interval '15 minutes', v_now)
    on conflict (registration_id) do update
      set promo_code_id = excluded.promo_code_id,
          status = 'reserved',
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at;
  else
    delete from public.promo_code_reservations
    where registration_id = p_registration_id and status = 'reserved';
  end if;

  update public.registrations
  set form_data = coalesce(form_data, '{}'::jsonb) || jsonb_build_object(
    'ticket_category_id', p_ticket_category_id,
    'ticket_category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'promo_code_id', v_promo_id,
    'promo_code', v_promo_code,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'pricing_snapshot_at', v_now
  ),
  updated_at = v_now
  where id = p_registration_id;

  return jsonb_build_object(
    'success', true,
    'category_name', v_category_name,
    'base_amount_paise', v_base_amount,
    'discount_amount_paise', v_discount,
    'final_amount_paise', v_final_amount,
    'promo_code', v_promo_code
  );
end;
$$;

revoke all on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.reserve_ticket_and_promo(uuid, uuid, uuid, text) to service_role;

create or replace function public.mark_ticket_and_promo_redeemed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'captured' and new.registration_id is not null then
    update public.ticket_category_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;

    update public.promo_code_reservations
    set status = 'redeemed', expires_at = null, updated_at = now()
    where registration_id = new.registration_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payments_mark_ticket_promo_redeemed on public.payments;
create trigger payments_mark_ticket_promo_redeemed
after insert on public.payments
for each row execute function public.mark_ticket_and_promo_redeemed();

notify pgrst, 'reload schema';
