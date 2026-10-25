-- Giá đẩy tin nhu cầu cho ra mắt công khai (chốt với chủ dự án 16/10/2026):
--   3 ngày = 5.000đ · 7 ngày = 10.000đ
-- Thay giá thử nghiệm 1.000/2.000đ của 20261015100000.
--
-- begin_demand_boost_checkout chỉ tái dùng đơn mở CÙNG giá ⇒ đơn cũ giá thử (nếu
-- còn) không bị tái dùng với giá mới. Frontend đọc giá từ đây, không cần build lại.
-- Idempotent: đặt đúng giá trị, chạy lại không đổi gì.
insert into public.platform_settings (key, value)
values ('demand_boost_config', '{"days":[3,7],"price":[5000,10000]}'::jsonb)
on conflict (key) do update set value = excluded.value;
