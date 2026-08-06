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

### Nguyên tắc — CHỦ DỰ ÁN ĐÃ ĐỔI HƯỚNG (2026-08-06)

> **Sản phẩm cuối phải trông như một app thật đang kinh doanh. KHÔNG có bất kỳ
> nhãn phiên bản nào lọt ra UI người dùng: không `[V1]`, không `[Demo]`,
> không "sắp có", không "phiên bản sau".**

Bản trước của file này cho phép thay `alert()` bằng nhãn `[V1]`. **Cách đó đã bị
huỷ.** Lý do: nhãn phiên bản là ngôn ngữ nội bộ của đội phát triển. Người dùng
thấy nó thì biết ngay đây là đồ án chưa xong, không phải sản phẩm — đúng cái ấn
tượng cần tránh khi demo.

Mỗi CTA chỉ còn **hai** lựa chọn hợp lệ:
1. **Làm việc thật** — kể cả khi "việc thật" chỉ là điều hướng tới đúng nơi
   người dùng cần tới.
2. **Xóa hẳn nút đó** khỏi UI.

❌ Không `alert()`. ❌ Không nhãn phiên bản. ❌ Không hộp thoại báo thành công
một việc chưa hề xảy ra (đây là kiểu tệ nhất — nó nói dối người dùng).

| Chỗ | Xử lý |
|---|---|
| `ChuTroDashboardPage/index.tsx` — task "Nhắc nợ" | Đổi nhãn thành **"Xem hóa đơn"** → điều hướng `/chu-tro/hoa-don`. Chủ trọ tự lấy QR gửi người ở — đúng AS-002, nền tảng không đứng giữa dòng tiền |
| `ChuTroDashboardPage/index.tsx` — task "Gia hạn" | Đổi nhãn thành **"Xem hợp đồng"** → `/chu-tro/quan-ly-phong?tab=occupants` |
| `ChuTroDashboardPage/index.tsx` — card "Hỗ trợ" | `mailto:` tới email thật của nhóm |
| "Lưu nháp" trên form đăng tin | **Làm thật**: `createListing({ submit: false })` → status `Draft`. Hiện ở `/chu-tro/tin-dang` với badge "Bản nháp" |
| 8 `alert()` ở `PublicNavbar` / `DemoBanner` / `toRooms()` | Chuyển sang `Toast`, giữ nguyên nội dung |

**Đã lỗi thời, không còn việc:** 2 alert ở `QuanLyPage` (T20 đã xử lý) và map
toggle (bản đồ Leaflet đã làm thật).

Kiểm mọi thanh toán giả lập có ghi **"(giả lập)"**: boost, mua gói.
⚠️ **VietQR trên hóa đơn tiền phòng KHÔNG phải giả lập** — tiền vào thẳng tài
khoản chủ trọ. Đừng gắn chữ đó vào đây. Chỉ VietQR ở màn mua gói SaaS mới là giả lập.

### Cách test
```powershell
Get-ChildItem -Path src -Recurse -Include *.tsx | Select-String "\[Demo\]"
Get-ChildItem -Path src -Recurse -Include *.tsx | Select-String "alert\("
Get-ChildItem -Path src -Recurse -Include *.tsx | Select-String "\[V1\]|\[V2\]|sắp có|phiên bản sau|coming soon"
```
Cả ba phải ra **0 dòng**.

Bấm **mọi** nút trong `/chu-tro/*` → không nút nào bung `alert`, không nút nào
báo thành công một việc chưa xảy ra.
"Lưu nháp" → `/chu-tro/tin-dang` có row badge "Bản nháp" → mở lại sửa được → gửi duyệt được.

### DoD
- [ ] `[Demo]` trong `src` = 0
- [ ] `alert(` trong `src` = 0
- [ ] **Không nhãn phiên bản nào trong UI** (`[V1]`, "sắp có", "phiên bản sau"…) = 0
- [ ] "Lưu nháp" tạo row `Draft` thật, mở lại và gửi duyệt được
- [ ] **Không** gửi `status` từ client trong luồng đăng tin (§6.1)
- [ ] Mọi nút còn lại đều làm việc thật; nút không làm được việc đã bị xóa
- [ ] Thanh toán giả lập ghi "(giả lập)"; VietQR hóa đơn **không** bị gắn chữ đó
- [ ] typecheck + strict = 0
