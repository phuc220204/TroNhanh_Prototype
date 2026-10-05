# Tích hợp payOS cho Boost

> **Cập nhật 06/10/2026 — thay thế các bước về biến `VITE_*` của Boost bên dưới.**
> Frontend không còn đọc `VITE_ENABLE_BOOST_CHECKOUT`, `VITE_PAYOS_TEST_MODE`,
> `VITE_PAYOS_TEST_SELLER_ID` (có thể xóa trên Vercel). Trang đăng tin và Quản lý
> tin hỏi Edge Function `payos-boost-packages`; **bật/tắt Boost cho toàn hệ thống
> chỉ bằng secret Supabase `PAYOS_CHECKOUT_ENABLED`** (`true`/khác `true`), không
> cần build lại frontend. Chế độ test (allowlist seller, CORS localhost) đã bị gỡ.
> Link payOS hết hạn sau 15 phút; đơn chưa trả khác gói/giá hoặc quá 10 phút tự
> chuyển `CANCELLED` và được thay bằng đơn mới (tiền trả vào đơn cũ vẫn được ghi nhận).

Cập nhật 01/10/2026. Bảy migration OC1/payOS liên quan đã áp dụng lên Supabase project `ropzrnlasbkznoxqaqtp`; cả bốn Edge Functions đang `ACTIVE`. Webhook PayOS đã đăng ký và xác nhận payload mẫu. Backend checkout đã mở công khai với giá 20.000/35.000/60.000đ; Vercel vẫn cần nhận các biến frontend công khai và deployment mới trước khi mọi seller thấy nút Boost. Xem runbook [PAYOS_PUBLIC_LAUNCH_VI.md](./PAYOS_PUBLIC_LAUNCH_VI.md).

## Trạng thái phát hành công khai — 01/10/2026

- Supabase: `PAYOS_CHECKOUT_ENABLED=true`, `PAYOS_TEST_MODE=false`; biến
  `PAYOS_TEST_SELLER_ID` đã bị gỡ, nên backend không còn allowlist một seller.
- Giá server-side: 7/15/30 ngày = 20.000/35.000/60.000đ.
- Production origin vượt qua CORS và dừng ở `AUTH_REQUIRED` khi không gửi session;
  localhost bị từ chối, xác nhận test mode đã tắt mà không tạo checkout/order.
- Còn blocker duy nhất cho UI công khai là Vercel CLI chưa đăng nhập/link trên
  máy hiện tại. Không deploy worktree bẩn mà chưa rà; thực hiện runbook trên.

## Đã có trong repo

1. `supabase/migrations/20260923110000_disable_unpaid_boost.sql` vô hiệu hoá RPC cũ từng tự ghi payment giả và cấp Boost từ một click.
2. `supabase/migrations/20260924010000_payos_boost_orders.sql` tạo `boost_orders`, seller scoped RLS, ba RPC chỉ `service_role` được thực thi và cột/trigger `boost_payment_verified`. Giá lấy từ cấu hình server. Webhook hợp lệ mới ghi payment, tăng hạn và đánh dấu verified trong một transaction; lặp reference không tăng lần hai. Tin mất điều kiện được đưa vào `NEEDS_REVIEW`.
3. `supabase/migrations/20260929130000_pay_before_listing_approval.sql` cho phép seller chọn Boost khi gửi tin mới hoặc gửi Draft. Tin vẫn ở `PendingApproval`; PayOS xác nhận thì đơn ở `PAID_PENDING_APPROVAL`, chưa được ưu tiên. Moderator duyệt mới chuyển đơn sang `PAID` và bắt đầu thời hạn Boost. Nếu moderator từ chối, credit đã trả được giữ lại để seller sửa và gửi duyệt lại; xóa tin có credit đã trả chuyển đơn sang `NEEDS_REVIEW` để đối soát.
4. Bốn Edge Functions: `payos-boost-packages` chỉ trả gói cho seller đã đăng nhập; `payos-create-checkout` xác thực seller, tạo/tiếp tục đơn-link và kiểm chữ ký phản hồi; `payos-webhook` xác minh webhook; `payos-check-status` trả trạng thái chỉ cho seller sở hữu đơn. Frontend có bước chọn gói trong luồng đăng tin, modal tiếp tục thanh toán từ Quản lý tin và bảng thông báo trạng thái khi quay lại. Search chỉ xếp ưu tiên/hiện badge khi có `boost_payment_verified=true` và Boost chưa hết hạn; ngày Boost legacy không tạo ưu tiên.
5. Chế độ test mới: backend chỉ cho phép tài khoản có UUID khớp `PAYOS_TEST_SELLER_ID` khi `PAYOS_TEST_MODE=true`. Giao diện chỉ hiện CTA cho UUID khớp `VITE_PAYOS_TEST_SELLER_ID` khi `VITE_PAYOS_TEST_MODE=true`. Chỉ mở cho mọi seller nếu backend và frontend đều được đặt rõ `PAYOS_TEST_MODE=false` và `VITE_PAYOS_TEST_MODE=false`. Hai lớp kiểm tra độc lập; sửa biến frontend không thể bỏ qua giới hạn backend. Nếu mode thiếu/sai, packages/checkout bị từ chối hoặc CTA ẩn (fail closed).
6. `supabase/functions/_shared/payos-signature.mjs` và `supabase/tests/payos-signature.test.mjs` kiểm HMAC-SHA256, gồm vector webhook chính thức của payOS. Đây là test chữ ký, **không phải** test giao dịch hay database.

