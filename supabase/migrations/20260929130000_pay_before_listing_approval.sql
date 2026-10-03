-- A Boost payment may be made while its listing is awaiting moderation.  It is
-- deliberately not an entitlement at that point: the paid order is held until
-- a moderator publishes the listing, then its days start from that approval.
-- This keeps the checkout immediate without allowing an unreviewed listing to
-- buy public ranking.

alter table public.boost_orders
  drop constraint if exists boost_orders_status_check;
alter table public.boost_orders
  add constraint boost_orders_status_check
  check (status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL', 'PAID', 'NEEDS_REVIEW'));

-- Moderators need to see the fact that a payment is waiting before taking an
-- approve/reject decision. Sellers retain the existing owner-only policy.
drop policy if exists "Moderator reads boost orders" on public.boost_orders;
create policy "Moderator reads boost orders" on public.boost_orders
  for select to authenticated
  using (public.is_moderator());

-- The Edge Function is the only caller. One open order is reused instead of
-- creating a fresh order whenever a seller resumes the checkout page.
create or replace function public.begin_boost_checkout(
  p_seller_id uuid,
  p_listing_id uuid,
  p_days integer
) returns table (order_code bigint, amount integer)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_listing public.rental_listings;
  v_open_order public.boost_orders;
  v_config jsonb;
  v_index integer;
  v_amount numeric;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_seller_id is null or p_listing_id is null or p_days is null then
    raise exception 'INVALID_BOOST_PACKAGE' using errcode = '23514';
  end if;

  -- Lock the listing first. The webhook, delete and moderation paths use the
  -- same order, so a payment racing with moderation cannot grant Boost early.
  select * into v_listing from public.rental_listings
  where id = p_listing_id and deleted_at is null for update;
  if not found or v_listing.seller_id <> p_seller_id
      or v_listing.status not in ('PendingApproval', 'Active') then
    raise exception 'LISTING_NOT_CONTACTABLE' using errcode = '23514';
  end if;

  select value into v_config from public.platform_settings
  where key = 'boost_config';
  if v_config is null then
    raise exception 'BOOST_CONFIG_MISSING' using errcode = '23514';
  end if;
  select ordinality - 1 into v_index
  from jsonb_array_elements(v_config -> 'days') with ordinality as d(value, ordinality)
  where (d.value)::integer = p_days limit 1;
  if v_index is null then
    raise exception 'INVALID_BOOST_PACKAGE' using errcode = '23514';
  end if;
  v_amount := ((v_config -> 'price') -> v_index)::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 1000000000
      or v_amount <> trunc(v_amount) then
    raise exception 'BOOST_CONFIG_MISSING' using errcode = '23514';
  end if;

  select * into v_open_order from public.boost_orders
  where listing_id = p_listing_id
    and status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL')
  order by created_at desc
  limit 1
  for update;
  if found then
    return query select v_open_order.order_code, v_open_order.amount;
    return;
  end if;

  return query
    insert into public.boost_orders (listing_id, seller_id, days, amount)
    values (p_listing_id, p_seller_id, p_days, v_amount::integer)
    returning boost_orders.order_code, boost_orders.amount;
end $$;

create or replace function public.attach_boost_checkout_link(
  p_order_code bigint,
  p_payment_link_id text,
  p_checkout_url text
) returns void
language plpgsql volatile security definer set search_path = public as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if nullif(btrim(p_payment_link_id), '') is null
      or p_checkout_url not like 'https://pay.payos.vn/%' then
    raise exception 'INVALID_PAYMENT_LINK' using errcode = '23514';
  end if;

  -- A signed webhook may arrive before this statement. Do not regress a paid
  -- waiting order back to LINKED; retain the link for reconciliation only.
  update public.boost_orders
  set payment_link_id = p_payment_link_id,
      checkout_url = p_checkout_url,
      status = case when status = 'PENDING' then 'LINKED' else status end,
      updated_at = now()
  where order_code = p_order_code
    and status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL', 'PAID', 'NEEDS_REVIEW')
    and (payment_link_id is null or payment_link_id = p_payment_link_id);
  if not found then
    raise exception 'BOOST_ORDER_LINK_MISMATCH' using errcode = '23514';
  end if;
end $$;

-- This remains webhook-only. A verified payment against a PendingApproval
-- listing becomes a held credit, not an active Boost entitlement.
create or replace function public.complete_verified_boost_payment(
  p_order_code bigint,
  p_amount integer,
  p_payment_link_id text,
  p_reference text
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.boost_orders;
  v_listing public.rental_listings;
  v_listing_id uuid;
  v_listing_exists boolean;
  v_payment_id uuid;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select listing_id into v_listing_id from public.boost_orders
  where order_code = p_order_code;
  if not found then
    return 'UNKNOWN_ORDER'; -- signed payOS endpoint-verification samples
  end if;

  -- Listing then order is the shared locking order for checkout, webhook,
  -- moderation and delete operations.
  select * into v_listing from public.rental_listings
  where id = v_listing_id for update;
  v_listing_exists := found;
  select * into v_order from public.boost_orders
  where order_code = p_order_code for update;

  if p_amount is distinct from v_order.amount
      or nullif(btrim(p_payment_link_id), '') is null
      or nullif(btrim(p_reference), '') is null
      or (v_order.payment_link_id is not null
          and p_payment_link_id <> v_order.payment_link_id) then
    raise exception 'BOOST_PAYMENT_MISMATCH' using errcode = '23514';
  end if;
  if v_order.status in ('PAID_PENDING_APPROVAL', 'PAID', 'NEEDS_REVIEW') then
    if v_order.payos_reference is distinct from p_reference then
      raise exception 'BOOST_PAYMENT_REPLAY_MISMATCH' using errcode = '23514';
    end if;
    return v_order.status;
  end if;

  insert into public.payments (invoice_id, owner_id, amount, method, paid_at, purpose)
  values (null, v_order.seller_id, v_order.amount, 'BankTransfer', now(), 'Boost')
  returning id into v_payment_id;

  if not v_listing_exists or v_listing.deleted_at is not null then
    update public.boost_orders
    set status = 'NEEDS_REVIEW', payment_link_id = coalesce(payment_link_id, p_payment_link_id),
        payos_reference = nullif(p_reference, ''), payment_id = v_payment_id,
        paid_at = now(), updated_at = now()
    where order_code = p_order_code;
    return 'NEEDS_REVIEW';
  end if;

  if v_listing.status = 'PendingApproval' then
    update public.boost_orders
    set status = 'PAID_PENDING_APPROVAL', payment_link_id = coalesce(payment_link_id, p_payment_link_id),
        payos_reference = nullif(p_reference, ''), payment_id = v_payment_id,
        paid_at = now(), updated_at = now()
    where order_code = p_order_code;
    return 'PAID_PENDING_APPROVAL';
  end if;

  if v_listing.status <> 'Active' then
    update public.boost_orders
    set status = 'NEEDS_REVIEW', payment_link_id = coalesce(payment_link_id, p_payment_link_id),
        payos_reference = nullif(p_reference, ''), payment_id = v_payment_id,
        paid_at = now(), updated_at = now()
    where order_code = p_order_code;
    return 'NEEDS_REVIEW';
  end if;

  perform set_config('app.allow_boost_write', 'on', true);
  update public.rental_listings
  set boost_expire_at = greatest(coalesce(boost_expire_at, now()), now())
      + make_interval(days => v_order.days),
      boost_payment_verified = true
  where id = v_order.listing_id;
  perform set_config('app.allow_boost_write', 'off', true);

  update public.boost_orders
  set status = 'PAID', payment_link_id = coalesce(payment_link_id, p_payment_link_id),
      payos_reference = nullif(p_reference, ''), payment_id = v_payment_id,
      paid_at = now(), updated_at = now()
  where order_code = p_order_code;
  return 'PAID';
end $$;

-- Replacing the old moderation RPC makes approval the sole point where held
-- Boost credits turn into ranking. Reject intentionally preserves the credit;
-- a seller can fix the listing and submit it again without a second payment.
create or replace function public.moderate_listing(
  p_listing_id uuid,
  p_action text,
  p_reason text default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ttl integer;
  v_listing public.rental_listings;
  v_boost_order public.boost_orders;
  v_held_boost_days integer := 0;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.is_moderator() then raise exception 'FORBIDDEN'; end if;
  if p_action not in ('Approve', 'Reject', 'Hide', 'Restore') then
    raise exception 'INVALID_MODERATION_ACTION';
  end if;
  if p_action = 'Reject' and coalesce(trim(p_reason), '') = '' then
    raise exception 'REASON_REQUIRED';
  end if;

  select * into v_listing from public.rental_listings
  where id = p_listing_id and deleted_at is null for update;
  if not found then raise exception 'LISTING_NOT_FOUND'; end if;

  select coalesce((value)::integer, 60) into v_ttl
  from public.platform_settings where key = 'listing_ttl_days';
  v_ttl := coalesce(v_ttl, 60);

  update public.rental_listings set
    status = case p_action
      when 'Approve' then 'Active'
      when 'Reject' then 'Rejected'
      when 'Hide' then 'Hidden'
      when 'Restore' then 'Active'
    end,
    approved_at = case when p_action in ('Approve', 'Restore') then now() else approved_at end,
    expire_at = case when p_action in ('Approve', 'Restore') then now() + (v_ttl || ' days')::interval else expire_at end,
    rejection_reason = case when p_action = 'Reject' then p_reason else null end,
    moderated_by = v_uid,
    moderated_at = now()
  where id = p_listing_id;

  if p_action in ('Approve', 'Restore') then
    for v_boost_order in
      select * from public.boost_orders
      where listing_id = p_listing_id and status = 'PAID_PENDING_APPROVAL'
      for update
    loop
      v_held_boost_days := v_held_boost_days + v_boost_order.days;
    end loop;

    if v_held_boost_days > 0 then
      perform set_config('app.allow_boost_write', 'on', true);
      update public.rental_listings
      set boost_expire_at = greatest(coalesce(boost_expire_at, now()), now())
          + make_interval(days => v_held_boost_days),
          boost_payment_verified = true
      where id = p_listing_id;
      perform set_config('app.allow_boost_write', 'off', true);

      update public.boost_orders
      set status = 'PAID', updated_at = now()
      where listing_id = p_listing_id and status = 'PAID_PENDING_APPROVAL';
    end if;
  end if;

  insert into public.moderation_logs (target_type, target_id, moderator_id, action, reason)
  values ('RentalListing', p_listing_id, v_uid, p_action, p_reason);
end $$;

-- Keep a paid held credit visible to support rather than silently losing it if
-- its listing is deleted before moderation can happen.
create or replace function public.delete_listing(p_listing_id uuid)
returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.rental_listings;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_listing from public.rental_listings
  where id = p_listing_id and seller_id = v_uid and deleted_at is null for update;
  if not found then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  update public.rental_listings
  set deleted_at = now(), status = 'Hidden'
  where id = p_listing_id;

  update public.boost_orders
  set status = 'NEEDS_REVIEW', updated_at = now()
  where listing_id = p_listing_id and status = 'PAID_PENDING_APPROVAL';
end $$;

-- A saved draft must cross the same validation gate as a new submission. This
-- gives the edit screen an explicit "send for approval" operation instead of
-- leaving a completed draft stuck in Draft forever.
create or replace function public.submit_draft_listing(p_listing_id uuid)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_listing public.rental_listings;
  v_auto_approve boolean;
  v_ttl integer;
  v_new_status text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select * into v_listing from public.rental_listings
  where id = p_listing_id and deleted_at is null for update;
  if not found or v_listing.seller_id <> v_uid then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if v_listing.status <> 'Draft' then
    raise exception 'INVALID_LISTING_SUBMISSION_TRANSITION' using errcode = 'P0001';
  end if;

  select coalesce((value)::boolean, false) into v_auto_approve
  from public.platform_settings where key = 'auto_approve_listings';
  v_auto_approve := coalesce(v_auto_approve, false);
  v_new_status := case when v_auto_approve then 'Active' else 'PendingApproval' end;

  select coalesce((value)::integer, 60) into v_ttl
  from public.platform_settings where key = 'listing_ttl_days';
  v_ttl := coalesce(v_ttl, 60);

  update public.rental_listings
  set status = v_new_status,
      approved_at = case when v_new_status = 'Active' then now() else null end,
      expire_at = case when v_new_status = 'Active' then now() + (v_ttl || ' days')::interval else expire_at end,
      rejection_reason = null
  where id = p_listing_id;

  return v_new_status;
end $$;

revoke execute on function public.begin_boost_checkout(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.attach_boost_checkout_link(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.complete_verified_boost_payment(bigint, integer, text, text) from public, anon, authenticated;
revoke execute on function public.submit_draft_listing(uuid) from public, anon;
grant execute on function public.begin_boost_checkout(uuid, uuid, integer) to service_role;
grant execute on function public.attach_boost_checkout_link(bigint, text, text) to service_role;
grant execute on function public.complete_verified_boost_payment(bigint, integer, text, text) to service_role;
grant execute on function public.submit_draft_listing(uuid) to authenticated;
