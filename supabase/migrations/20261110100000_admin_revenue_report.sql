-- Trang thống kê giao dịch nền tảng (/quan-tri/doanh-thu) — chỉ Admin.
--
-- Nguồn sự thật là 3 bảng đơn payOS (KHÔNG dùng `payments`: lẫn tiền thuê nhà,
-- và đơn đẩy tin nhu cầu không ghi vào đó):
--   saas_orders          → kind 'Saas'
--   boost_orders         → kind 'ListingBoost'
--   demand_boost_orders  → kind 'DemandBoost'
--
-- "Doanh thu" = mọi đơn ĐÃ NHẬN TIỀN (`paid_at is not null`), bất kể status.
-- Đơn boost PAID_PENDING_APPROVAL / NEEDS_REVIEW đã nhận tiền thật nên phải tính.
-- Luôn cộng `amount` lưu trên đơn, không tính lại từ cấu hình giá hiện tại.
--
-- 1. Index partial theo paid_at cho 3 bảng.
-- 2. admin_revenue_summary(): doanh thu + số đơn theo ngày/tháng × loại.
-- 3. admin_list_revenue_transactions(): danh sách đơn có lọc + phân trang (+ CSV).
-- 4. admin_business_stats(): đổi điều kiện doanh thu từ status='PAID' sang
--    paid_at is not null để thẻ dashboard khớp trang mới.
--
-- Mọi hàm: security definer ⇒ assert Admin BÊN TRONG body là biên bảo mật (§6.1).
-- Idempotent: if not exists / create or replace / revoke+grant chạy lại an toàn.

-- ══ 1. Index ═════════════════════════════════════════════════════════════
create index if not exists saas_orders_paid_at_idx
  on public.saas_orders (paid_at desc) where paid_at is not null;
create index if not exists boost_orders_paid_at_idx
  on public.boost_orders (paid_at desc) where paid_at is not null;
create index if not exists demand_boost_orders_paid_at_idx
  on public.demand_boost_orders (paid_at desc) where paid_at is not null;