## Cấu hình `.env` local và secret

Hai nơi này phục vụ hai phần khác nhau; không đặt khóa PayOS trong `.env` frontend:

1. File `.env` ở **thư mục gốc** là cấu hình Vite cho trình duyệt. File này đã được Git ignore. Điền URL Supabase và publishable/anon key hiện dùng cho ứng dụng, rồi đặt các cờ giao diện như sau khi backend đã sẵn sàng:

```dotenv
VITE_SUPABASE_URL=https://ropzrnlasbkznoxqaqtp.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-key-cua-project>
VITE_ENABLE_BOOST_CHECKOUT=false
VITE_PAYOS_TEST_MODE=true
VITE_PAYOS_TEST_SELLER_ID=<UUID-cua-tai-khoan-seller-test>
```

`VITE_*` được đóng gói vào trình duyệt nên chỉ chứa cấu hình công khai và UID test, **không bao giờ** chứa `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` hay service-role key. Sau khi sửa `.env`, khởi động lại Vite bằng `pnpm.cmd dev`. File này chỉ ảnh hưởng máy local; website Vercel cần cấu hình biến `VITE_*` riêng trong Vercel rồi deploy lại.

2. Nếu chạy Edge Functions local, secrets để trong `supabase/functions/.env` (không phải file `.env` gốc). Tạo file này thủ công, không commit; Supabase CLI nạp nó khi chạy stack local. Giữ `PAYOS_CHECKOUT_ENABLED=false` trong lúc chuẩn bị. `supabase/functions/.env` cũng được Git ignore trong repo.

3. Để functions trên Supabase project đọc được secrets, nhập chúng riêng tại Supabase Dashboard → project `ropzrnlasbkznoxqaqtp` → Edge Functions → Secrets. Root `.env` trên máy không tự đồng bộ secrets lên Supabase. Các secrets cần tạo được liệt kê ở bước kế tiếp. Supabase tự cấp các biến runtime `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; không tự chép service-role key vào frontend.

4. Chạy local tại `http://127.0.0.1:5173` hoặc `http://localhost:5173`. Ba Edge Functions phục vụ checkout cho phép chính xác hai origin localhost này **chỉ khi `PAYOS_TEST_MODE=true`**; backend vẫn chỉ cho UID trong `PAYOS_TEST_SELLER_ID`. `PAYOS_SITE_ORIGIN` vẫn là `https://tronhanh.vercel.app`, nên sau thanh toán PayOS có thể đưa trình duyệt về website production; webhook mới là bằng chứng thanh toán. Không mở các cờ Vercel khi chỉ thử local. payOS không có sandbox, giao dịch thật sẽ trừ tiền thật.

## Kiểm soát khi chạy một giao dịch test

1. Chủ dự án xác nhận giá 7/15/30 ngày (seed hiện tại 20.000/35.000/60.000 VND), chính sách hoàn tiền nếu tin bị ẩn/từ chối/xóa trong lúc trả tiền, người chịu trách nhiệm xử lý `NEEDS_REVIEW` và kênh hỗ trợ. Nếu đổi giá, cập nhật `platform_settings.boost_config` trên DB theo quy trình có kiểm soát; không sửa frontend để định giá.
2. Trong Supabase Dashboard → Edge Functions → Secrets, tự nhập các biến phía server: **PAYOS_CLIENT_ID**, **PAYOS_API_KEY**, **PAYOS_CHECKSUM_KEY**, **PAYOS_SITE_ORIGIN=https://tronhanh.vercel.app**, **PAYOS_CHECKOUT_ENABLED=false**, **PAYOS_TEST_MODE=true**, **PAYOS_TEST_SELLER_ID=<UUID tài khoản test>**. `SUPABASE_URL`, `SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` là biến runtime của Supabase; không dán service-role key vào chat/Git/frontend. Trong Vercel Production để **VITE_ENABLE_BOOST_CHECKOUT=false**, **VITE_PAYOS_TEST_MODE=true** và **VITE_PAYOS_TEST_SELLER_ID=<cùng UUID>** cho đến khi cần mở đợt test. UID không phải secret; ba khóa payOS là secret. Không gửi chúng qua chat hoặc đưa vào biến `VITE_*`.
3. **Đã hoàn tất đến 29/09/2026:** áp dụng bảy migration OC1/payOS liên quan, gồm `20260929130000_pay_before_listing_approval.sql` và `20260929140000_fix_utility_reading_upsert.sql`; deploy bốn functions bằng Supabase CLI API (không cần Docker). Các lệnh dưới đây chỉ để tham khảo/redeploy khi có thay đổi code:

