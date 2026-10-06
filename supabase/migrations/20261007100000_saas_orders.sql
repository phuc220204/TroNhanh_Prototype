-- Mua / gia hạn gói SaaS qua payOS — cùng khuôn với Boost (20260924010000 +
-- 20261006100100): Edge Function là caller duy nhất của các RPC dưới đây
-- (service_role), giá lấy từ `subscription_plans` phía server, webhook có ký
-- HMAC mới kích hoạt gói. Client không chọn được giá, trạng thái hay ngày hết hạn.

create table if not exists public.saas_orders (
  id uuid primary key default gen_random_uuid(),
  -- Dải mã riêng, tách xa dải Boost (260924…) — orderCode phải duy nhất trên merchant payOS.
  order_code bigint generated always as identity (start with 300000000000) unique,
  seller_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  amount integer not null check (amount > 0),
  is_renewal boolean not null default false,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'LINKED', 'PAID', 'NEEDS_REVIEW', 'CANCELLED')),
  payment_link_id text unique,
  checkout_url text,
  payos_reference text unique,
  payment_id uuid references public.payments(id),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_saas_orders_seller_status on public.saas_orders (seller_id, status);

alter table public.saas_orders enable row level security;

-- Chủ đơn đọc đơn của mình (trang Gói dịch vụ, thông báo khi quay lại từ payOS).
-- Không có policy ghi: mọi thay đổi đi qua RPC service_role bên dưới.
drop policy if exists "Seller reads own saas orders" on public.saas_orders;
create policy "Seller reads own saas orders" on public.saas_orders
  for select to authenticated using (seller_id = auth.uid());

drop trigger if exists update_saas_orders_modtime on public.saas_orders;
create trigger update_saas_orders_modtime before update on public.saas_orders
  for each row execute procedure public.update_updated_at_column();

-- ── begin_saas_checkout ────────────────────────────────────────────────────
-- Giá: `renewal_price` nếu người bán đã từng mua gói trả phí này, ngược lại
-- `price`. Tái dùng đơn mở cùng gói, cùng giá, tạo < 10 phút (link payOS sống
-- 15 phút); khác thì đơn cũ CANCELLED và tạo đơn mới.
create or replace function public.begin_saas_checkout(
  p_seller_id uuid,
  p_plan_id uuid
) returns table (order_code bigint, amount integer, is_renewal boolean)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_plan public.subscription_plans;
  v_is_renewal boolean;
  v_amount numeric;
  v_open public.saas_orders;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_seller_id is null or p_plan_id is null then
    raise exception 'INVALID_SAAS_PLAN' using errcode = '23514';
  end if;

  -- Hai tab bấm "Mua" cùng lúc phải tuần tự, kể cả khi chưa có đơn nào để khóa.
  perform pg_advisory_xact_lock(hashtextextended('saas_checkout:' || p_seller_id::text, 0));

  select * into v_plan from public.subscription_plans where id = p_plan_id;
  if not found then raise exception 'INVALID_SAAS_PLAN' using errcode = '23514'; end if;

  v_is_renewal := exists (
    select 1 from public.saas_orders o
    where o.seller_id = p_seller_id and o.plan_id = p_plan_id and o.status = 'PAID'
  );
  v_amount := case when v_is_renewal then v_plan.renewal_price else v_plan.price end;
  -- Gói giá 0 (dùng thử) không bán qua payOS.
  if v_amount is null or v_amount <= 0 or v_amount > 1000000000 or v_amount <> trunc(v_amount) then
    raise exception 'INVALID_SAAS_PLAN' using errcode = '23514';
  end if;

  select * into v_open from public.saas_orders o
  where o.seller_id = p_seller_id and o.status in ('PENDING', 'LINKED')
  order by o.created_at desc
  limit 1
  for update;

  if found then
    if v_open.plan_id = p_plan_id
        and v_open.amount = v_amount::integer
        and v_open.created_at > now() - interval '10 minutes' then
      return query select v_open.order_code, v_open.amount, v_open.is_renewal;
      return;
    end if;
    update public.saas_orders set status = 'CANCELLED'
    where saas_orders.order_code = v_open.order_code;
  end if;

  return query
    with inserted as (
      insert into public.saas_orders (seller_id, plan_id, amount, is_renewal)
      values (p_seller_id, p_plan_id, v_amount::integer, v_is_renewal)
      returning saas_orders.order_code, saas_orders.amount, saas_orders.is_renewal
    )
    select inserted.order_code, inserted.amount, inserted.is_renewal from inserted;
