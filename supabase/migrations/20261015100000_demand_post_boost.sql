-- ═══════════════════════════════════════════════════════════════════════════
-- Đẩy tin nhu cầu (Demand Boost) — giao dịch B2C: Renter trả phí cho nền tảng
-- để tin "Cần tìm phòng / ở ghép" xếp trên cùng `/tin-nhu-cau` trong N ngày.
--
-- Cùng khuôn với saas_orders (20261007100000): Edge Function
-- `payos-create-demand-checkout` là caller duy nhất của các RPC (service_role),
-- giá lấy từ `platform_settings.demand_boost_config` phía server, chỉ webhook
-- đã kiểm chữ ký HMAC mới cộng `boost_expire_at`.
--
-- KHÔNG ghi `payments`: bảng đó thuộc workspace (tiền của chủ trọ) và CHECK
-- `purpose` là enum cố định. `demand_boost_orders` (status/paid_at/
-- payos_reference) chính là sổ đối soát cho doanh thu B2C này.
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Cấu hình gói (Admin sửa qua set_platform_setting) ──────────────────
insert into public.platform_settings (key, value) values
  ('demand_boost_config', '{"days":[3,7],"price":[10000,20000]}'::jsonb)
on conflict (key) do nothing;

-- ── 2. Cột hạn đẩy tin ────────────────────────────────────────────────────
alter table public.demand_posts
  add column if not exists boost_expire_at timestamptz;

create index if not exists idx_demand_posts_boost_expire
  on public.demand_posts (boost_expire_at desc nulls last)
  where deleted_at is null;

-- ── 3. Renter không tự ghi được boost_expire_at ───────────────────────────
-- Giữ nguyên thân hàm từ 20261009090000, chỉ thêm 2 dòng boost_expire_at.
-- Webhook đi qua service_role ⇒ auth.uid() null ⇒ được ghi.
create or replace function public.guard_demand_post_write()
returns trigger
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_auto_approve boolean;
begin
  if auth.uid() is null or public.is_moderator() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select coalesce((value)::text = 'true', true) into v_auto_approve
      from public.platform_settings where key = 'auto_approve_demand_posts';
    new.status := case when coalesce(v_auto_approve, true) then 'Active' else 'PendingApproval' end;
    new.expire_at := null;
    new.deleted_at := null;
    new.boost_expire_at := null;
    return new;
  end if;

  new.renter_id := old.renter_id;
  new.expire_at := old.expire_at;
  new.boost_expire_at := old.boost_expire_at;
  if new.status is distinct from old.status
     and not (old.status in ('Active', 'Hidden', 'Expired')
              and new.status in ('Active', 'Hidden', 'Expired')) then
    raise exception 'DEMAND_STATUS_TRANSITION_INVALID' using errcode = 'P0001';
  end if;
  return new;
end $$;

revoke execute on function public.guard_demand_post_write() from public, anon, authenticated;

-- ── 4. View công khai: thêm 2 cột ở CUỐI (create or replace chỉ cho nối thêm) ─
-- Phần còn lại giữ NGUYÊN từng dòng so với 20261009090000 (che SĐT/địa chỉ cho anon).
create or replace view public.public_demand_posts
with (security_invoker = false) as
select
  dp.id,
  dp.renter_id,
  dp.kind,
  dp.status,
  dp.title,
  dp.description,
  dp.desired_districts,
  dp.desired_province_code,
  dp.desired_ward_codes,
  dp.price_min,
  dp.price_max,
  dp.property_type,
  dp.min_area,
  dp.desired_amenities,
  dp.move_in_date,
  dp.occupant_count,
  case when auth.uid() is null then null else dp.current_address end as current_address,
  dp.district,
  dp.share_price,
  dp.needed_count,
  dp.gender_requirement,
  dp.requirements,
  dp.contact_name,
  case
    when auth.uid() is not null then dp.contact_phone
    when dp.contact_phone is null or length(dp.contact_phone) < 7 then null
    else left(dp.contact_phone, 4) || '***' || right(dp.contact_phone, 3)
  end as contact_phone,
  dp.expire_at,
  dp.created_at,
  dp.updated_at,
  coalesce(p.full_name, 'Khách thuê') as renter_name,
  dp.boost_expire_at,
  coalesce(dp.boost_expire_at > now(), false) as is_boost_active
