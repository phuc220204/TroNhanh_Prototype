# T41 — Hóa đơn v2: tách nhóm khoản thu, tính theo ngày, giảm trừ, ghi chú

**Phụ thuộc:** T40 (danh mục phí) · **Migration:** `20261124140000_invoice_v2.sql`
**Skill:** `tronhanh-schema` + `tronhanh-service` + `tronhanh-ui`

## Vì sao
Hóa đơn cũ tối đa 4 dòng cố định, số tiền do client gửi, không giảm trừ, không ghi chú, không tách được doanh thu
với thu hộ. Mẫu tham khảo: LOZIDO (lập hóa đơn có "Tạm tính", tiền phòng theo ngày, dịch vụ tick chọn, cộng thêm/giảm trừ).

## Việc đã làm
- RPC `create_invoice_v2` (xem `03_RPC_CONTRACTS.md` §5b) — mọi con số derive server.
- Form `pages/QuanLyPhongPage/CreateInvoiceModal/` thay `InvoicePreview.tsx`: kỳ + hạn · tiền phòng (từ–đến ngày) ·
  dịch vụ tick chọn (đồng hồ chưa có chỉ số → ghi chỉ số ngay tại chỗ) · cộng thêm/giảm trừ · ghi chú · khung "Tạm tính"
  tách Tiền phòng / Phí dịch vụ / Thu hộ / Điều chỉnh · banner nợ cũ.
- `InvoiceItemsTable` (dùng chung chi tiết hóa đơn + màn "Đã lập"), ảnh hóa đơn gom nhóm có tổng con.
- `/chu-tro/hoa-don`: thêm "Doanh thu" và "Thu hộ" cạnh "Còn phải thu".
- Xóa `invoice-draft.ts`, `InvoicePreview.tsx`, `createInvoiceWithItems`, `getInvoiceDraftSources`.

### Bổ sung: bản in + hóa đơn tháng trước
- `components/InvoiceDocument.tsx` — bản in dùng chung (bảng Hạng mục | Đơn giá | Mức sử dụng | Số tiền, gom nhóm có tổng con,
  người ở, khoảng ngày, ghi chú, VietQR). `components/InvoicePrintModal.tsx` — "In / Lưu PDF" qua `window.print()`;
  CSS in duy nhất là `<style>@media print</style>` chọn `[data-print-root]` (ngoại lệ §8.1, T43 dùng lại).
- Form lập: nút **"Xem trước"** (bản nháp, nhãn "Bản xem trước — chưa lưu"); màn "Đã lập" hiện bản in theo số server.
- Chi tiết hóa đơn: nút **"Xem bản in"**.
- Khung **"Hóa đơn tháng trước"** trong cột Tạm tính: tổng/còn nợ kỳ trước, so sánh mức dùng từng dịch vụ "Kỳ trước → Đang lập",
  "Xem bản in kỳ trước".

## DoD
- [x] `db push` + `db:types`; `typecheck` + `typecheck:strict` exit 0.
- [x] `tests/unit/invoice-calc.test.mjs` pass; số tiền phòng khớp kết quả RPC thật (31/12–31/01, 2.800.000 → 2.893.333).
- [x] RPC chạy thử trên DB trong transaction rollback: 3 nhóm dòng, tổng = Σ dòng.
- [x] `grep create_invoice_with_items src/` = 0 hit.
- [ ] E2E `workspace.spec.ts` (đã cập nhật, chưa chạy).
- [ ] **Sau deploy frontend** — một migration dọn dẹp:
  - `drop function public.create_invoice_with_items(uuid, uuid, text, date, jsonb);`
  - `revoke update (electricity_unit_price, water_unit_price, service_fee) on public.properties from authenticated;`
    (tạm mở lại ở `20261124150000_temp_regrant_property_price_columns.sql` vì bản prod cũ gửi 3 cột này khi lưu "Cài đặt khu").

## Cách test
1. Phòng có hợp đồng → "Hóa đơn": Tạm tính hiện đủ 4 nhóm; đổi "Từ ngày" sang 31 tháng trước → "1 tháng 1 ngày".
2. Điện/nước chưa có chỉ số → nút lập khóa + lý do; nhập "Số mới" → "Lưu chỉ số" → dòng tự tính.
3. Thêm giảm trừ "Giảm ngày Tết" 100.000 → nhóm Cộng thêm/Giảm trừ −100.000đ.
4. Lập → màn "Đã lập" hiện bảng nhóm theo số server; Xuất ảnh → ảnh có nhóm + tổng con + ghi chú.
5. Hóa đơn cũ vẫn mở được, khoản thu tự gom nhóm.
