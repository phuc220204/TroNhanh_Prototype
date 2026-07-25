# T20 · T23 · T27 · T28 — Bốn task còn lại của Phase 2

> Mỗi mục là **một PR riêng**. Gộp vào một file vì mỗi cái nhỏ hơn các task trên.

---

## T20 — Sửa tin đăng (extra 3)

**Phụ thuộc:** T19 (cần `DangTinPage/` đã split + media service)
**Skill:** `tronhanh-ui`

### Việc
- Route `/chu-tro/dang-tin/:id` → dùng lại stepper ở **edit mode** (`useListingForm` nhận `listingId?`)
- Prefill từ `getListingById` — **bao gồm cả cột chi phí mới** (`electricity_price`, `water_price`, `access_policy`, …) sau migration `0300`, và `metadata->nearby`
- Media: thêm / xóa / đổi thứ tự ảnh đã có
- Submit → `update_listing_with_details` (RPC #2) → **dùng status trả về** để hiển thị thông báo đúng
- **Thay 2 `alert("[Demo]")`** ở `QuanLyPage.tsx:745, 826`
- Nút "Sửa & gửi lại" cho tin `Rejected` (T21) trỏ vào đây

### BR-003
Sửa field quan trọng của tin `Active` **khi đang ở chế độ Thủ công** → về `PendingApproval`. UI phải giải thích rõ: *"Tin của bạn đã được cập nhật và cần duyệt lại trước khi hiển thị."*

### Cách test
1. Sửa giá → `/tat-ca-phong` card cập nhật
2. Chế độ **Thủ công** + sửa tin `Active` → status thành `PendingApproval` + có thông báo giải thích
3. Chế độ **Tự động** + sửa tin `Active` → vẫn `Active`
4. Tin `Rejected` → sửa & gửi lại → vào lại vòng duyệt
5. Xóa 1 ảnh, thêm 2 ảnh, đổi thứ tự → reload → đúng
6. Sửa tin của **người khác** (đổi URL `:id`) → "Không tìm thấy tin" (RLS + RPC `FORBIDDEN`)
7. `grep -rn "\[Demo\]" src/marketplace/pages/QuanLyPage` = 0

### DoD
- [ ] Prefill đủ mọi field kể cả chi phí & nearby
- [ ] BR-003 hoạt động đúng theo cả 2 chế độ
- [ ] Media add/remove/reorder bền sau reload
- [ ] Không sửa được tin người khác
- [ ] 2 `[Demo]` alert đã xóa
- [ ] typecheck + strict = 0

---

## T23 — Chủ trọ ↔ tin nhu cầu (luồng 4c)

**Phụ thuộc:** T22 (demand post), T25 (nhắn tin)
**Skill:** `tronhanh-ui`

### Việc
Route `/chu-tro/tim-nguoi-thue` → `marketplace/pages/DemandMatchPage.tsx`
(thuộc **marketplace** vì chạy trên `demand_posts`, dù render trong `LandlordShell`)

- Nguồn phòng trống: **`shared/services/vacancy-service.ts` → `getMyVacantRoomSummaries()`** — đã có, **điểm nối duy nhất được phép**. Đừng viết query `rooms` mới ở marketplace.
- Xếp hạng: **`scoreDemandMatch(post, rooms)`** — đã có, thuần hàm. Thang 100: +50 khớp khu vực, +35 khoảng giá giao nhau (giảm dần tới lệch 15%), +15 diện tích đạt.
- Hiển thị: badge "Khớp N%" + tên phòng khớp nhất (`bestRoomId`)
- Filter: khu vực · `kind` · khoảng giá
- CTA **"Nhắn tin"** → `startConversation("DemandPost", post.id)`
- Chưa có phòng trống → `EmptyState` "Bạn chưa có phòng trống nào" + CTA tạo phòng

### Cách test
1. `seller.a` có phòng trống 3.5tr ở Quận 7
2. `renter.a` đăng RoomWanted: Quận 7, 3–4tr
3. `seller.a` → `/chu-tro/tim-nguoi-thue` → tin đó **xếp đầu**, badge khớp cao
4. Đăng thêm tin Quận 12, 8–10tr → xếp sau (hoặc không hiện nếu lệch quá)
5. Bấm "Nhắn tin" → mở conversation với `renter.a`
6. Account không có phòng trống → `EmptyState`

### DoD
- [ ] Xếp hạng theo khu vực + giá đúng
- [ ] Dùng `vacancy-service`, **không** query `rooms` trực tiếp từ marketplace
- [ ] CTA nhắn tin hoạt động
- [ ] `EmptyState` khi chưa có phòng trống
- [ ] `data-testid`: `demand-match-row`, `match-score-badge`, `demand-contact-btn`
- [ ] typecheck + strict = 0

---

## T27 — Polish quản lý khu & phòng (luồng 5)

**Phụ thuộc:** T11b, T10, T24
**Skill:** `tronhanh-ui`

### Việc
1. **`SettingsView` thành form đàng hoàng:** `bank_name`, `bank_account_number`, `bank_account_name`, `electricity_unit_price`, `water_unit_price`, `service_fee`. Đây là nguồn sinh VietQR, **theo từng khu** để tách dòng tiền/thuế. Validate: STK chỉ số, đơn giá > 0.
2. **Audit READ_ONLY (BR-015):** mọi nút ghi trong zone SaaS đi qua `useCanWrite()` — **một chỗ**, không check per-button. Grep để chắc không sót nút nào.
3. **`/chu-tro/hoa-don`** — `HoaDonPage.tsx`: danh sách hóa đơn theo kỳ, filter trạng thái, xem VietQR, "Đã thu". *(Cắt được nếu thiếu thời gian — xem `07_RISKS.md` #11.)*
4. **BR-011 delete guard:** xóa khu còn phòng `Rented` → chặn kèm message tiếng Việt.
5. Dashboard: xác nhận BR-012 vẫn đúng — "Phòng trống" luôn hiện, "Tổng phòng"/"Đang thuê" **mặc định ẩn** + toggle.

### Cách test
Luồng 5 đầy đủ ở `06_QA_CHECKLIST.md` §3. Thêm:
- Save cấu hình khu → **reload** → vẫn còn
- VietQR dùng đúng STK vừa nhập, **quét thử bằng app ngân hàng thật**
- Toggle demo → READ_ONLY → **mọi** nút tạo/sửa/xóa disabled, dữ liệu vẫn xem được
- Xóa khu có phòng `Rented` → bị chặn

### DoD
- [ ] Cấu hình khu lưu & hiển thị lại đúng
- [ ] VietQR đúng STK + số tiền, quét được
- [ ] READ_ONLY khóa **hết** nút ghi, không mất dữ liệu
- [ ] Xóa khu có phòng đang thuê bị chặn
- [ ] BR-012 giữ nguyên
- [ ] typecheck + strict = 0

---

## T28 — Dẹp mọi `[Demo]` alert còn lại

**Phụ thuộc:** T20
**Skill:** `tronhanh-ui`

### Nguyên tắc
Mỗi CTA phải **hoặc** làm việc thật, **hoặc** nói rõ nó thuộc version nào. **Không `alert()`.**

| Chỗ | Xử lý |
|---|---|
| `QuanLyPage.tsx:965, 1005` — báo cáo / mẹo marketing | → `[Báo cáo — V1]` placeholder có giải thích |
| `ChuTroDashboardPage.tsx:743, 745` — nhắc thanh toán / gia hạn HĐ | → **làm thật** nếu T25 xong (gửi message tới người ở); không thì `[V1]` |
| `ChuTroDashboardPage.tsx:1092` — hỗ trợ | → mở `mailto:` hoặc `[Hỗ trợ — V1]` |
| "Lưu nháp" trên form đăng tin | → **làm thật**: gọi RPC với `p_submit = false` → status `Draft`. Hiện ở `/chu-tro/tin-dang` với badge "Bản nháp" |
| Map toggle ở Search/AllListings | → **xóa nút** hoặc để và hiện `[Bản đồ — V1]` |

Kiểm mọi thanh toán giả lập có ghi **"(giả lập)"**: boost, mua gói, VietQR (AS-002).

### Cách test
```bash
grep -rn "\[Demo\]" src        # = 0
grep -rn "alert(" src          # = 0 (hoặc chỉ ở chỗ có chủ ý)
```
Bấm **mọi** nút trong `/chu-tro/*` → không nút nào ra `alert`.
"Lưu nháp" → `/chu-tro/tin-dang` có row badge "Bản nháp" → mở lại sửa được → gửi duyệt được.

### DoD
- [ ] `grep "\[Demo\]" src` = 0
- [ ] "Lưu nháp" tạo row `Draft` thật, mở lại và gửi duyệt được
- [ ] Việc chưa làm đều ghi rõ version, không phải alert
- [ ] Mọi thanh toán giả lập ghi "(giả lập)"
- [ ] typecheck + strict = 0