from public.demand_posts dp
left join public.profiles p on dp.renter_id = p.user_id
where dp.deleted_at is null and dp.status = 'Active';

grant select on public.public_demand_posts to anon, authenticated;

-- ── 5. Bảng đơn ───────────────────────────────────────────────────────────
create table if not exists public.demand_boost_orders (
  id uuid primary key default gen_random_uuid(),
  -- Dải mã riêng, tách xa Boost (260924…) và SaaS (3000…) — orderCode duy nhất trên merchant payOS.
  order_code bigint generated always as identity (start with 400000000000) unique,
  renter_id uuid not null references auth.users(id) on delete cascade,
  demand_post_id uuid not null references public.demand_posts(id) on delete cascade,
  days integer not null check (days between 1 and 365),
  amount integer not null check (amount > 0),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'LINKED', 'PAID', 'CANCELLED')),
  payment_link_id text unique,
  checkout_url text,
  payos_reference text unique,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_demand_boost_orders_renter_status
  on public.demand_boost_orders (renter_id, status);

alter table public.demand_boost_orders enable row level security;

-- Chủ đơn đọc đơn của mình. Không có policy ghi: mọi thay đổi qua RPC service_role.
drop policy if exists "Renter reads own demand boost orders" on public.demand_boost_orders;
create policy "Renter reads own demand boost orders" on public.demand_boost_orders
  for select to authenticated using (renter_id = auth.uid());

drop trigger if exists update_demand_boost_orders_modtime on public.demand_boost_orders;
create trigger update_demand_boost_orders_modtime before update on public.demand_boost_orders
  for each row execute procedure public.update_updated_at_column();

-- ── 6. begin_demand_boost_checkout ────────────────────────────────────────
-- Chỉ tin Active của chính người gọi. Giá theo số ngày trong demand_boost_config.
-- Tái dùng đơn mở cùng tin + cùng gói + cùng giá, tạo < 10 phút (link sống 15 phút).
create or replace function public.begin_demand_boost_checkout(
  p_renter_id uuid,
  p_demand_post_id uuid,
  p_days integer
) returns table (order_code bigint, amount integer, days integer)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_config jsonb;
  v_index integer;
  v_amount numeric;
  v_open public.demand_boost_orders;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_renter_id is null or p_demand_post_id is null or p_days is null then
    raise exception 'DEMAND_BOOST_REJECTED' using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('demand_boost_checkout:' || p_renter_id::text, 0));

  if not exists (
    select 1 from public.demand_posts
    where id = p_demand_post_id and renter_id = p_renter_id
      and status = 'Active' and deleted_at is null
  ) then
    raise exception 'DEMAND_BOOST_REJECTED' using errcode = '23514';
  end if;

  select value into v_config from public.platform_settings where key = 'demand_boost_config';
  if v_config is null or jsonb_typeof(v_config -> 'days') <> 'array'
      or jsonb_typeof(v_config -> 'price') <> 'array' then
    raise exception 'DEMAND_BOOST_CONFIG_INVALID' using errcode = '23514';
  end if;
  select (t.ordinality - 1)::integer into v_index
  from jsonb_array_elements(v_config -> 'days') with ordinality as t(value, ordinality)
  where t.value = to_jsonb(p_days)
  limit 1;
  if v_index is null then
    raise exception 'DEMAND_BOOST_REJECTED' using errcode = '23514';
  end if;
  v_amount := (v_config -> 'price' ->> v_index)::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 1000000000 or v_amount <> trunc(v_amount) then
    raise exception 'DEMAND_BOOST_CONFIG_INVALID' using errcode = '23514';
  end if;

  select * into v_open from public.demand_boost_orders o
  where o.renter_id = p_renter_id and o.status in ('PENDING', 'LINKED')
  order by o.created_at desc
  limit 1
  for update;

  if found then
    if v_open.demand_post_id = p_demand_post_id
        and v_open.days = p_days
        and v_open.amount = v_amount::integer
        and v_open.created_at > now() - interval '10 minutes' then
      return query select v_open.order_code, v_open.amount, v_open.days;
      return;
    end if;
    update public.demand_boost_orders set status = 'CANCELLED'
    where demand_boost_orders.order_code = v_open.order_code;
  end if;

  return query
    with inserted as (
      insert into public.demand_boost_orders (renter_id, demand_post_id, days, amount)
      values (p_renter_id, p_demand_post_id, p_days, v_amount::integer)
      returning demand_boost_orders.order_code, demand_boost_orders.amount, demand_boost_orders.days
    )
    select inserted.order_code, inserted.amount, inserted.days from inserted;
