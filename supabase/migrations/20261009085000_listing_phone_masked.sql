-- BR-014 bước 1/2: cột SĐT đã che cho khách chưa đăng nhập.
-- Chỉ THÊM cột (vô hại) — frontend mới đọc cột này cho khách. Bước 2 (thu hồi
-- quyền đọc contact_phone của anon) ở 20261009100000, push SAU khi deploy frontend.

alter table public.rental_listings
  add column if not exists contact_phone_masked text
  generated always as (
    case
      when contact_phone is null or length(contact_phone) < 7 then null
      else left(contact_phone, 4) || '***' || right(contact_phone, 3)
    end
  ) stored;

