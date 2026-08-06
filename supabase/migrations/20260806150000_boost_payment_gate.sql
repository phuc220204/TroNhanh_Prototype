-- ═══════════════════════════════════════════════════════════════════════════
-- Đóng lỗ boost: `boost_expire_at` chỉ được đặt qua RPC có ghi thanh toán
--
-- LỖ ĐANG CÓ (nghiêm trọng hơn dòng nợ đã ghi trong tài liệu):
--   Tài liệu ghi "bật boost khi SỬA tin bị bỏ qua" — nghe như một field bị quên.
--   Thực tế `boostListing()` ở frontend chạy:
--       supabase.from("rental_listings").update({ boost_expire_at: <ngày bất kỳ> })
--   Không qua RPC. KHÔNG ghi một dòng nào vào `payments`. Và
--   `create_listing_with_details` cũng nhận `boost_expire_at` thẳng từ jsonb
--   của client.
--
--   Cộng với BR-005 ("tin có boost_expire_at còn hạn xếp trước trong MỌI danh
--   sách"): bất kỳ ai đăng nhập đều đặt được boost_expire_at = 2030 bằng một
--   request PATCH và tin của họ xếp đầu marketplace vĩnh viễn, MIỄN PHÍ.
--
--   Đây đúng loại lỗ mà HANDOFF_REPORT §3.4 đã cảnh báo với `profiles.role`,
--   và vi phạm §6.1: `boost_expire_at` là giá trị chỉ tồn tại SAU khi trả tiền
--   ⇒ phải derive server-side, không nhận từ client.
--
-- CÁCH ĐÓNG — hai lớp, vì một lớp là không đủ:
--   1. RPC `boost_listing()` là đường DUY NHẤT hợp lệ: assert ownership → ghi
--      `payments` → mới set `boost_expire_at`.
--   2. Trigger chặn mọi đường khác. Không có trigger thì client vẫn PATCH thẳng
--      vào cột được, và RPC chỉ là một lựa chọn lịch sự.
--
-- RLS không giải quyết được việc này: RLS là row-level, không phải column-level.
-- Seller có quyền UPDATE tin của mình (đúng), nên không có policy nào tách được
-- "sửa tiêu đề" khỏi "tự cấp boost". Trigger là công cụ đúng ở đây.
--
-- Giá lấy từ `platform_settings.boost_config` (đã seed sẵn:
-- days [7,15,30] ↔ price [20000,35000,60000]) — KHÔNG hardcode trong RPC, và
-- KHÔNG nhận từ client.
--
-- Idempotent: create or replace + drop trigger if exists.
-- ═══════════════════════════════════════════════════════════════════════════

-- ══ 1. Trigger canh cột boost_expire_at ═══════════════════════════════════
-- Cho phép ghi chỉ khi đang ở trong RPC đã set cờ session-local. `set_config`
-- với tham số thứ ba = true nghĩa là cờ chỉ sống trong transaction hiện tại,
-- nên không thể rò rỉ sang request khác.
create or replace function public.guard_boost_expire_at()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_allowed boolean := coalesce(current_setting('app.allow_boost_write', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    if new.boost_expire_at is not null and not v_allowed then
      raise exception 'BOOST_REQUIRES_PAYMENT';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.boost_expire_at is distinct from old.boost_expire_at and not v_allowed then
      raise exception 'BOOST_REQUIRES_PAYMENT';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_guard_boost_expire_at on public.rental_listings;
create trigger trg_guard_boost_expire_at
  before insert or update on public.rental_listings
  for each row execute function public.guard_boost_expire_at();

-- ══ 2. boost_listing — đường duy nhất đặt được boost ══════════════════════
-- Trả về `boost_expire_at` mới để UI hiển thị đúng ngày hết hạn thật, thay vì
-- tự tính lại ở client rồi lệch với DB.
create or replace function public.boost_listing(
  p_listing_id uuid,
  p_days       integer
) returns timestamptz
language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid       uuid;
  v_seller    uuid;
  v_current   timestamptz;
  v_config    jsonb;
  v_index     integer;
  v_price     numeric;
  v_new_until timestamptz;
begin
  v_uid := auth.uid();
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;

  select seller_id, boost_expire_at into v_seller, v_current
    from public.rental_listings
   where id = p_listing_id and deleted_at is null
     for update;

  if v_seller is null  then raise exception 'LISTING_NOT_FOUND'; end if;
  if v_seller <> v_uid then raise exception 'FORBIDDEN'; end if;

  -- Gói và giá đều từ platform_settings. Client chỉ nói "tôi muốn N ngày";
  -- N phải nằm trong danh sách gói, và giá do server tra ra.
  select value into v_config from public.platform_settings where key = 'boost_config';
  if v_config is null then raise exception 'BOOST_CONFIG_MISSING'; end if;

  select ordinality - 1 into v_index
    from jsonb_array_elements(v_config -> 'days') with ordinality as d(val, ordinality)
   where (d.val)::integer = p_days
   limit 1;

  if v_index is null then raise exception 'INVALID_BOOST_PACKAGE'; end if;

  v_price := ((v_config -> 'price') -> v_index)::numeric;

  -- Còn hạn thì CỘNG DỒN, không ghi đè: người dùng đã trả tiền cho phần còn lại.
  v_new_until := greatest(coalesce(v_current, now()), now()) + (p_days || ' days')::interval;

  -- Thanh toán giả lập (AS-002): chưa có cổng thật, nhưng đường ghi đã đúng —
  -- sau này nối cổng vào chỉ cần thay chỗ tạo dòng payments này.
  insert into public.payments (invoice_id, owner_id, amount, method, paid_at, purpose)
  values (null, v_uid, v_price, 'BankTransfer', now(), 'Boost');

  -- Mở cờ cho trigger, chỉ trong transaction này.
  perform set_config('app.allow_boost_write', 'on', true);

  update public.rental_listings
     set boost_expire_at = v_new_until,
         updated_at      = now()
   where id = p_listing_id;

  return v_new_until;
end $$;

revoke execute on function public.boost_listing(uuid, integer) from public, anon;
grant  execute on function public.boost_listing(uuid, integer) to authenticated;
