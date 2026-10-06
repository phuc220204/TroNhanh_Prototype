-- BR-014 bước 2/2: khách (anon) không đọc được rental_listings.contact_phone.
-- ⚠️ Chỉ push SAU khi frontend dùng LISTING_PUBLIC_COLUMNS đã lên production:
-- frontend cũ đọc `select("*")` khi chưa đăng nhập sẽ bị "permission denied".
-- Idempotent.

-- Quyền theo CỘT: thu hồi quyền cả bảng rồi cấp lại từng cột (trừ contact_phone).
-- ⚠️ Cột thêm vào rental_listings sau migration này KHÔNG tự hiện cho khách —
-- phải grant tay cho anon nếu là dữ liệu công khai.
revoke select on public.rental_listings from anon;
grant select (
  id, seller_id, room_id, title, property_type, price, district, area, status,
  boost_expire_at, created_at, updated_at, deleted_at, contact_name, address,
  description, rejection_reason, approved_at, expire_at, moderated_by, moderated_at,
  view_count, property_id, electricity_price, water_price, water_unit, service_price,
  deposit, access_policy, access_open_time, access_close_time, latitude, longitude,
  metadata, province_code, ward_code, boost_payment_verified, first_published_at,
  contact_phone_masked
) on public.rental_listings to anon;

