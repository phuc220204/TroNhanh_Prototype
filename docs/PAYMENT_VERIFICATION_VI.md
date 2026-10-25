# Kiểm chứng thanh toán bằng giao dịch thật — gói SaaS & đẩy tin nhu cầu

Cập nhật: 16/10/2026. Đi kèm: `scripts/sql/verify-payos/*.sql` (chỉ đọc).

## Vì sao cần

Gói Quản lý vận hành đã bán công khai nhưng **chưa có đơn nào PAID**. Hiện có
2 đơn `LINKED` (link đã hết hạn, chưa trả) và 3 đơn `CANCELLED`. Chưa ai từng
thấy webhook payOS kích hoạt gói bằng tiền thật.

## Đã kiểm sẵn trước giao dịch (16/10/2026)

| Hạng mục | Kết quả |
|---|---|
| Phần DB của luồng gói (`begin_saas_checkout` → `attach_saas_checkout_link` → `complete_verified_saas_payment`) chạy trên production trong `begin … rollback` | ✅ Đơn tạo đúng giá 200.000đ; sai số tiền bị chặn `SAAS_PAYMENT_MISMATCH`; trả tiền ⇒ gói `ACTIVE` +12 tháng, có `payments` `Subscription` 200.000đ; webhook lặp lại không cộng lần hai. Đã rollback, không để lại dữ liệu (chỉ tiêu 1 số `order_code`). |
| Webhook payOS → Supabase còn sống | ✅ Có 2 đơn Boost `PAID` qua webhook thật (28/09, 07/10). URL đăng ký: `…/functions/v1/payos-webhook`. |
| Edge Function | ✅ `payos-create-saas-checkout`, `payos-create-demand-checkout`, `payos-webhook`, `payos-check-status` đều `ACTIVE`. |
| Secret | ✅ `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_CHECKOUT_ENABLED`, `PAYOS_SITE_ORIGIN` có đủ (chỉ kiểm tên, không đọc giá trị). |
| Giá đẩy tin nhu cầu | ✅ Đã đổi từ giá thử 1.000/2.000đ sang **5.000đ / 3 ngày · 10.000đ / 7 ngày** (migration `20261016150000`). |

Phần **chưa** kiểm được nếu không có tiền thật: payOS gọi webhook cho một đơn
**gói** (nhánh `complete_verified_saas_payment` trong webhook), và trang
`/chu-tro/goi-dich-vu` đổi trạng thái sau khi quay về.

## Thứ tự đề xuất (rẻ trước, đắt sau)

### Bước 1 — Đẩy tin nhu cầu 5.000đ

Mục đích là kiểm webhook với đơn loại mới bằng số tiền nhỏ.

1. Đăng nhập trên **https://tronhanh.vercel.app**. Không dùng localhost: `PAYOS_SITE_ORIGIN` chỉ cho phép domain production.
2. Mở `/tai-khoan/tin-nhu-cau`, chọn một tin đang hiển thị của bạn, bấm **Đẩy tin**, chọn gói 3 ngày (5.000đ).
3. Quét QR trên payOS và chuyển khoản. Quay lại Trọ Nhanh và chờ thông báo xác nhận.
4. Chạy:
   ```bash
   pnpm exec supabase db query --linked --file scripts/sql/verify-payos/demand-boost-orders.sql
   ```
   Đơn mới nhất phải có `status = PAID` và `ok_boost = true`.
5. Mở `/tin-nhu-cau` ở cửa sổ ẩn danh: tin đó phải nằm trên cùng, có nhãn "Nổi bật".

### Bước 2 — Gói Quản lý vận hành (Gói 1 năm, 200.000đ)

Không có gói giá thấp để thử. Tạo gói tạm thì gói đó sẽ hiện trên `/bang-gia`.
Tiền về tài khoản payOS của chính bạn, chỉ mất phí giao dịch.

1. Dùng tài khoản chủ trọ **thật** của bạn. Không dùng tài khoản `@tronhanh.demo`, vì nhóm đó sẽ bị xóa trước production.
2. Mở `/chu-tro/goi-dich-vu`. Nếu #18 đã merge thì tick ô đồng ý. Bấm **Mua gói** ở Gói 1 năm.
3. Chuyển khoản **một lần duy nhất**. Quay lại, trang hiện "Đang kiểm tra thanh toán…" rồi "Đã nhận thanh toán 200.000đ".
4. Chạy:
   ```bash
   pnpm exec supabase db query --linked --file scripts/sql/verify-payos/saas-orders.sql
   ```
   Kỳ vọng ở hàng mới nhất:
   - `status = PAID`, `payos_reference` có giá trị;
   - `payment_amount = 200000`, `ok_payment = true`;
   - `subscription_status = ACTIVE`, `ok_subscription = true`;
   - `expire_date` = hôm nay + 12 tháng, hoặc ngày hết hạn cũ + 12 tháng nếu gói đang còn hạn.
5. Tải lại `/chu-tro`: không còn màn mời dùng thử; các nút tạo/sửa dùng được.

## Nếu có gì sai

| Triệu chứng | Làm gì |
|---|---|
| Đơn đứng ở `LINKED` sau vài phút dù đã chuyển tiền | **Không thanh toán lần hai.** Xem Supabase Dashboard → Edge Functions → `payos-webhook` → Logs. Xem lần giao hàng webhook trên payOS Dashboard. Webhook trả 503 thì payOS tự gửi lại. |
| Đơn `NEEDS_REVIEW` | Tiền đã nhận nhưng lệch dữ liệu. Giữ nguyên đơn, đối soát với sao kê payOS, hoàn tiền theo `/chinh-sach-hoan-tien`. |
| `ok_payment` / `ok_subscription` = `false` với đơn `PAID` | Lỗi trong `complete_verified_saas_payment`. Chụp kết quả SQL và mở issue; **không** sửa tay `user_subscriptions`. |
| Cần dừng bán ngay | `pnpm exec supabase secrets set PAYOS_CHECKOUT_ENABLED=false`. Lệnh này tắt cả Boost, gói và đẩy tin nhu cầu; không cần deploy lại frontend. |

Không xóa `saas_orders`, `boost_orders`, `demand_boost_orders`, `payments`:
đó là sổ đối soát doanh thu.

## Sau khi cả hai bước PASS

- Ghi ngày, mã đơn và kết quả SQL vào cuối file này.
- Xóa dòng "Cần 1 giao dịch thật để xác nhận webhook kích hoạt gói" trong `PAYOS_PUBLIC_LAUNCH_VI.md`.
