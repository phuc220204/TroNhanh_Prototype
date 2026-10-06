# Mở Boost công khai — runbook phát hành

> **Cập nhật 06/10/2026 — thay thế các bước về biến `VITE_*` của Boost bên dưới.**
> Frontend không còn đọc `VITE_ENABLE_BOOST_CHECKOUT`, `VITE_PAYOS_TEST_MODE`,
> `VITE_PAYOS_TEST_SELLER_ID` (có thể xóa trên Vercel). Trang đăng tin và Quản lý
> tin hỏi Edge Function `payos-boost-packages`; **bật/tắt Boost cho toàn hệ thống
> chỉ bằng secret Supabase `PAYOS_CHECKOUT_ENABLED`** (`true`/khác `true`), không
> cần build lại frontend. Chế độ test (allowlist seller, CORS localhost) đã bị gỡ.
> Link payOS hết hạn sau 15 phút; đơn chưa trả khác gói/giá hoặc quá 10 phút tự
> chuyển `CANCELLED` và được thay bằng đơn mới (tiền trả vào đơn cũ vẫn được ghi nhận).

> **Cập nhật 07/10/2026 — Mua/gia hạn gói SaaS qua payOS.** Bảng `saas_orders`
> (dải orderCode 300000000000+), RPC `begin_saas_checkout` / `attach_saas_checkout_link` /
> `complete_verified_saas_payment` (chỉ service_role), Edge Function
> `payos-create-saas-checkout`; `payos-webhook` xử lý cả đơn Boost lẫn đơn gói, `payos-check-status`
> trả `kind: "boost" | "saas"`. Giá lấy từ `subscription_plans` (mua lại cùng gói ⇒ `renewal_price`);
> gia hạn sớm cộng dồn từ ngày hết hạn. Trang người dùng: `/chu-tro/goi-dich-vu`. Dùng chung công tắc
> `PAYOS_CHECKOUT_ENABLED`. Cần 1 giao dịch thật để xác nhận webhook kích hoạt gói.

Cập nhật 01/10/2026. File này dành cho lần phát hành công khai đầu tiên, không
chứa khóa PayOS hoặc khóa Supabase.

## Đã hoàn tất trên Supabase

- `boost_config` đang dùng giá công khai: 7/15/30 ngày = **20.000/35.000/60.000đ**.
- `PAYOS_CHECKOUT_ENABLED=true`, `PAYOS_TEST_MODE=false`; allowlist seller test
  đã được gỡ.
- Bốn Edge Function PayOS đang `ACTIVE`; production origin đi được tới tầng
  xác thực, còn `localhost` bị từ chối như mong đợi khi không còn test mode.
- Webhook PayOS đã đăng ký. Không thay đổi ba secret PayOS trong runbook này.

## Việc cần làm trên Vercel

CLI Vercel trên máy hiện chưa đăng nhập. Chủ dự án cần đăng nhập trong browser
rồi chạy các lệnh dưới đây tại gốc repo:

```powershell
pnpm.cmd dlx vercel login
pnpm.cmd dlx vercel link
```

Ở bước `link`, chọn đúng project đang phục vụ `tronhanh.vercel.app`. Sau đó vào
Vercel Dashboard → Project → Settings → Environment Variables, áp dụng cho
**Production**:

| Biến | Giá trị |
| --- | --- |
| `VITE_ENABLE_BOOST_CHECKOUT` | `true` |
| `VITE_PAYOS_TEST_MODE` | `false` |
| `VITE_PAYOS_TEST_SELLER_ID` | **Xóa biến này** |
| `VITE_SUPABASE_URL` | Giữ URL project Supabase hiện tại |
| `VITE_SUPABASE_ANON_KEY` | Giữ publishable key hiện tại |

Không đưa `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, database
password hay service-role key vào Vercel `VITE_*`.

## Deploy đúng phiên bản

Worktree hiện còn nhiều thay đổi chưa commit, vì vậy không deploy mù từ một
thư mục chưa được rà. Sau khi chủ dự án rà/stage đúng code OC1-PayOS hoặc sau
khi phiên Codex hoàn tất commit, deploy production bằng một trong hai cách:

```powershell
# Cách Git integration: push nhánh/merge đã review vào Production Branch.
git push origin <production-branch>

# Hoặc Vercel CLI: chỉ dùng sau khi đã rà đúng worktree đang deploy.
pnpm.cmd dlx vercel --prod
```

Mỗi lần thay đổi biến `VITE_*` phải tạo **deployment mới**, vì Vite nhúng chúng
vào bundle lúc build.

## Smoke test sau deploy

1. Mở cửa sổ ẩn danh, đăng nhập bằng một seller bất kỳ; vào Đăng tin và xác
   nhận thấy lựa chọn Boost với giá 20k/35k/60k.
2. Tạo tin đủ dữ liệu → chọn Boost → bấm gửi. Chỉ tiếp tục nếu sẵn sàng cho một
   giao dịch tiền thật; không bấm thanh toán thử nhiều lần.
3. Sau PayOS, đối soát `boost_orders` là `PAID_PENDING_APPROVAL` và đúng một
   payment `Boost` được tạo. Tin chưa được xuất hiện công khai.
4. Moderator duyệt tin; xác nhận đơn đổi thành `PAID`, `boost_expire_at` được
   tạo/gia hạn đúng số ngày, và listing mới được công khai/ưu tiên.
5. Kiểm tra seller khác chỉ xem được đơn của chính họ; webhook sai chữ ký hoặc
   lặp lại không tạo payment thứ hai.

## Rollback khẩn cấp

Nếu checkout lỗi hoặc phát hiện sai giá, đóng backend trước để chặn tạo đơn mới:

```powershell
pnpm.cmd exec supabase secrets set PAYOS_CHECKOUT_ENABLED=false
```

Sau đó đặt `VITE_ENABLE_BOOST_CHECKOUT=false` trên Vercel và deploy lại. Không
xóa `boost_orders` hay `payments`: các đơn đã nhận tiền cần giữ lại để đối soát
và xử lý hoàn tiền theo chính sách vận hành.
