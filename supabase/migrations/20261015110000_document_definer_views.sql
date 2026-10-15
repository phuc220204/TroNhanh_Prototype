-- ═══════════════════════════════════════════════════════════════════════════
-- Ghi nhận: 3 view công khai CỐ Ý chạy `security_invoker = false`.
--
-- Supabase Advisor (lint 0010 security_definer_view) báo CRITICAL cho
-- property_public_profiles, public_demand_posts, public_rental_listings. Đây là
-- false-positive có chủ đích — CLAUDE.md §3.2: RLS là row-level, không phải
-- column-level, nên phần công khai của bảng có cột nhạy cảm (STK ngân hàng, SĐT
-- đầy đủ) phải đi qua view allow-list cột. Biên bảo mật là DANH SÁCH CỘT + WHERE
-- bên trong view.
--
-- ⚠️ KHÔNG "sửa" theo gợi ý Advisor sang `security_invoker = true`: anon khi đó
-- cần policy SELECT trên bảng gốc ⇒ lộ toàn bộ cột; không thêm policy thì
-- marketplace công khai trống.
--
-- Migration chỉ gắn comment, không đổi định nghĩa view. Idempotent.
-- Xem docs/cp4/02_SCHEMA_DECISIONS.md §14.
-- ═══════════════════════════════════════════════════════════════════════════

comment on view public.property_public_profiles is
  'INTENTIONAL security_invoker=false (CLAUDE.md §3.2): allow-list cột hồ sơ khu công khai, KHÔNG có STK ngân hàng/đơn giá; chỉ khu bật is_public_profile_enabled. Không đổi sang invoker. Thêm cột ⇒ chỉ cột an toàn công khai.';

comment on view public.public_demand_posts is
  'INTENTIONAL security_invoker=false (CLAUDE.md §3.2): allow-list cột tin nhu cầu Active chưa xóa; che SĐT và địa chỉ với anon. Không đổi sang invoker. Thêm cột ⇒ chỉ cột an toàn công khai.';

comment on view public.public_rental_listings is
  'INTENTIONAL security_invoker=false (CLAUDE.md §3.2): tin đang hiển thị cho khách, allow-list cột, không có contact_phone (BR-014). Không đổi sang invoker. Thêm cột công khai ⇒ thêm vào view.';
