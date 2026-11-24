# T40 — Danh mục phí dịch vụ (doanh thu vs thu hộ)

**Chuỗi:** T40 → T41 (hóa đơn v2) → T42 (hồ sơ người ở + xe) → T43 (hợp đồng in được) → T44 (CT01)
**Skill:** `tronhanh-schema` + `tronhanh-service` + `tronhanh-ui`
**Migration:** `supabase/migrations/20261124120000_property_services.sql`

## Vì sao
Góp ý người dùng (đối chiếu LOZIDO / quanlytro.me): mỗi khu chỉ có 3 con số cứng (điện / nước / "phí dịch vụ")
nên không khai được wifi, rác, giữ xe, phí quản lý thành khoản riêng, và **không tách được doanh thu
với tiền thu hộ** — điều hộ kinh doanh cho thuê trọ cần khi kê khai thuế. Wifi khu có khu không, chung cư
có phí quản lý ⇒ khoản phí phải là danh mục theo khu, chọn được phòng áp dụng.

## Mô hình
- `property_services`: tên, đơn vị, `fee_category` (`Service` = doanh thu | `PassThrough` = thu hộ),
  `quantity_basis` (`Meter` | `PerOccupant` | `Fixed`), `meter_type` (Electricity|Water khi `Meter`),
  `unit_price`, `apply_to_new_rooms`. Tối đa 1 dịch vụ đồng hồ điện + 1 đồng hồ nước mỗi khu.
- `room_services`: dịch vụ áp cho phòng nào + `unit_price_override` (null = giá khu).
- Cột giá cũ (`properties.*_unit_price/service_fee`, `rooms.*_price/service_fee`) **giữ lại làm bản sao chỉ-đọc**,
  trigger `sync_legacy_service_prices` tính lại khi danh mục đổi ⇒ `record_utility_reading`, gợi ý đăng tin
  từ phòng, form hóa đơn cũ vẫn đúng. Client mất quyền UPDATE 3 cột giá của `properties`; `update_room` bỏ qua 3 tham số giá.
- Seed: mỗi khu hiện có → "Tiền điện", "Tiền nước" (loại `Service` — an toàn khi kê khai) + "Phí dịch vụ" nếu khu/phòng có thu; giá riêng cũ của phòng → override.
- Khu mới / phòng mới: trigger tự seed / tự gắn dịch vụ `apply_to_new_rooms`.

## Giới hạn có chủ đích
- `PerOccupant` chưa vào form hóa đơn cũ (cột `service_fee` chỉ cộng các khoản `Fixed`) — T41 thay form hóa đơn.
- Giá bậc thang, `PerVehicle` (cần bảng xe — T42): `TODO(proposal)`.

## DoD
- [ ] `supabase db push` + `npm run db:types`; `npm run typecheck` + `typecheck:strict` exit 0.
- [ ] RLS: chủ trọ A không đọc được `property_services` / `room_services` của B; anon không SELECT được.
- [ ] READ_ONLY (BR-015) chặn ghi danh mục (`guard_saas_workspace_write`).
- [ ] Tab "Dịch vụ & phí" (`?tab=services`): thêm / sửa / xóa dịch vụ, chọn phòng theo tầng.
- [ ] "Sửa phòng": bật/tắt dịch vụ + giá riêng, lưu bằng `set_room_services`.
- [ ] Cài đặt khu không còn ô đơn giá; "Thêm phòng" không còn ô giá riêng.
- [ ] E2E `tests/e2e/workspace.spec.ts` cập nhật (bỏ `*-custom-price-toggle`).

## Cách test
1. Khu demo: tab Dịch vụ thấy Tiền điện / Tiền nước (seed) đúng giá cũ.
2. Thêm "Tiền wifi" 100.000đ/Tháng, `Phí dịch vụ`, bỏ 1 phòng → thẻ ghi "Áp dụng N-1/N phòng".
3. Thêm "Tiền rác" 30.000đ/Tháng loại `Thu hộ`.
4. Sửa phòng P101: đặt giá điện riêng 3.800 → ghi chỉ số kỳ mới, `utility_readings.unit_price` = 3.800.
5. Tạo hóa đơn (form cũ): "Phí dịch vụ" = tổng các khoản `Fixed` của phòng.
6. Thêm phòng mới → tự có các dịch vụ "tự áp dụng cho phòng mới".
