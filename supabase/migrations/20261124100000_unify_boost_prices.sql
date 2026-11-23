-- Đồng bộ giá đẩy tin cho thuê & tin nhu cầu (chốt với chủ dự án 24/11/2026):
--   3 ngày = 8.000đ · 7 ngày = 15.000đ · 15 ngày = 28.000đ · 30 ngày = 50.000đ
-- Áp dụng cho CẢ `boost_config` (RentalListing) lẫn `demand_boost_config` (DemandPost).
-- Trước đó: boost 7/15/30 = 20k/35k/60k; demand 3/7 = 5k/10k.
--
-- Đổi cả danh sách số ngày nên không sửa được qua form admin (form chỉ đổi giá).
-- RPC checkout tra giá theo vị trí trong `days` và chỉ tái dùng đơn mở CÙNG giá
-- ⇒ đơn payOS còn mở với giá cũ không bị tái dùng.
-- Idempotent: đặt đúng giá trị, chạy lại không đổi gì.
insert into public.platform_settings (key, value) values
  ('boost_config',        '{"days":[3,7,15,30],"price":[8000,15000,28000,50000]}'::jsonb),
  ('demand_boost_config', '{"days":[3,7,15,30],"price":[8000,15000,28000,50000]}'::jsonb)
on conflict (key) do update set value = excluded.value;
