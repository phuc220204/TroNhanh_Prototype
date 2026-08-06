-- ═══════════════════════════════════════════════════════════════════════════
-- T32 — Dọn sạch dữ liệu nghiệp vụ, đưa app về trạng thái "mới tinh"
--
-- ⚠️⚠️ FILE NÀY CỐ Ý **KHÔNG** NẰM TRONG `supabase/migrations/`. ⚠️⚠️
--
-- Migration được chạy tự động trên MỌI môi trường mà `supabase db push` trỏ tới.
-- Một file `truncate` đặt trong đó là quả bom hẹn giờ: ngày nào đó ai đó push
-- lên production và toàn bộ dữ liệu khách hàng biến mất, đúng quy trình, không
-- ai làm gì sai cả. Việc xóa dữ liệu phải là hành động THỦ CÔNG, CÓ CHỦ Ý,
-- chạy đúng một lần, do người biết mình đang làm gì bấm nút.
--
-- CÁCH CHẠY: Supabase Dashboard → SQL Editor → dán toàn bộ file này → Run.
--
-- KHÔNG HOÀN TÁC ĐƯỢC. Đọc phần "GIỮ LẠI" bên dưới trước khi chạy.
--
-- ── XÓA (16 bảng dữ liệu nghiệp vụ) ────────────────────────────────────────
--   Khu trọ · phòng · người ở · hợp đồng · chỉ số điện nước · hóa đơn ·
--   thanh toán · tin cho thuê · tin nhu cầu · ảnh & tiện ích tin · đánh giá ·
--   hội thoại · tin nhắn · log kiểm duyệt
--
-- ── GIỮ LẠI (5 bảng) ───────────────────────────────────────────────────────
--   auth.users        — 4 tài khoản demo, đăng nhập lại được ngay
--   profiles          — hồ sơ của 4 tài khoản đó
--   user_roles        — vai trò Admin (mất cái này là mất luôn đường vào /quan-tri)
--   subscription_plans — cấu hình gói dịch vụ
--   platform_settings  — cấu hình nền tảng (chế độ kiểm duyệt Tự động/Thủ công)
--   user_subscriptions — trạng thái gói của từng seller, để không phải kích hoạt lại
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- Một lệnh TRUNCATE cho tất cả các bảng: Postgres xử lý được vòng khóa ngoại
-- giữa `occupancies` và `contracts` (hai đường FK, xem migration 20260801100000)
-- khi cả hai cùng nằm trong một lệnh.
--
-- CỐ Ý KHÔNG dùng `CASCADE`: nếu danh sách này thiếu một bảng có FK trỏ tới,
-- Postgres sẽ báo lỗi và dừng — đó là điều TỐT. `CASCADE` sẽ lặng lẽ xóa lan
-- sang những bảng không có trong danh sách, kể cả bảng ta định giữ.
truncate table
  public.payments,
  public.invoice_items,
  public.invoices,
  public.utility_readings,
  public.reviews,
  public.messages,
  public.conversations,
  public.moderation_logs,
  public.listing_media,
  public.listing_amenities,
  public.rental_listings,
  public.demand_posts,
  public.contracts,
  public.occupancies,
  public.rooms,
  public.properties
restart identity;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- KIỂM TRA SAU KHI CHẠY — mọi dòng "phải rỗng" đều phải = 0,
-- và mọi dòng "phải còn" đều phải > 0. Nếu lệch, ĐỪNG dùng tiếp, hỏi lại.
-- ═══════════════════════════════════════════════════════════════════════════
select 'properties'         as bang, count(*) as so_dong, 'phải rỗng' as ky_vong from public.properties
union all select 'rooms',           count(*), 'phải rỗng' from public.rooms
union all select 'occupancies',     count(*), 'phải rỗng' from public.occupancies
union all select 'contracts',       count(*), 'phải rỗng' from public.contracts
union all select 'invoices',        count(*), 'phải rỗng' from public.invoices
union all select 'invoice_items',   count(*), 'phải rỗng' from public.invoice_items
union all select 'payments',        count(*), 'phải rỗng' from public.payments
union all select 'utility_readings',count(*), 'phải rỗng' from public.utility_readings
union all select 'rental_listings', count(*), 'phải rỗng' from public.rental_listings
union all select 'listing_media',   count(*), 'phải rỗng' from public.listing_media
union all select 'listing_amenities',count(*),'phải rỗng' from public.listing_amenities
union all select 'demand_posts',    count(*), 'phải rỗng' from public.demand_posts
union all select 'reviews',         count(*), 'phải rỗng' from public.reviews
union all select 'conversations',   count(*), 'phải rỗng' from public.conversations
union all select 'messages',        count(*), 'phải rỗng' from public.messages
union all select 'moderation_logs', count(*), 'phải rỗng' from public.moderation_logs
union all select '── GIỮ LẠI ──',   null,     ''
union all select 'profiles',        count(*), 'phải còn 4' from public.profiles
union all select 'user_roles',      count(*), 'phải còn ≥1 (Admin)' from public.user_roles
union all select 'subscription_plans', count(*), 'phải còn' from public.subscription_plans
union all select 'platform_settings',  count(*), 'phải còn' from public.platform_settings
union all select 'user_subscriptions', count(*), 'phải còn' from public.user_subscriptions;

-- ═══════════════════════════════════════════════════════════════════════════
-- CÒN MỘT THỨ SQL Ở TRÊN KHÔNG DỌN ĐƯỢC: ẢNH ĐÃ UPLOAD
--
-- Xóa `rental_listings` KHÔNG xóa file ảnh trong Supabase Storage. Bucket
-- `listing-images` sẽ còn nguyên ảnh mồ côi — không hiện ở đâu trong app,
-- nhưng vẫn tính vào dung lượng.
--
-- Dọn bằng: Dashboard → Storage → bucket `listing-images` → chọn tất cả → Delete.
-- (Hoặc bỏ qua — ảnh mồ côi không ảnh hưởng luồng nào, chỉ tốn chỗ.)
-- ═══════════════════════════════════════════════════════════════════════════
