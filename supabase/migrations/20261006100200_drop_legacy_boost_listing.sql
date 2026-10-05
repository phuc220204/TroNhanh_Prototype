-- Dọn trước khi mở thị trường: boost_listing() là RPC Boost giả lập cũ, đã bị
-- vô hiệu ở 20260923110000 (luôn raise, không ai có quyền gọi). Boost giờ chỉ đi
-- qua payOS (begin_boost_checkout + webhook) nên xóa hẳn cho sạch schema.
drop function if exists public.boost_listing(uuid, integer);
