-- ═══════════════════════════════════════════════════════════════════════════
-- 0600 — DEMAND POSTS: thêm những cột mà UI ĐANG GIẢ VỜ CÓ
--
-- VẤN ĐỀ: bảng chỉ có 6 cột (renter_id, kind, desired_districts, price_min,
-- price_max, status). Nhưng DemandPostCard (HomePage.tsx:250) render `name`,
-- `initials`, `title`, `roomType`, `moveIn`, `amenities`, `needed`,
-- `requirements` — và mapper ở HomePage.tsx:1184-1207 HARDCODE toàn bộ:
--
--     initials: "ND"                     name: "Khách tìm trọ"
--     roomType: "Phòng trọ / Căn hộ"     moveIn: "Dọn vào trong tháng"
--     amenities: ["Wifi","WC riêng","Tự do"]
--     needed: "Cần 1 người"              requirements: ["Sạch sẽ","Gọn gàng","Vui vẻ"]
--
-- Migration này là thứ biến card giả thành card thật. name/initials sẽ lấy từ
-- join `profiles` theo renter_id, không hardcode.
--
-- DEVIATION so với spec 02 (cố ý, xem 02_SCHEMA_DECISIONS.md §12):
--   Giữ MỘT bảng demand_posts + cột `kind` thay vì tách RoomWantedPost +
--   RoommateWantedPost. Bảng đã ship kèm RLS và code client; tách là churn
--   không đổi lấy chức năng nào.
--
-- Idempotent: chạy lại an toàn.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.demand_posts
  -- ── Chung cho cả 2 kind ─────────────────────────────────────────────────
  add column if not exists title              text,
  add column if not exists description        text,
  add column if not exists contact_name       text,
  add column if not exists contact_phone      text,

  -- ── RoomWanted ──────────────────────────────────────────────────────────
  add column if not exists property_type      text,
  add column if not exists min_area           numeric,
  add column if not exists desired_amenities  text[] not null default '{}',
  add column if not exists move_in_date       date,
  add column if not exists occupant_count     integer,

  -- ── RoommateWanted ──────────────────────────────────────────────────────
  add column if not exists current_address    text,
  add column if not exists district           text,
  add column if not exists share_price        numeric,
  add column if not exists needed_count       integer,
  add column if not exists gender_requirement text
      check (gender_requirement in ('Any', 'Male', 'Female')),
  add column if not exists requirements       text[] not null default '{}';

-- ── BACKFILL title bằng ĐÚNG chuỗi mapper hiện đang synthesize ────────────
-- Để row seed cũ vẫn render giống trước, rồi mới set NOT NULL.
update public.demand_posts
  set title = 'Tìm phòng tại ' || array_to_string(desired_districts, ', ')
  where title is null and kind = 'RoomWanted';

update public.demand_posts
  set title = 'Tìm bạn ở ghép tại ' || array_to_string(desired_districts, ', ')
  where title is null and kind = 'RoommateWanted';

-- An toàn cuối: nếu desired_districts rỗng thì chuỗi trên ra ''
update public.demand_posts set title = 'Tin nhu cầu' where coalesce(title, '') = '';

alter table public.demand_posts alter column title set not null;

-- ── Mặc định hợp lý cho row cũ ────────────────────────────────────────────
update public.demand_posts set needed_count = 1
  where kind = 'RoommateWanted' and needed_count is null;
update public.demand_posts set gender_requirement = 'Any'
  where kind = 'RoommateWanted' and gender_requirement is null;
update public.demand_posts set occupant_count = 1
  where kind = 'RoomWanted' and occupant_count is null;

-- ── RÀNG BUỘC SHAPE THEO KIND ─────────────────────────────────────────────
-- `not valid`: row đã tồn tại được miễn kiểm; row MỚI vẫn bị enforce.
alter table public.demand_posts drop constraint if exists demand_roommate_shape;
alter table public.demand_posts add constraint demand_roommate_shape
  check (kind <> 'RoommateWanted' or needed_count is not null) not valid;

alter table public.demand_posts drop constraint if exists demand_price_range;
alter table public.demand_posts add constraint demand_price_range
  check (price_max >= price_min) not valid;
