# Hướng dẫn chuyển Auth sang không OTP (thay thế SpeedSMS)

> **SpeedSMS đã ngừng được dùng trong luồng đăng ký/xác minh của frontend.** Không nhập API key SpeedSMS vào frontend, Vercel hoặc Git. Các Edge Function và bảng OTP cũ được giữ tạm để có thể rà soát/rollback; chưa xóa dữ liệu.

## Cấu hình Supabase Dashboard

Thực hiện ở project `ropzrnlasbkznoxqaqtp` trước khi thử phiên bản frontend mới:

1. Mở **Authentication → Hooks**. Tắt hook **Send SMS** (không xóa ngay để dễ bật lại nếu cần rollback).
2. Mở **Authentication → Sign In / Providers → Email**. Giữ Email provider bật và tắt **Confirm email / Email confirmations**.
3. Mở **Authentication → Sign In / Providers → Phone**. Bật **Enable Phone provider**, tắt **Enable phone confirmations**, rồi lưu.
4. Giữ nguyên Google provider, Site URL và các Redirect URLs đang dùng.
5. Không cần chọn Twilio, MessageBird, Textlocal, Vonage hoặc Twilio Verify; khi confirmations tắt, luồng ứng dụng không cần gửi SMS OTP.

Tên mục có thể thay đổi theo giao diện Dashboard. Mở trang Auth Providers và bấm **Save** sau khi sửa cả Email/Phone. Không tắt Email provider vì tài khoản email/mật khẩu hiện có vẫn cần đăng nhập.

> **Nếu Dashboard không cho lưu Phone provider** vì đòi thông tin Twilio/SMS provider: để hook **Send SMS** ở trạng thái **bật** (bỏ qua bước 1). Khung báo "SMS provider settings are disabled while the SMS hook is enabled" là bình thường. Vì **phone confirmations đã tắt**, Supabase không sinh OTP nên không bao giờ gọi hook — đăng ký/đăng nhập SĐT + mật khẩu vẫn không cần SMS.

### Xử lý sự cố

| Triệu chứng (UI / Network `auth/v1/signup`) | Nguyên nhân | Cách sửa |
|---|---|---|
| 500 `unexpected_failure` — `Invalid payload sent to hook`; UI: "Hệ thống chưa gửi được SMS…" | **Enable phone confirmations** đang BẬT ⇒ Supabase gửi OTP qua Send SMS hook, hook từ chối | Tắt **Enable phone confirmations** ở Providers → Phone, Save |
| 422 `phone_provider_disabled`; UI: "Đăng ký bằng số điện thoại đang tạm tắt…" | **Enable Phone provider** đang TẮT | Bật Phone provider, Save |
| UI: "Supabase chưa cấp phiên đăng nhập…" | Một trong hai confirmations (Email/Phone) còn bật nên `signUp` không trả session | Tắt confirmations tương ứng |
| 422 `phone_exists` / `user_already_exists`; UI: "…đã có tài khoản. Hãy đăng nhập." | SĐT/email đã đăng ký | Đăng nhập; tài khoản test dọn ở Auth → Users |

Kiểm tra nhanh sau khi cấu hình: `npx playwright test auth.spec.ts` — test "đăng ký bằng SĐT không cần OTP" phải pass, và **Logs → Edge Functions** không có lời gọi `speedsms-auth-hook`.

## Triển khai mã và migration

Từ PowerShell ở thư mục repo, xem trước migration trước khi áp dụng:

```powershell
pnpm.cmd exec supabase migration list --linked
pnpm.cmd exec supabase db push --linked --dry-run
```

`db push` áp dụng mọi migration local đang chờ, không chỉ phần Auth. Kiểm tra danh sách dry-run; nếu có migration ngoài phạm vi dự kiến, dừng và rà soát. Khi đã xác nhận:

```powershell
pnpm.cmd exec supabase db push --linked
pnpm.cmd exec supabase migration list --linked
```

Migration `20261002100000_remove_phone_verification_posting_gates.sql` chỉ gỡ các trigger chặn đăng tin theo trạng thái xác minh. Các bảng và RPC OTP cũ được giữ nguyên. Không chạy `db reset` trên project thật.

Sau đó deploy frontend theo quy trình Vercel hiện tại. Bản mới không gọi Edge Function gửi SMS hoặc xác minh điện thoại. Màn `/xac-minh-sdt` cũ tự chuyển về Cài đặt tài khoản.

## Hành vi đăng ký mới

- Cần họ tên, mật khẩu tối thiểu 6 ký tự và ít nhất một định danh: email hoặc SĐT Việt Nam hợp lệ.
- Nếu nhập cả hai, ứng dụng tạo tài khoản bằng SĐT trước rồi gắn email vào chính tài khoản đó. Nếu email đã thuộc tài khoản khác, không có thao tác ghép tài khoản; tài khoản mới vẫn đăng nhập bằng SĐT.
- Đăng ký email-only dùng email làm định danh. Đăng nhập tiếp tục chấp nhận email hoặc SĐT + mật khẩu; Google giữ nguyên.
- Email/SĐT liên hệ chưa được chứng minh quyền sở hữu. Không dùng `email_confirmed_at`/`phone_confirmed_at` làm bằng chứng xác minh người dùng trong nghiệp vụ.
- Tài khoản cũ giữ phương thức đăng nhập hiện tại. Email cũ chỉ nằm trong `profiles.contact_email` không tự trở thành email đăng nhập.

## Kiểm tra và dọn cấu hình SpeedSMS

1. Chạy unit tests/build; đăng ký thử bằng tài khoản riêng ở local/staging với Email confirmations và Phone confirmations đã tắt.
2. Thử email-only, phone-only, cả hai, đăng nhập bằng từng định danh, tài khoản cũ và Google. Không dùng tài khoản demo có dữ liệu thật.
3. Xác nhận Logs không có lời gọi `phone-verification`/`speedsms-auth-hook` do luồng Auth mới tạo.
4. Sau khi frontend và cấu hình Dashboard đã được xác nhận ổn định, có thể xóa các secrets cũ `SPEEDSMS_ACCESS_TOKEN`, `PHONE_OTP_PEPPER`, `PHONE_VERIFICATION_ALLOWED_ORIGINS`, `SEND_SMS_HOOK_SECRET` trong **Edge Functions → Secrets**; chỉ xóa nếu chúng không còn được function nào khác sử dụng.
5. Sau cùng có thể undeploy `phone-verification` và `speedsms-auth-hook`. Không xóa migration/bảng OTP cũ trong đợt review này.

## Giới hạn

Tắt confirmations giúp giảm ma sát nhưng **không xác minh quyền sở hữu email/SĐT**. Trước khi mở đại trà cần bổ sung chống đăng ký tự động, khôi phục tài khoản và xác minh khi đổi thông tin. Mật khẩu vẫn là yếu tố cần thiết cho đăng ký bằng email/SĐT.