end $$;

-- ── 7. attach_demand_boost_checkout_link ──────────────────────────────────
create or replace function public.attach_demand_boost_checkout_link(
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
  update public.demand_boost_orders
  set payment_link_id = p_payment_link_id,
      checkout_url = p_checkout_url,
      status = case when status = 'PENDING' then 'LINKED' else status end
  where order_code = p_order_code
    and (payment_link_id is null or payment_link_id = p_payment_link_id);
  if not found then
    raise exception 'DEMAND_BOOST_LINK_MISMATCH' using errcode = '23514';
  end if;
end $$;

-- ── 8. complete_verified_demand_boost_payment ─────────────────────────────
-- Chỉ webhook (đã kiểm chữ ký) gọi. Idempotent theo payos_reference.
-- Mua thêm khi còn hạn ⇒ cộng dồn từ hạn hiện tại. Đơn CANCELLED vẫn được ghi
-- nhận nếu tiền về (khách trả link cũ trước khi hết hạn).
create or replace function public.complete_verified_demand_boost_payment(
  p_order_code bigint,
  p_amount integer,
  p_payment_link_id text,
  p_reference text
) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_order public.demand_boost_orders;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  select * into v_order from public.demand_boost_orders where order_code = p_order_code for update;
  if not found then
    return 'UNKNOWN_ORDER';
  end if;

  if p_amount is distinct from v_order.amount
      or nullif(btrim(p_payment_link_id), '') is null
      or nullif(btrim(p_reference), '') is null
      or (v_order.payment_link_id is not null and p_payment_link_id <> v_order.payment_link_id) then
    raise exception 'DEMAND_BOOST_PAYMENT_MISMATCH' using errcode = '23514';
  end if;
  if v_order.status = 'PAID' then
    if v_order.payos_reference is distinct from p_reference then
      raise exception 'DEMAND_BOOST_PAYMENT_REPLAY_MISMATCH' using errcode = '23514';
    end if;
    return v_order.status;
  end if;

  update public.demand_posts
  set boost_expire_at = greatest(coalesce(boost_expire_at, now()), now())
                        + make_interval(days => v_order.days)
  where id = v_order.demand_post_id;

  update public.demand_boost_orders
  set status = 'PAID',
      payment_link_id = coalesce(payment_link_id, p_payment_link_id),
      payos_reference = p_reference,
      paid_at = now()
  where order_code = p_order_code;
  return 'PAID';
end $$;

revoke execute on function public.begin_demand_boost_checkout(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.attach_demand_boost_checkout_link(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.complete_verified_demand_boost_payment(bigint, integer, text, text) from public, anon, authenticated;
grant execute on function public.begin_demand_boost_checkout(uuid, uuid, integer) to service_role;
grant execute on function public.attach_demand_boost_checkout_link(bigint, text, text) to service_role;
grant execute on function public.complete_verified_demand_boost_payment(bigint, integer, text, text) to service_role;
