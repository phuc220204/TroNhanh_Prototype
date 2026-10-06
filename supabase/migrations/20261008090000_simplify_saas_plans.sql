-- Đơn giản hóa gói SaaS chủ trọ (quyết định sản phẩm 2026-10-06):
--   * Dùng thử 15 ngày (trước: 30).
--   * Gói trả phí: 1 năm 200.000đ, 2 năm 350.000đ. Không có giá gia hạn riêng.
--   * KHÔNG giới hạn số khu / số phòng. Cột `max_properties` / `max_rooms` giữ
--     nguyên (NOT NULL từ init) nhưng không còn được đọc ở đâu — không áp dụng.
--
-- Cập nhật gói tại chỗ (không xóa): `user_subscriptions`, `saas_orders`,
-- `payments` đang tham chiếu id gói cũ. Khớp theo cả tên cũ lẫn tên mới để chạy
-- lại an toàn. Người đang ACTIVE giữ nguyên ngày hết hạn đã mua.
-- Đơn payOS đang mở với giá cũ không bị tái dùng: `begin_saas_checkout` chỉ tái
-- dùng đơn cùng gói CÙNG GIÁ.

update public.subscription_plans
set name = 'Gói 1 năm',
    duration_months = 12,
    price = 200000,
    renewal_price = 200000
where name in ('Gói Phổ thông', 'Gói 1 năm');

update public.subscription_plans
set name = 'Gói 2 năm',
    duration_months = 24,
    price = 350000,
    renewal_price = 350000
where name in ('Gói Chuyên nghiệp', 'Gói 2 năm');

-- Dùng thử 15 ngày. Thân hàm giữ nguyên bản 20260923010000, chỉ đổi số ngày.
create or replace function public.activate_subscription_trial()
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_plan     uuid;
  v_existing public.user_subscriptions;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- Hai click/tab đồng thời của cùng một tài khoản phải tuần tự; nếu chưa có
  -- row để `for update` khóa thì advisory lock vẫn ngăn tạo hai trial.
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  -- Mỗi tài khoản dùng thử đúng một lần: một row NONE cũ không được che một
  -- trial/ACTIVE khác.
  if exists (
    select 1 from public.user_subscriptions
    where seller_id = v_uid and status <> 'NONE'
  ) then
    raise exception 'SUBSCRIPTION_TRIAL_UNAVAILABLE' using errcode = 'P0001';
  end if;

  select * into v_existing
  from public.user_subscriptions
  where seller_id = v_uid and status = 'NONE'
  order by created_at
  limit 1
  for update;

  select id into v_plan
  from public.subscription_plans
  order by price, created_at
  limit 1;

  if v_existing.id is null then
    insert into public.user_subscriptions (
      seller_id, plan_id, start_date, expire_date, status
    ) values (
      v_uid, v_plan, current_date, current_date + 15, 'TRIAL'
    );
  else
    update public.user_subscriptions
    set plan_id = coalesce(plan_id, v_plan),
        start_date = current_date,
        expire_date = current_date + 15,
        status = 'TRIAL'
    where id = v_existing.id;
  end if;
end $$;

revoke execute on function public.activate_subscription_trial() from public, anon;
grant execute on function public.activate_subscription_trial() to authenticated;