```powershell
pnpm.cmd exec supabase functions deploy payos-boost-packages --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-create-checkout --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-check-status --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-webhook --no-verify-jwt --use-api
```

**Đã đăng ký và xác minh ngày 27/09/2026:** URL `https://ropzrnlasbkznoxqaqtp.supabase.co/functions/v1/payos-webhook` được PayOS chấp nhận (`code=00`) trên kênh “Test Trọ Nhanh”. PayOS gửi payload mẫu; Edge Function xác minh chữ ký hợp lệ, nhận order mẫu `123`/`3000`, trả 2xx và không tạo đơn Boost/payment.
4. Kiểm bằng tài khoản test: seller khác không được thấy CTA và backend phải trả 403 `TEST_SELLER_ONLY`; thiếu/sai `PAYOS_TEST_MODE` hoặc UID test phải fail closed. Anon không lấy được gói; seller chỉ xem đơn của mình; anon/authenticated không gọi được ba RPC nội bộ; chỉ tin `PendingApproval` hoặc `Active` không bị xóa mềm được tạo checkout. Giá trả về đúng cấu hình server; chữ ký sai/số tiền sai/link ID sai không cấp Boost. Kiểm webhook lặp cùng reference chỉ một payment, webhook đến trước khi lưu link vẫn không hạ trạng thái đã thanh toán về `LINKED`. Một đơn chưa thanh toán chỉ tiếp tục được đúng gói ban đầu, không âm thầm trả link của gói khác. Function chỉ chấp nhận `UNKNOWN_ORDER` cho mẫu chữ ký chính thức (`orderCode=123`, `amount=3000`); mọi đơn lạ khác trả 503 để điều tra. payOS xác nhận webhook bằng cách gửi payload mẫu; endpoint hiện hỗ trợ mẫu chính thức này. Đối chiếu bằng SQL chỉ đọc:

```sql
select order_code, listing_id, seller_id, days, amount, status,
       payment_link_id, payos_reference, payment_id, paid_at
from public.boost_orders order by created_at desc limit 20;

select id, owner_id, amount, method, purpose, paid_at
from public.payments where purpose = 'Boost' order by paid_at desc limit 20;

select id, title, status, boost_expire_at
from public.rental_listings where id = '<listing-uuid>';
```

5. Giá test tạm là **1.000/2.000/5.000 VND** cho 7/15/30 ngày. `platform_settings` chưa có giao diện admin sửa `boost_config`; trong SQL Editor kiểm tra cấu hình trước. Chỉ cập nhật nếu đã xác nhận đúng một hàng `boost_config`:

```sql
select key, value from public.platform_settings where key = 'boost_config';

update public.platform_settings
set value = '{"days":[7,15,30],"price":[1000,2000,5000]}'::jsonb,
    updated_at = now()
where key = 'boost_config';
```

Sau giao dịch thử, khôi phục giá cũ và xác nhận kết quả:

```sql
update public.platform_settings
set value = '{"days":[7,15,30],"price":[20000,35000,60000]}'::jsonb,
    updated_at = now()
where key = 'boost_config';

select key, value from public.platform_settings where key = 'boost_config';
```