end $$;

-- ── attach_saas_checkout_link ─────────────────────────────────────────────
create or replace function public.attach_saas_checkout_link(
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

  -- Webhook có thể về trước câu lệnh này: không kéo đơn đã PAID về LINKED.
  update public.saas_orders
  set payment_link_id = p_payment_link_id,
      checkout_url = p_checkout_url,
      status = case when status = 'PENDING' then 'LINKED' else status end
  where order_code = p_order_code
    and (payment_link_id is null or payment_link_id = p_payment_link_id);
  if not found then
    raise exception 'SAAS_ORDER_LINK_MISMATCH' using errcode = '23514';
  end if;
end $$;

-- ── complete_verified_saas_payment ────────────────────────────────────────
-- Chỉ webhook (đã kiểm chữ ký) gọi. Idempotent theo payos_reference.
-- Đơn CANCELLED vẫn được ghi nhận nếu tiền về (khách trả link cũ trước khi hết hạn).
create or replace function public.complete_verified_saas_payment(
  p_order_code bigint,
  p_amount integer,
  p_payment_link_id text,
  p_reference text
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.saas_orders;
  v_plan public.subscription_plans;
  v_sub public.user_subscriptions;
  v_payment_id uuid;
  v_base date;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_order from public.saas_orders where order_code = p_order_code for update;
  if not found then
    return 'UNKNOWN_ORDER';
  end if;

  if p_amount is distinct from v_order.amount
      or nullif(btrim(p_payment_link_id), '') is null
      or nullif(btrim(p_reference), '') is null
      or (v_order.payment_link_id is not null and p_payment_link_id <> v_order.payment_link_id) then
    raise exception 'SAAS_PAYMENT_MISMATCH' using errcode = '23514';
  end if;
  if v_order.status in ('PAID', 'NEEDS_REVIEW') then
    if v_order.payos_reference is distinct from p_reference then
      raise exception 'SAAS_PAYMENT_REPLAY_MISMATCH' using errcode = '23514';
    end if;
    return v_order.status;
  end if;

  select * into v_plan from public.subscription_plans where id = v_order.plan_id;

  -- Một người bán có thể còn row NONE cũ (schema cũ không unique seller_id):
  -- lấy row mới nhất để gia hạn, không có thì tạo.
  perform pg_advisory_xact_lock(hashtextextended(v_order.seller_id::text, 0));
  select * into v_sub from public.user_subscriptions
  where seller_id = v_order.seller_id
  order by created_at desc
  limit 1
  for update;

  if v_sub.id is null then
    insert into public.user_subscriptions (seller_id, plan_id, start_date, expire_date, status)
    values (v_order.seller_id, v_order.plan_id, current_date,
            (current_date + make_interval(months => v_plan.duration_months))::date, 'ACTIVE')
    returning * into v_sub;
  else
    -- Gia hạn sớm thì cộng dồn từ ngày hết hạn hiện tại; đã hết hạn thì tính từ hôm nay.
    v_base := greatest(v_sub.expire_date, current_date);
    update public.user_subscriptions
    set plan_id = v_order.plan_id,
        status = 'ACTIVE',
        start_date = case when v_sub.expire_date < current_date or v_sub.status in ('NONE', 'READ_ONLY')
                          then current_date else v_sub.start_date end,
        expire_date = (v_base + make_interval(months => v_plan.duration_months))::date
    where id = v_sub.id;
  end if;

  insert into public.payments (invoice_id, user_subscription_id, owner_id, amount, method, paid_at, purpose)
  values (null, v_sub.id, v_order.seller_id, v_order.amount, 'BankTransfer', now(), 'Subscription')
  returning id into v_payment_id;

  update public.saas_orders
  set status = 'PAID',
      payment_link_id = coalesce(payment_link_id, p_payment_link_id),
      payos_reference = p_reference,
      payment_id = v_payment_id,
      paid_at = now()
  where order_code = p_order_code;
  return 'PAID';
end $$;

revoke execute on function public.begin_saas_checkout(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.attach_saas_checkout_link(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.complete_verified_saas_payment(bigint, integer, text, text) from public, anon, authenticated;
grant execute on function public.begin_saas_checkout(uuid, uuid) to service_role;
grant execute on function public.attach_saas_checkout_link(bigint, text, text) to service_role;
grant execute on function public.complete_verified_saas_payment(bigint, integer, text, text) to service_role;