-- ══ 2. admin_revenue_summary ═════════════════════════════════════════════
-- Một dòng / (bucket, kind) có phát sinh. Bucket là ngày đầu kỳ theo giờ VN.
create or replace function public.admin_revenue_summary(
  p_from        date,
  p_to          date,
  p_granularity text default 'day'
)
returns table (
  bucket      date,
  kind        text,
  amount      bigint,
  order_count bigint
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid   uuid;
  v_start timestamptz;
  v_end   timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  if p_from is null or p_to is null or p_from > p_to
     or p_granularity not in ('day', 'month')
     -- Chặn truy vấn quá nặng: theo ngày tối đa ~1 năm, theo tháng tối đa 10 năm.
     or (p_granularity = 'day'   and p_to - p_from > 366)
     or (p_granularity = 'month' and p_to - p_from > 3660) then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  -- [p_from 00:00, p_to+1 00:00) giờ Việt Nam ⇒ dùng được index paid_at.
  v_start := p_from::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_end   := (p_to + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';

  return query
  with paid as (
    select 'Saas'::text as kind, o.amount, o.paid_at
      from public.saas_orders o
     where o.paid_at >= v_start and o.paid_at < v_end
    union all
    select 'ListingBoost', o.amount, o.paid_at
      from public.boost_orders o
     where o.paid_at >= v_start and o.paid_at < v_end
    union all
    select 'DemandBoost', o.amount, o.paid_at
      from public.demand_boost_orders o
     where o.paid_at >= v_start and o.paid_at < v_end
  )
  select
    date_trunc(p_granularity, paid.paid_at at time zone 'Asia/Ho_Chi_Minh')::date,
    paid.kind,
    coalesce(sum(paid.amount), 0)::bigint,
    count(*)::bigint
  from paid
  group by 1, 2
  order by 1, 2;
end $$;

revoke execute on function public.admin_revenue_summary(date, date, text) from public, anon;
grant  execute on function public.admin_revenue_summary(date, date, text) to authenticated;

-- ══ 3. admin_list_revenue_transactions ═══════════════════════════════════
-- Lọc ngày theo coalesce(paid_at, created_at) giờ VN ⇒ đơn chưa trả tiền vẫn
-- hiện khi lọc trạng thái (đối soát). `total_count` = tổng dòng khớp bộ lọc.
create or replace function public.admin_list_revenue_transactions(
  p_from      date,
  p_to        date,
  p_kind      text    default null,
  p_status    text    default null,
  p_paid_only boolean default false,
  p_limit     integer default 20,
  p_offset    integer default 0
)
returns table (
  kind        text,
  order_code  bigint,
  buyer_id    uuid,
  buyer_name  text,
  buyer_email text,
  item_label  text,
  amount      integer,
  status      text,
  created_at  timestamptz,
  paid_at     timestamptz,
  total_count bigint
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid    uuid;
  v_start  timestamptz;
  v_end    timestamptz;
  v_limit  integer;
  v_offset integer;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  if p_from is null or p_to is null or p_from > p_to
     or (p_kind is not null and p_kind not in ('Saas', 'ListingBoost', 'DemandBoost')) then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;

  v_start  := p_from::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_end    := (p_to + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';
  -- 5000 đủ cho xuất CSV một kỳ; chặn trang khổng lồ.
  v_limit  := least(greatest(coalesce(p_limit, 20), 1), 5000);
  v_offset := greatest(coalesce(p_offset, 0), 0);

  return query
  with orders as (
    select
      'Saas'::text as kind,
      o.order_code,
      o.seller_id as buyer_id,
      coalesce(sp.name, 'Gói dịch vụ')
        || case when o.is_renewal then ' (gia hạn)' else '' end as item_label,
      o.amount,
      o.status,
      o.created_at,
      o.paid_at
    from public.saas_orders o
    left join public.subscription_plans sp on sp.id = o.plan_id
    where p_kind is null or p_kind = 'Saas'

    union all
    select
      'ListingBoost',
      o.order_code,
      o.seller_id,
      o.days || ' ngày – ' || coalesce(l.title, '(tin đã xóa)'),
      o.amount,
      o.status,
      o.created_at,
      o.paid_at
    from public.boost_orders o
    left join public.rental_listings l on l.id = o.listing_id
    where p_kind is null or p_kind = 'ListingBoost'

    union all
    select
      'DemandBoost',
      o.order_code,
      o.renter_id,
      o.days || ' ngày – ' || coalesce(d.title, '(tin đã xóa)'),
      o.amount,
      o.status,
      o.created_at,
      o.paid_at
    from public.demand_boost_orders o
    left join public.demand_posts d on d.id = o.demand_post_id
    where p_kind is null or p_kind = 'DemandBoost'
  )
  select
    o.kind,
    o.order_code::bigint,
    o.buyer_id,
    p.full_name,
    u.email::text,
    o.item_label,
    o.amount::integer,
    o.status,
    o.created_at,
    o.paid_at,
    count(*) over ()
  from orders o
  left join public.profiles p on p.user_id = o.buyer_id
  left join auth.users u      on u.id = o.buyer_id
  where coalesce(o.paid_at, o.created_at) >= v_start
    and coalesce(o.paid_at, o.created_at) <  v_end
    and (p_status is null or o.status = p_status)
    and (not coalesce(p_paid_only, false) or o.paid_at is not null)
  order by coalesce(o.paid_at, o.created_at) desc, o.order_code desc
  limit v_limit offset v_offset;
end $$;

revoke execute on function public.admin_list_revenue_transactions(date, date, text, text, boolean, integer, integer) from public, anon;
grant  execute on function public.admin_list_revenue_transactions(date, date, text, text, boolean, integer, integer) to authenticated;

-- ══ 4. admin_business_stats — doanh thu = mọi đơn đã nhận tiền ═══════════
-- Cùng signature với 20261016170000 ⇒ create or replace được.
create or replace function public.admin_business_stats()
returns table (
  active_subscriptions  integer,
  trial_subscriptions   integer,
  saas_revenue          bigint,
  boost_revenue         bigint,
  demand_boost_revenue  bigint,
  needs_review_orders   integer
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid         uuid;
  v_today       date;
  v_month_start timestamptz;
  v_month_end   timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  v_today       := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_month_start := date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
  v_month_end   := (date_trunc('month', now() at time zone 'Asia/Ho_Chi_Minh') + interval '1 month') at time zone 'Asia/Ho_Chi_Minh';

  return query
  select
    -- Khớp effectiveSubscriptionStatus() ở client: quá expire_date là READ_ONLY.
    (select count(*)::integer from public.user_subscriptions s
      where s.status = 'ACTIVE' and s.expire_date >= v_today),
    (select count(*)::integer from public.user_subscriptions s
      where s.status = 'TRIAL' and s.expire_date >= v_today),
    -- paid_at có giá trị ⇔ payOS đã xác nhận nhận tiền (kể cả đơn đang chờ duyệt/đối soát).
    (select coalesce(sum(o.amount), 0)::bigint from public.saas_orders o
      where o.paid_at >= v_month_start and o.paid_at < v_month_end),
    (select coalesce(sum(o.amount), 0)::bigint from public.boost_orders o
      where o.paid_at >= v_month_start and o.paid_at < v_month_end),
    (select coalesce(sum(o.amount), 0)::bigint from public.demand_boost_orders o
      where o.paid_at >= v_month_start and o.paid_at < v_month_end),
    -- demand_boost_orders không có trạng thái NEEDS_REVIEW (check constraint).
    ((select count(*) from public.saas_orders o where o.status = 'NEEDS_REVIEW')
      + (select count(*) from public.boost_orders o where o.status = 'NEEDS_REVIEW'))::integer;
end $$;

revoke execute on function public.admin_business_stats() from public, anon;
grant  execute on function public.admin_business_stats() to authenticated;
