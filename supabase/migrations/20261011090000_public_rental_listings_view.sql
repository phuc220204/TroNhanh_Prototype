-- BR-014 (làm lại): khách đọc tin qua VIEW thay vì quyền theo cột.
--
-- 20261009100000 thu hồi quyền cột contact_phone của anon, nhưng PostgREST sắp
-- xếp theo trường tính toán `is_boost_active(rental_listings)` (BR-005) — hàm
-- nhận CẢ DÒNG nên cần quyền SELECT mọi cột ⇒ khách bị 42501, trang chủ / tất cả
-- phòng không hiện tin (2026-10-07). Đã khôi phục khẩn `grant select … to anon`;
-- migration này ghi lại việc đó để repo khớp DB.
--
-- Hướng đúng (giống public_demand_posts): view allow-list cột, có sẵn cột
-- `is_boost_active` và `contact_phone_masked`, KHÔNG có contact_phone.
-- Bước sau (20261011100000, push SAU khi frontend đọc view đã deploy): thu hồi
-- SELECT bảng của anon, chỉ chừa id/status/deleted_at cho policy listing_media,
-- listing_amenities.
-- Idempotent.

-- Khôi phục khẩn (đã chạy tay trên production 2026-10-07).
grant select on public.rental_listings to anon;

create or replace view public.public_rental_listings
with (security_invoker = false) as
select
  l.id, l.seller_id, l.room_id, l.title, l.property_type, l.price, l.district, l.area, l.status,
  l.boost_expire_at, l.created_at, l.updated_at, l.deleted_at, l.contact_name, l.address,
  l.description, l.approved_at, l.expire_at,
  l.view_count, l.property_id, l.electricity_price, l.water_price, l.water_unit, l.service_price,
  l.deposit, l.access_policy, l.access_open_time, l.access_close_time, l.latitude, l.longitude,
  l.metadata, l.province_code, l.ward_code, l.boost_payment_verified, l.first_published_at,
  l.contact_phone_masked,
  (coalesce(l.boost_payment_verified, false)
     and l.boost_expire_at is not null
     and l.boost_expire_at > now()) as is_boost_active
from public.rental_listings l
-- security_invoker = false bỏ qua RLS ⇒ lặp lại đúng điều kiện của policy
-- "Public view active listings".
where l.status = 'Active' and l.deleted_at is null;

comment on view public.public_rental_listings is
  'Tin đang hiển thị cho khách: allow-list cột, không có contact_phone (BR-014). Thêm cột công khai ⇒ thêm vào view.';

grant select on public.public_rental_listings to anon, authenticated;