Nếu payOS từ chối 1.000đ, dùng gói 2.000đ; docs không nêu mức tối thiểu rõ ràng và ví dụ Node chính thức có giao dịch 2.000đ. payOS [không có sandbox riêng](https://payos.vn/docs/moi-truong-test/), nên đây là tiền thật. Checkout chỉ được bật ở server cho UID test. Chủ tài khoản tự đăng nhập local, tạo/gửi một tin đầy đủ hoặc mở một tin `PendingApproval`, chọn Boost và chỉ tạo **một** giao dịch. `returnUrl`/`cancelUrl` và query string chỉ dùng cho UX, [không phải bằng chứng thanh toán](https://payos.vn/docs/du-lieu-tra-ve/return-url/). Sau khi hoàn tất, webhook phải tạo đúng một payment và đặt `boost_orders=PAID_PENDING_APPROVAL`; thời hạn Boost chưa chạy khi tin chưa duyệt. Moderator duyệt tin thì cùng đơn chuyển `PAID` và `boost_expire_at` tăng đúng số ngày. Với tin đã `Active`, webhook có thể đi thẳng đến `PAID`. Không coi test hoàn tất nếu chỉ thấy trang quay lại.
6. Ngay sau đối soát: đặt `PAYOS_CHECKOUT_ENABLED=false`, giữ `PAYOS_TEST_MODE=true` và xóa `PAYOS_TEST_SELLER_ID`; đặt Vercel `VITE_ENABLE_BOOST_CHECKOUT=false`, giữ `VITE_PAYOS_TEST_MODE=true`, xóa `VITE_PAYOS_TEST_SELLER_ID`, tạo deployment mới và khôi phục giá cũ. Không mở checkout cho mọi seller; chờ chủ dự án duyệt riêng trước khi chuyển cả hai biến mode thành `false` và bật công khai.

## Trạng thái hiện tại

Thanh toán đang ở **local test giới hạn một UID**; Vercel checkout vẫn tắt trừ khi chủ dự án tự cấu hình và deploy. Ngày 29/09 đã triển khai lại `payos-create-checkout` sau khi thêm bảo vệ package của đơn đang mở. Preflight/kiểm thử đơn vị xác nhận origin, chữ ký và điều kiện test fail closed; POST thiếu đăng nhập trả `AUTH_REQUIRED`, không tạo đơn. Root `.env` chỉ ảnh hưởng local. Supabase secrets phải tiếp tục giữ `PAYOS_TEST_MODE=true` và allowlist đúng UID test khi `PAYOS_CHECKOUT_ENABLED=true`. Không có giao dịch nào được assistant khởi tạo.

Supabase secrets có đủ 7 tên cần thiết; `PAYOS_SITE_ORIGIN` vẫn trỏ tới production và khóa checkout chỉ được bật trong lúc seller test được allowlist. Lệnh `confirm-webhook` thành công và payload mẫu được xác minh chữ ký. Giá `boost_config` hiện là `[1000,2000,5000]`; giá gốc `[20000,35000,60000]` nằm trong snapshot cục bộ để khôi phục sau test. Hàm và secret dùng tạm để đăng ký webhook đã được xóa; chỉ còn bốn Edge Functions sản phẩm.

Kiểm tra chỉ-đọc ngày 29/09 cho thấy một đơn test `PAID` đã tạo ngày 28/09 cho gói 15 ngày/2.000đ trên tin `Active`: đơn có `payment_id`, `boost_payment_verified=true` và hạn Boost còn hiệu lực. Tổng hiện có là 1 `boost_orders` và 7 dòng `payments` mục đích `Boost` (6 dòng lịch sử + 1 dòng mới). Điều này xác nhận nhánh **tin Active → webhook → PAID → Boost**; nó không thay thế smoke test mới cho nhánh **PendingApproval → PAID_PENDING_APPROVAL → moderator duyệt → PAID**.

Project dùng Free Plan; theo yêu cầu của chủ dự án không tạo backup đầy đủ. `supabase db dump` không chạy vì máy thiếu Docker. Đã lưu **snapshot dữ liệu giới hạn** ở `C:\Users\Admin\Documents\TroNhanh-backup-2026-09-27\pre-migration-affected-rows.json`; file gồm các tin bị tác động và cấu hình liên quan, không thay thế full backup, không chứa Auth/Storage và chưa phải script tự khôi phục.

Tiếp theo: chủ tài khoản đăng nhập local bằng seller UUID đã cấu hình, tạo/gửi một tin hoặc dùng tin `PendingApproval`, chọn gói và tự xác nhận đúng một giao dịch tại PayOS (tiền thật). Gửi `orderCode` sau đó để đối soát webhook và moderator approval. Sau test, tắt `PAYOS_CHECKOUT_ENABLED`, giữ test mode, xóa allowlist nếu muốn đóng hoàn toàn và khôi phục giá gốc. Local `.env` vẫn bật cho đến khi test xong; Vercel chưa được đổi/deploy.

Nguồn kỹ thuật: [API payOS](https://payos.vn/docs/api/), [webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/), [kiểm chữ ký](https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/), [Supabase Edge Functions](https://supabase.com/docs/guides/functions).
