# Báo cáo triển khai và kiểm thử luồng SaaS — Trọ Nhanh

Cập nhật: 01/10/2026  
Môi trường dữ liệu: Supabase production `ropzrnlasbkznoxqaqtp`  
Tài khoản kiểm thử: các tài khoản demo trong `docs/cp4/DEMO_ACCOUNTS.md`  
Phạm vi: khu trọ, phòng, khách ở, hợp đồng và entitlement. **Không chạy luồng hóa đơn/thanh toán.**

## Kết quả triển khai

| Hạng mục | Trạng thái | Thay đổi / bằng chứng |
|---|---|---|
| Liên kết khách ở với hợp đồng | Hoàn tất | Migration backfill 14 occupancy còn thiếu `contract_id` (12 hợp đồng đang hoạt động, 2 đã kết thúc); không có occupancy nào trỏ nhiều hợp đồng. Trigger giữ liên kết cho hợp đồng mới. |
| Khách hiện trên thẻ phòng | Hoàn tất | Bộ đọc quan hệ một-nhiều PostgREST nay lấy phần tử occupancy đúng; thẻ chỉ hiển thị người ở thuộc hợp đồng `Active`, không hiện khách cũ sau khi trả phòng. |
| Quyền ghi theo gói ở backend | Hoàn tất | `can_write_saas()` + RLS và trigger bảo vệ cả ghi trực tiếp lẫn RPC `SECURITY DEFINER`. Dữ liệu vẫn đọc được sau hết hạn; thao tác xác nhận của renter giữ policy riêng. |
| Quyền đọc danh mục gói | Hoàn tất | Tài khoản đã xác thực đọc được 3 gói trong `subscription_plans`; không mở quyền ghi bảng gói cho client. |
| Toast sau khi thêm/kết thúc hợp đồng | Hoàn tất | Refresh nền không unmount bảng người ở, vì vậy thông báo không biến mất trước khi người dùng kịp đọc. |
| Xóa khách ở | Giữ nguyên chủ đích | Kết thúc hợp đồng trả phòng về Trống và lưu lịch sử; không xóa vật lý occupancy/hợp đồng. Chưa có bước thủ công bắt buộc để vận hành. |

Migration `20261001150000_saas_write_entitlements` đã áp dụng và ghi nhận trên Supabase. `supabase migration list --linked` xác nhận migration local/remote đồng bộ.

## Kiểm thử lại

- SQL rollback entitlement: **11/11 PASS** — seller A có thể ghi và đọc gói; seller B không có gói bị chặn bằng cả insert trực tiếp lẫn RPC; trial hết hạn cũng bị chặn; renter hết hạn vẫn xác nhận được occupancy của chính mình; RPC tạo khách tạo đúng liên kết occupancy–contract.
- Playwright SaaS trên localhost với Supabase production: **1/1 PASS** — tạo khu/phòng, thêm khách/hợp đồng, xác nhận tên khách trên thẻ phòng, kết thúc hợp đồng, thấy thông báo, phòng về Trống và khách cũ không còn trên thẻ.
- Hồi quy OC1 trên trình duyệt: **18/18 PASS**; không mở thanh toán.
- `pnpm typecheck`: PASS.
- `pnpm typecheck:strict`: PASS.
- Vite production build: PASS. Còn cảnh báo bundle hiện có vượt 500 KB; không làm build thất bại.

Khu/phòng E2E đã được xóa mềm sau khi kiểm thử; lịch sử khách/hợp đồng được giữ lại và hợp đồng đều `Terminated`, phòng `Available`.

## Việc còn lại / thao tác thủ công

1. Các thay đổi giao diện đang ở workspace local; chưa deploy lên Vercel. Khi muốn đưa toast/thẻ phòng mới lên production, chạy quy trình deploy frontend hiện tại.
2. Nếu nghiệp vụ “xóa khách ở” cần xóa/ẩn dữ liệu cá nhân thay vì kết thúc hợp đồng, chốt chính sách lưu trữ (ẩn danh hoặc xóa mềm có điều kiện) trước khi bổ sung UI/RPC. Không xóa lịch sử trực tiếp bằng SQL.
3. Hóa đơn và mọi hình thức thanh toán chưa được test theo đúng phạm vi bạn yêu cầu; báo cáo này không xác nhận các luồng đó.

Ghi chú: Supabase CLI `db push --dry-run` trên máy này không dùng được do database password cục bộ không khớp. Migration đã được áp dụng qua Supabase CLI `db query --linked --file` trong transaction và xác minh lại bằng lịch sử migration, SQL regression cùng E2E; không cần bạn nhập secret vào chat.
