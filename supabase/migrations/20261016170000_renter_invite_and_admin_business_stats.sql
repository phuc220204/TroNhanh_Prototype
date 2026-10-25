-- Báo cáo UX 16/10/2026 — mục 18, 21, 22.
--
-- 1. get_my_pending_link_details(): người được mời liên kết (BR-029) thấy tên
--    chủ trọ để đối chiếu trước khi bấm "Xác nhận". `profiles` chỉ có policy
--    SELECT chính chủ nên client không tự đọc được tên chủ trọ.
-- 2. admin_business_stats(): số gói ACTIVE/TRIAL còn hạn, doanh thu payOS tháng
--    này (saas_orders + boost_orders + demand_boost_orders PAID), đơn NEEDS_REVIEW.
-- 3. admin_list_subscriptions(): gói của từng tài khoản cho /quan-tri/nguoi-dung.
--    Tách khỏi `admin_list_users` (PR #19 đang đổi hàm đó).
--
-- Mọi hàm: security definer ⇒ assert BÊN TRONG body là biên bảo mật (§6.1).
-- Idempotent: create or replace + revoke/grant chạy lại an toàn.

-- ══ 1. get_my_pending_link_details ═══════════════════════════════════════
-- Chỉ trả lời mời ĐANG CHỜ của chính người gọi (`o.user_id = auth.uid()`).
-- Không trả SĐT/STK hay dữ liệu vận hành nào khác — chỉ tên để đối chiếu.
create or replace function public.get_my_pending_link_details()
returns table (
  occupancy_id  uuid,
  landlord_name text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  return query
  select o.id, pr.full_name
  from public.occupancies o
  join public.rooms r       on r.id = o.room_id
  join public.properties p  on p.id = r.property_id
  left join public.profiles pr on pr.user_id = p.owner_id
  where o.user_id = v_uid
    and o.link_status = 'Pending'
    and o.deleted_at is null;
end $$;

revoke execute on function public.get_my_pending_link_details() from public, anon;
grant  execute on function public.get_my_pending_link_details() to authenticated;

-- ══ 2. admin_business_stats ══════════════════════════════════════════════
-- Doanh thu là số liệu kinh doanh ⇒ chỉ Admin (Moderator chỉ kiểm duyệt).
-- "Tháng này" theo giờ Việt Nam, tính theo `paid_at`.
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
    (select coalesce(sum(o.amount), 0)::bigint from public.saas_orders o
      where o.status = 'PAID' and o.paid_at >= v_month_start and o.paid_at < v_month_end),
    (select coalesce(sum(o.amount), 0)::bigint from public.boost_orders o
      where o.status = 'PAID' and o.paid_at >= v_month_start and o.paid_at < v_month_end),
    (select coalesce(sum(o.amount), 0)::bigint from public.demand_boost_orders o
      where o.status = 'PAID' and o.paid_at >= v_month_start and o.paid_at < v_month_end),
    -- demand_boost_orders không có trạng thái NEEDS_REVIEW (check constraint).
    ((select count(*) from public.saas_orders o where o.status = 'NEEDS_REVIEW')
      + (select count(*) from public.boost_orders o where o.status = 'NEEDS_REVIEW'))::integer;
end $$;

revoke execute on function public.admin_business_stats() from public, anon;
grant  execute on function public.admin_business_stats() to authenticated;

-- ══ 3. admin_list_subscriptions ══════════════════════════════════════════
-- Một dòng / tài khoản có gói. `status` đã quy đổi READ_ONLY khi quá hạn.
create or replace function public.admin_list_subscriptions()
returns table (
  seller_id   uuid,
  status      text,
  expire_date date,
  plan_name   text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid   uuid;
  v_today date;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if not public.has_role(v_uid, 'Admin') then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  v_today := (now() at time zone 'Asia/Ho_Chi_Minh')::date;

  return query
  select
    s.seller_id,
    case
      when s.status in ('TRIAL', 'ACTIVE') and (s.expire_date is null or s.expire_date < v_today)
        then 'READ_ONLY'
      else s.status
    end::text,
    s.expire_date,
    sp.name
  from public.user_subscriptions s
  left join public.subscription_plans sp on sp.id = s.plan_id;
end $$;

revoke execute on function public.admin_list_subscriptions() from public, anon;
grant  execute on function public.admin_list_subscriptions() to authenticated;
