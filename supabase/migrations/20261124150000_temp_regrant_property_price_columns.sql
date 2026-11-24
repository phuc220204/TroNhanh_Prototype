-- ═══════════════════════════════════════════════════════════════════════════
-- TẠM THỜI — mở lại quyền UPDATE 3 cột giá cũ của `properties`.
--
-- VÌ SAO: T40 (`20261124120000_property_services.sql`) revoke UPDATE trên
-- electricity_unit_price / water_unit_price / service_fee vì danh mục dịch vụ
-- là nguồn chân lý. Nhưng frontend đang deploy (bản trước T40) vẫn gửi 3 cột
-- này CÙNG LÚC với tài khoản ngân hàng ở "Cài đặt khu" ⇒ cả lệnh UPDATE bị từ
-- chối và chủ trọ không lưu được STK.
--
-- Frontend mới không ghi 3 cột này. Trong thời gian chuyển tiếp, giá do bản cũ
-- ghi có thể lệch danh mục cho tới lần đổi dịch vụ kế tiếp (trigger
-- `sync_legacy_service_prices` ghi đè lại).
--
-- ⚠️ DỌN SAU KHI DEPLOY frontend mới: migration revoke lại 3 cột này (cùng lúc
-- drop `create_invoice_with_items`) — xem docs/cp4/tasks/T41_invoice_v2.md.
-- Idempotent: grant chạy lại không sao.
-- ═══════════════════════════════════════════════════════════════════════════

grant update (electricity_unit_price, water_unit_price, service_fee)
  on public.properties to authenticated;
