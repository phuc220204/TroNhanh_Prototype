-- BR-014 bước cuối: khách (anon) không đọc thẳng bảng rental_listings nữa —
-- đọc qua view public_rental_listings (20261011090000).
-- ⚠️ Chỉ push SAU khi frontend đọc view đã deploy lên production.
--
-- Chừa đúng các cột mà policy công khai của listing_media / listing_amenities
-- tham chiếu (`exists (select 1 from rental_listings where id = … and status …
-- and deleted_at is null)`) — thiếu là ảnh/tiện ích của tin biến mất với khách.
-- Idempotent.

revoke select on public.rental_listings from anon;
grant select (id, status, deleted_at) on public.rental_listings to anon;
