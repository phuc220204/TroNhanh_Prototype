-- Đơn payOS bị bỏ dở tự chuyển "Hết hạn" (EXPIRED).
--
-- Edge Function `payos-create-*` xin link payOS sống 15 phút (`expiredAt`).
-- Trước đây đơn trong DB vẫn PENDING/LINKED mãi mãi nếu người dùng đóng tab
-- thay vì bấm "Hủy" — chỉ chuyển CANCELLED khi chính họ tạo đơn mới. Trang
-- /quan-tri/doanh-thu vì vậy đầy đơn "Đã tạo link thanh toán" cũ.
--
-- Giờ: job pg_cron mỗi 5 phút chuyển đơn PENDING/LINKED chưa nhận tiền và tạo
-- quá 30 phút (15 phút link + 15 phút đệm cho chuyển khoản đang dở) → EXPIRED.
--
-- An toàn tiền: `complete_verified_*_payment` chỉ bỏ qua đơn đã PAID /
-- NEEDS_REVIEW (/PAID_PENDING_APPROVAL) ⇒ tiền về muộn cho đơn EXPIRED vẫn được
-- ghi nhận và cấp quyền lợi, giống đơn CANCELLED. `begin_*_checkout` chỉ tái
-- dùng đơn PENDING/LINKED ⇒ đơn EXPIRED không bị dùng lại.
--
-- Idempotent: drop constraint if exists / create or replace / cron.schedule theo tên.

-- ── 1. Thêm 'EXPIRED' vào check constraint của 3 bảng đơn ──────────────────
alter table public.saas_orders
  drop constraint if exists saas_orders_status_check;
alter table public.saas_orders
  add constraint saas_orders_status_check
  check (status in ('PENDING', 'LINKED', 'PAID', 'NEEDS_REVIEW', 'CANCELLED', 'EXPIRED'));

alter table public.boost_orders
  drop constraint if exists boost_orders_status_check;
alter table public.boost_orders
  add constraint boost_orders_status_check
  check (status in ('PENDING', 'LINKED', 'PAID_PENDING_APPROVAL', 'PAID', 'NEEDS_REVIEW', 'CANCELLED', 'EXPIRED'));

alter table public.demand_boost_orders
  drop constraint if exists demand_boost_orders_status_check;
alter table public.demand_boost_orders
  add constraint demand_boost_orders_status_check
  check (status in ('PENDING', 'LINKED', 'PAID', 'CANCELLED', 'EXPIRED'));

-- ── 2. Hàm dọn đơn quá hạn ──────────────────────────────────────────────────
-- Không client nào được gọi: chỉ pg_cron (chạy dưới role postgres).
create or replace function public.expire_stale_payment_orders()
returns integer
language plpgsql volatile security definer set search_path = public as $$
declare
  v_cutoff timestamptz := now() - interval '30 minutes';
  v_rows   integer;
  v_total  integer := 0;
begin
  update public.saas_orders
  set status = 'EXPIRED', updated_at = now()
  where status in ('PENDING', 'LINKED') and paid_at is null and created_at < v_cutoff;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  update public.boost_orders
  set status = 'EXPIRED', updated_at = now()
  where status in ('PENDING', 'LINKED') and paid_at is null and created_at < v_cutoff;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  update public.demand_boost_orders
  set status = 'EXPIRED', updated_at = now()
  where status in ('PENDING', 'LINKED') and paid_at is null and created_at < v_cutoff;
  get diagnostics v_rows = row_count;
  v_total := v_total + v_rows;

  return v_total;
end $$;

revoke execute on function public.expire_stale_payment_orders() from public, anon, authenticated;

-- ── 3. Job pg_cron ──────────────────────────────────────────────────────────
create extension if not exists pg_cron with schema pg_catalog;

-- cron.schedule theo tên là upsert ⇒ chạy lại migration không nhân đôi job.
select cron.schedule(
  'expire-stale-payment-orders',
  '*/5 * * * *',
  $$select public.expire_stale_payment_orders()$$
);

-- Áp ngay cho các đơn cũ, không đợi lần chạy đầu của job.
select public.expire_stale_payment_orders();
