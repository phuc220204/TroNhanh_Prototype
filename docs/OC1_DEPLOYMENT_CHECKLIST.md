# Checklist triển khai sau sửa OC1

Hướng dẫn từng bước cho các thao tác tay: [OC1_MANUAL_STEPS_VI.md](./OC1_MANUAL_STEPS_VI.md).

Runbook mở Boost công khai: [PAYOS_PUBLIC_LAUNCH_VI.md](./PAYOS_PUBLIC_LAUNCH_VI.md).

> Cập nhật 29/09/2026: bảy migration OC1/payOS liên quan đã lên Supabase, `payos-create-checkout` đã deploy lại và DB lint không còn lỗi. Nội dung lịch sử bên dưới được giữ để đối chiếu; ưu tiên [OC1_PAYOS_INTEGRATION_VI.md](./OC1_PAYOS_INTEGRATION_VI.md) cho trạng thái/payment flow mới.

Các thay đổi mã nguồn không tự cập nhật Supabase, Vercel hay cấu hình OAuth.
Trước khi chấm/demo production, thực hiện và xác minh theo thứ tự:

- Kiểm tra live ngày 28/09/2026 vẫn thấy footer cũ (`1900 123 456`, địa chỉ Bitexco, ©2024) và trang chủ báo chưa có tin/nhu cầu công khai. Đây là bằng chứng frontend mới chưa được deploy; không suy ra database rỗng chỉ từ empty-state. Nhánh local chưa có upstream và máy chưa có Vercel CLI/project link.
- Đến 29/09/2026 đã chạy `pnpm.cmd db:types`, cả hai typecheck, production Vite build ra thư mục Temp và read-only E2E **18/18 passed**. `pnpm.cmd test:payos` qua **7/7**. Vite báo chunk lớn hơn 500 KB; cảnh báo không làm build thất bại.
- `supabase migration list --linked` xác nhận năm migration OC1 gốc cộng `20260929130000_pay_before_listing_approval.sql` và `20260929140000_fix_utility_reading_upsert.sql` đều đã áp dụng. Không chạy `db reset --linked` trên dự án thật.
- Bốn Edge Functions đã deploy và đều cần là `ACTIVE`. Webhook PayOS đã đăng ký; PayOS xác nhận `code=00` và chấp nhận payload mẫu 2xx. Giá payOS tạm là 1.000/2.000/5.000đ. Kiểm tra cờ checkout/allowlist trực tiếp ở Supabase Dashboard trước khi test, không suy luận giá trị secret từ Git. Xem `OC1_PAYOS_INTEGRATION_VI.md`.
- `src/shared/types/database.types.ts` đã sinh lại từ schema remote; không tự sửa file type sinh bằng tay.
- Deploy cùng `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` của đúng project.
- Trong Supabase và nhà cung cấp Google, cấu hình custom Auth domain thuộc thương
  hiệu Trọ Nhanh, consent screen và redirect URI của cả production lẫn localhost.
  Đây là bước bắt buộc để màn Google không còn hiện hostname `*.supabase.co`.
- Mở cửa sổ ẩn danh và smoke test: email/password, Google OAuth quay về đúng
  `redirect`, tin mới ở `PendingApproval`, duyệt tin, ẩn/hiện/xóa và responsive
  tại 320, 768, 946, 1024 và 1440 px.
- Nếu test PayOS: từ tin mới hoặc Draft đầy đủ chọn Boost → tạo đúng một checkout → webhook hợp lệ tạo `PAID_PENDING_APPROVAL` → moderator duyệt chuyển `PAID` và mới bắt đầu `boost_expire_at`. Không bấm/chuyển tiền thử nếu chưa sẵn sàng giao dịch thật.
- So tổng số tin `Active` chưa xóa mềm trong Supabase với kết quả tìm phòng
  không lọc trên website; không chấp nhận màn hình đứng tải hoặc 0 kết quả khi
  database còn tin. Trước deploy, REST công khai trả đủ 25 tin nhưng giao diện
  live cũ vẫn đứng tải/hiện 0; số 25 chỉ là mốc quan sát, không phải số cố định.
- Xác nhận production không có DemoFAB, banner seed, combobox reviewer, số KPI
  hard-code, badge “Đã xác minh”, CTA Boost/thanh toán giả hoặc placeholder bản đồ.

Không chạy toàn bộ E2E ghi dữ liệu trên production. Bộ `oc1-regression.spec.ts`
được thiết kế chỉ đọc/nhập cục bộ và không submit dữ liệu.
