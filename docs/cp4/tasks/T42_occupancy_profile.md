# T42 — Hồ sơ người ở (giấy tờ, tạm trú), xe, thông tin chủ trọ (Bên A)

**Phụ thuộc:** T40 · **Chặn:** T43 (hợp đồng in), T44 (CT01)
**Migration:** `20261125090000_occupancy_profiles.sql`

## Vì sao
Hợp đồng in và tờ khai tạm trú CT01 cần ngày sinh, số CCCD/hộ chiếu, nơi cấp, thường trú… của người ở và chủ trọ;
"Giữ xe" cần tính theo số xe thật.

## Đã làm
- Bảng `occupancy_profiles` (1–1 `occupancies`, **tách bảng** để số giấy tờ không lọt vào các truy vấn `select *` rộng),
  `occupancy_vehicles`, `landlord_legal_profiles`. RLS: chủ trọ đọc của mình; người ở đã liên kết (Confirmed) chỉ đọc
  hồ sơ/xe của chính mình qua `is_linked_occupant`; người ở ghép không đọc được giấy tờ của nhau. Ghi qua RPC
  `save_occupancy_profile` (hồ sơ + thay toàn bộ xe, atomic) và `upsert_landlord_legal_profile`. Chặn ghi khi hết gói.
- Kiểm server: CCCD đúng 12 số, hộ chiếu 6–20 chữ/số, ngày sinh không ở tương lai, khoảng tạm trú hợp lệ, ≤ 10 xe.
- `quantity_basis` thêm `PerVehicle` ("Theo số xe"); form hóa đơn mặc định số lượng = số xe của hợp đồng.
- UI: "Hồ sơ & giấy tờ" dưới tên người ở → `OccupantProfileModal` (Giấy tờ · Địa chỉ & công việc · Tạm trú & tình trạng · Xe);
  thẻ "Thông tin chủ trọ (Bên A)" ở Cài đặt khu.

## Chưa làm
- Ảnh CCCD mặt trước/sau (cần bucket riêng tư + signed URL) — `TODO(proposal)`.

## DoD
- [x] `db push` + `db:types`; `typecheck` + `typecheck:strict` exit 0.
- [x] RLS thử trên DB (transaction rollback): chủ trọ thấy 2 hồ sơ, người ở liên kết thấy 1 (của mình), chủ trọ khác thấy 0.
- [x] Dev server: mở hồ sơ, CCCD sai bị chặn ở client; thẻ Bên A hiển thị. (Chưa bấm Lưu trên dữ liệu thật.)
- [ ] E2E cho luồng lưu hồ sơ.

## Cách test
1. Người ở & Hợp đồng → "Hồ sơ & giấy tờ" → nhập CCCD 12 số, ngày sinh, thường trú, bật "Đã đăng ký tạm trú", thêm 2 xe → Lưu → mở lại thấy đủ.
2. CCCD 11 số → báo lỗi tiếng Việt.
3. Dịch vụ & phí → thêm "Giữ xe" cách tính "Theo số xe" → Lập hóa đơn phòng đó → số lượng mặc định = 2.
4. Cài đặt khu → Thông tin chủ trọ (Bên A) → lưu → tải lại vẫn còn.
