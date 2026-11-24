# T43 — Hợp đồng in được

**Phụ thuộc:** T40 (dịch vụ), T42 (hồ sơ người ở, Bên A) · **Migration:** `20261125120000_contract_terms.sql`

## Đã làm
- `contracts` + `payment_day` (1–31), `billing_cycle_months` (1–12), `extra_terms` (≤ 4000 ký tự).
- `contract_services` — **bản chụp dịch vụ + đơn giá lúc ký**, tạo bằng trigger sau khi thêm hợp đồng (mọi đường tạo đều có);
  hợp đồng Active/Draft cũ được backfill theo giá đang áp. Hóa đơn VẪN tính theo giá đang áp của phòng — bản chụp chỉ để in.
- `create_occupancy_with_contract` nhận thêm 3 trường điều khoản (giữ nguyên các kiểm tra cũ); RPC `update_contract_terms`.
- Bản in theo mẫu PDF: Bên A (Thông tin chủ trọ), Bên B (người đứng tên + hồ sơ giấy tờ), người ở cùng, Điều 1 (địa chỉ, bảng
  dịch vụ + chỉ số điện hiện tại, thời hạn), Điều 2 (giá thuê + bằng chữ, ngày thu, cọc + bằng chữ), Điều 3–5, Điều 6 bổ sung, ký tên.
  Ô thiếu dữ liệu in dòng chấm để điền tay; modal báo rõ đang thiếu gì.
- `shared/utils/number-to-words.ts` (đọc số tiền thành chữ) + test; `services/contract-duration.ts` + test.
- `components/PrintArea.tsx` — cơ chế in dùng chung (hóa đơn dùng lại).
- Lối vào: "In hợp đồng" dưới tên người đứng tên ở Người ở & Hợp đồng; form tạo hợp đồng có "Ngày thu tiền hàng tháng".

## DoD
- [x] `db push` + `db:types`; `typecheck` + `typecheck:strict` exit 0; unit test pass.
- [x] Backfill: 18/20 hợp đồng có bản chụp (2 hợp đồng thuộc phòng không có dịch vụ nào).
- [x] Dev server: mở bản in, sửa ngày thu/điều khoản thấy cập nhật ngay (chưa bấm Lưu trên dữ liệu thật).
- [ ] Thử "In / Lưu PDF" thật trên trình duyệt (khổ A4, ngắt trang).

## Cách test
1. Cài đặt khu → điền Thông tin chủ trọ; Người ở → Hồ sơ & giấy tờ → điền CCCD, ngày sinh, thường trú.
2. Người ở & Hợp đồng → "In hợp đồng" → Bên A/B đủ thông tin, bảng dịch vụ đúng giá lúc ký, số tiền bằng chữ đúng.
3. Nhập ngày thu 5 + điều khoản bổ sung → Lưu điều khoản → mở lại vẫn còn.
4. "In / Lưu PDF" → chỉ có văn bản hợp đồng, không có khung điều khoản/nút.
