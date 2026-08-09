-- ═══════════════════════════════════════════════════════════════════════════
-- Đơn vị hành chính theo mô hình 2 CẤP (sau sáp nhập 01/07/2025)
--
-- NGHIỆP VỤ: từ 01/07/2025, Nghị quyết 1685/NQ-UBTVQH15 bỏ cấp quận/huyện trên
-- cả nước. Còn hai cấp: tỉnh/thành → phường/xã/đặc khu. TP.HCM sáp nhập với
-- Bình Dương và Bà Rịa – Vũng Tàu, thành 168 đơn vị cấp xã.
--
-- Hệ quả cho dữ liệu đang có: cột `district` chứa "Quận 7", "Bình Thạnh"… —
-- những đơn vị KHÔNG CÒN TỒN TẠI. Và với phạm vi toàn quốc thì một mình tên
-- phường cũng không đủ định danh: "Phường 1" có ở rất nhiều tỉnh.
--
-- ── VÌ SAO LƯU CẢ MÃ LẪN TÊN ──────────────────────────────────────────────
-- `province_code` / `ward_code` là SỰ THẬT để lọc và tra cứu — mã của Cục Thống
-- kê ổn định, tên thì có thể được đặt lại.
-- `district` giữ nguyên vai trò TÊN HIỂN THỊ (từ giờ chứa tên phường/xã), là
-- ảnh chụp tại thời điểm đăng tin. Nhờ vậy mọi chỗ render `row.district` hiện
-- có vẫn chạy, và tin cũ vẫn đọc được sau này dù đơn vị hành chính lại đổi tên.
--
-- Cố ý KHÔNG thêm foreign key tới một bảng danh mục: danh mục hành chính nằm ở
-- `src/shared/constants/vn-*.generated.ts` (sinh bằng `scripts/gen-vn-regions.mjs`),
-- không ở DB. Dựng thêm bảng danh mục nghĩa là có hai nguồn chân lý phải đồng
-- bộ tay mỗi lần nhà nước sắp xếp lại đơn vị.
--
-- Toàn bộ là ADD COLUMN nullable ⇒ không phá dữ liệu đang có, không cần backfill
-- để migration chạy được. Việc dọn dữ liệu demo cũ làm riêng bằng seed script.
--
-- Idempotent: add column if not exists + create index if not exists.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.rental_listings
  add column if not exists province_code integer,
  add column if not exists ward_code     integer;

comment on column public.rental_listings.province_code is
  'Mã tỉnh/thành (Cục Thống kê, mô hình 2 cấp từ 01/07/2025). NULL = tin cũ chưa chuẩn hóa.';
comment on column public.rental_listings.ward_code is
  'Mã phường/xã/đặc khu. Duy nhất toàn quốc. NULL = tin cũ chưa chuẩn hóa.';
comment on column public.rental_listings.district is
  'TÊN HIỂN THỊ của phường/xã tại thời điểm đăng (ảnh chụp). Lọc thì dùng ward_code.';

alter table public.properties
  add column if not exists province_code integer,
  add column if not exists ward_code     integer;

alter table public.demand_posts
  add column if not exists desired_province_code integer,
  add column if not exists desired_ward_codes    integer[] not null default '{}';

comment on column public.demand_posts.desired_ward_codes is
  'Mã các phường/xã người tìm trọ muốn. Rỗng = không giới hạn trong tỉnh đã chọn.';

-- ── Index cho đường lọc chính ──────────────────────────────────────────────
-- Lọc theo tỉnh là thao tác phổ biến nhất ở marketplace; lọc sâu tới phường là
-- thao tác thứ hai. `where deleted_at is null` cho khớp mọi truy vấn đang có.
create index if not exists idx_listings_province on public.rental_listings (province_code, status)
  where deleted_at is null;
create index if not exists idx_listings_ward     on public.rental_listings (ward_code, status)
  where deleted_at is null;

create index if not exists idx_demand_province   on public.demand_posts (desired_province_code, status)
  where deleted_at is null;
create index if not exists idx_demand_wards      on public.demand_posts using gin (desired_ward_codes);
