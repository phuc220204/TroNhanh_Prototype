# T44 — In tờ khai thay đổi thông tin cư trú (CT01)

**Phụ thuộc:** T42 (hồ sơ người ở, Bên A) · **Không có migration.**

## Đã làm
- `services/ct01-service.ts`: người kê khai (người ở được chọn + hồ sơ giấy tờ), mục 11 = người ở còn hiệu lực khác cùng hợp đồng,
  chủ sở hữu chỗ ở hợp pháp = Thông tin chủ trọ (Bên A).
- `components/Ct01Document.tsx`: bố cục mẫu CT01 (mục 1–11, ô số định danh 12 ký tự, bảng thành viên, 4 khối ý kiến/ký tên).
- `pages/QuanLyPhongPage/Ct01PrintModal.tsx`: ô điền thêm (kính gửi, chủ hộ, quan hệ, email, nơi/ngày ký, nội dung đề nghị —
  mặc định "Xin đăng ký tạm trú đến địa chỉ: <phòng> - <địa chỉ>"), không in và không lưu; nhắc khi hồ sơ thiếu số định danh/ngày sinh/giới tính.
  In qua `PrintArea` dùng chung.
- Lối vào: "Tờ khai CT01" dưới tên người ở đang ở; nút "In tờ khai CT01" trong Hồ sơ & giấy tờ.
- Trọ Nhanh chỉ điền sẵn mẫu để in, không nộp thay. Tiêu đề mẫu ghi theo mẫu người dùng cung cấp
  (Thông tư 53/2025/TT-BCA) — cần kiểm tra lại mẫu đang áp dụng trước khi dùng chính thức.

## DoD
- [x] `typecheck` + `typecheck:strict` exit 0.
- [x] Dev server: mở tờ khai, nội dung đề nghị điền sẵn đúng phòng/địa chỉ, ô thiếu để trống.
- [ ] Thử "In / Lưu PDF" thật (khổ A4).
