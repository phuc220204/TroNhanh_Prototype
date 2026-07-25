# Rủi ro & Quyết định — CP4

12 rủi ro, xếp theo mức độ đau nếu bỏ qua.

---

## 1. Kiểm duyệt bắt buộc sẽ làm hỏng demo ⚠️ ĐÃ XỬ LÝ

**Vấn đề:** giám khảo đăng tin rồi không thấy gì hiện = app lỗi. Nhưng bỏ kiểm duyệt = mất luồng 4b (một trong 5 luồng bắt buộc).

**Không chọn giải pháp nào trong 2 thái cực.** Cũng **không** thêm nút "Đăng ngay (demo)" trên form seller — nó dạy sai mental model về sản phẩm.

**Giải pháp đã implement:** `platform_settings.auto_approve_listings`, mặc định **`true`**.
- `true` → tin vào `Active` ngay, **nhưng `create_listing_with_details` VẪN ghi một row `moderation_logs`** với `moderator_id = null, reason = 'auto (demo)'`. Nhờ vậy audit trail đầy đủ và queue UI có data để hiển thị ngay cả ở chế độ tự động.
- `false` → tin vào `PendingApproval`.
- Admin bật/tắt ở `/quan-tri/cai-dat`, nhãn **"Chế độ kiểm duyệt: Tự động / Thủ công"**.

**Cách demo:** người thuyết trình bật "Thủ công" 60 giây, đăng 1 tin, cho thấy queue + approve/reject, rồi tắt lại.

**Luôn hiện badge trạng thái cho Seller ở CẢ hai chế độ** — để vòng đời tin vẫn nhìn thấy được, không bị che.

---

## 2. Review verified-only là không thể demo ⚠️ ĐÃ XỬ LÝ

**Vấn đề:** BR-022 đòi occupancy `link_status='Confirmed'` + hợp đồng ≥30 ngày (hoặc ≥1 payment) + không phải chủ khu. **Không có gì trên DB demo sạch thoả điều kiện đó.**

**❌ KHÔNG giải bằng cách nới `can_review_contract()`.** Cổng 30 ngày *là* toàn bộ giá trị chống gian lận của tính năng, và giám khảo rất có thể hỏi đúng chỗ đó ("làm sao chặn review giả?").

**Giải pháp đã implement:** RPC `demo_link_me_to_seeded_occupancy()` + 1 nút trong `DemoFAB` ("Tôi là người ở demo"). Nó gắn caller vào một occupancy chưa ai nhận, set `Confirmed`, backdate hợp đồng 60 ngày, thêm 1 payment.

**Ràng buộc phạm vi (bắt buộc, đã có trong code):**
1. chỉ occupancy có `user_id is null`
2. chỉ trong property mà **chủ có email kết thúc `@tronhanh.demo`**
3. caller **không** phải chủ property (BR-030 vẫn đúng)

⚠️ **Hàm này backdate `contracts.created_at`** — chỉ chấp nhận được trên DB demo. Tiền tố `demo_` + có trong `02_SCHEMA_DECISIONS.md` §13 "Drop trước production".

---

## 3. ⚠️ Nguy cơ rò rỉ dữ liệu: đừng bao giờ public SELECT lên `properties`

**Đây là cách dễ nhất để biến CP4 thành một rò rỉ dữ liệu thật.**

RLS là **row-level, không phải column-level**. Khoảnh khắc ai đó nghĩ "bật trang khu trọ công khai thì thêm policy public SELECT cho `properties`", thì `bank_account_number`, `bank_account_name`, và toàn bộ đơn giá trở thành public với `anon`.

**Cách đúng duy nhất cho BR-024:** view `property_public_profiles` với allow-list cột tường minh, `security_invoker = false`.

**Dấu hiệu regression cần chặn ở review:** ai đó sửa view thành `security_invoker = true`, hoặc thêm cột vào select list, hoặc thêm policy vào `properties`. `supabase/tests/rls.sql` TEST 4 kiểm đúng chỗ này.

---

## 4. ⚠️ RLS + `security definer`: sẽ mất một ngày nếu không nắm

Một policy có `exists (select ... from occupancies ...)` **âm thầm trả `false`** cho bất kỳ ai không SELECT được `occupancies`. **Không lỗi, không warning — chỉ có list rỗng.**

4 policy mới cần điều này (`reviews` insert, `contracts` select, `invoices` select, `user_roles` select). Đã bọc hết trong `can_review_contract`, `is_linked_occupant`, `is_property_public`, `is_moderator`, `owns_property`, `owns_room`, `has_role`.

**Luật đã ghi vào `/CLAUDE.md` §3.1** để mọi task schema về sau đều tuân theo. Ngoại lệ duy nhất: `messages` ↔ `conversations` (cả 2 participant đọc được cả 2 bảng).

---

## 5. T02 xóa 51 file + ~30 dependency ✅ ĐÃ LÀM & ĐÃ VERIFY

Đã xác minh trước khi xóa: `grep` cho `components/ui`, `cn(`, `clsx`, `tailwind-merge`, `class-variance-authority` **ngoài** folder `ui/` = **0 hit** (41/41 match đều nằm trong chính folder bị xóa).

**Đã verify sau khi xóa:** `pnpm typecheck` 0 lỗi · `pnpm typecheck:strict` 0 lỗi · `pnpm build` thành công · dev server render trang chủ đúng như trước.

**Nếu sau này thấy gì lệch:** thủ phạm sẽ là `motion` hoặc `lucide-react` — **giữ cả hai**. Mọi file đã xóa đều được git track ⇒ `git checkout <path>` lấy lại được.

Một cái bẫy đã gặp: `src/styles/tailwind.css` import `tw-animate-css` → phải xóa dòng đó, nếu không `vite build` fail (typecheck **không** bắt được lỗi này vì nó ở tầng CSS).

---

## 6. Supabase CLI chưa được init — rủi ro vận hành lớn nhất còn lại

`supabase/` **không có `config.toml`**: migration đầu tiên được paste tay vào SQL editor. CP4 thêm **9 migration nữa**. Paste tay đúng thứ tự vào DB đang có data thật là cách hợp lý nhất để mất một ngày.

**Phải làm trước khi apply bất cứ gì:**
```bash
npx supabase init
npx supabase link --project-ref <ref>
npx supabase db push
```

**Hệ quả kèm theo:** `uq_invoice_contract_period` sẽ **fail** nếu seeder đã tạo cặp `(contract_id, period)` trùng → `db push` bị chặn và mọi migration sau không chạy. Migration `0200` đã có `DO` block de-dupe **trước** khi tạo index.

---

## 7. Realtime thêm một websocket

Nếu mạng hội trường khó tính, inbox sẽ đứng im. Đã ship **cả 2 đường** sau cờ `USE_REALTIME_MESSAGING` trong `src/shared/query/queryClient.ts`, kèm `MESSAGING_POLL_INTERVAL_MS = 15_000` làm fallback. **Phải test đường fallback ít nhất một lần** (đặt cờ = false, kiểm tin nhắn vẫn tới trong 15s).

---

## 8. Hai deviation so với spec 02 — ghi ra để không bị tính là lỗi

| Deviation | Lý do |
|---|---|
| Một bảng `demand_posts` + cột `kind`, thay vì `RoomWantedPost` + `RoommateWantedPost` | Bảng đã ship kèm RLS và code client; tách là churn không đổi lấy chức năng. Ràng buộc shape vẫn giữ bằng `check (kind <> 'RoommateWanted' or needed_count is not null)`. |
| `listing_media(listing_id)` thay vì `Media(owner_type, owner_id)` polymorphic | Ownership polymorphic không RLS được mà không cần `CASE` qua 6 bảng owner + 1 definer helper mỗi nhánh. Scoped theo listing: policy 3 dòng. |

Cả hai đã ghi ở `02_SCHEMA_DECISIONS.md` §12.

---

## 9. Phải TẮT email confirmation trên Supabase

Auth → Providers → Email → tắt "Confirm email". Nếu không, **mọi account demo fail ngay ở bước register → login**. Free tier còn giới hạn ~3 email/giờ, nên để bật thì demo sẽ tắc.

Đây là việc làm tay trên Dashboard, không có trong task nào.

---

## 10. `profiles.id` độc lập với `profiles.user_id` — đã gây bug, sẽ gây lại

`profiles.id` là `gen_random_uuid()` riêng; auth id nằm ở `profiles.user_id`. Đây chính là bug #1 (T01): `DangTinPage` query `.eq("id", user.id)` nên **kích hoạt Seller chưa từng hoạt động**.

**CP4 KHÔNG restructure** (rủi ro, chạm auth trigger). Thay vào đó: mọi service dùng `user_id`, và `Database` generic giờ khiến sai kiểu này thành lỗi biên dịch.

Follow-up tuỳ chọn ngoài scope: migration cho `profiles.id = user_id`.

---

## 11. Scope thực tế: 31 task là nhiều

**Nếu thời gian ép lại**, phần CP4 tối thiểu vẫn mạch lạc: T01–T18 (đã xong) + **T19** (upload ảnh), **T22** (demand post), **T24** (occupancy/contract), **T25** (nhắn tin).

**Cắt:** `T27` phần `/chu-tro/hoa-don` và `T31` phần bật Nấc B.
**KHÔNG cắt:** `T21` (kiểm duyệt) và `T26` (review) — đắt nhất nhưng cũng là 2 thứ ấn tượng nhất khi demo, và là 2/3 nghĩa của luồng 4.

---

## 12. Mọi thanh toán giả lập phải ghi "(giả lập)"

AS-002: nền tảng **không giữ tiền thuê**. Một UI thanh toán giả mà không ghi rõ là loại thứ hút câu hỏi khó từ giám khảo. Áp dụng cho: thanh toán boost, mua gói SaaS, và màn VietQR.

---

## Phụ lục — bug phát sinh do lần typecheck đầu tiên

Nấc A tìm ra 17 lỗi, trong đó **4 cái là bug runtime thật** chưa ai biết:

| Bug | Ở đâu | Hậu quả |
|---|---|---|
| `signOut` được gọi nhưng không hề destructure từ `useAuth()` | `LandlordShell.tsx` `MobileTabBar` | **Đăng xuất từ tab bar mobile throw ReferenceError** |
| Ghi `rooms.code` và `rooms.description` — 2 cột KHÔNG tồn tại (`room_code` mới đúng) | `QuanLyPhongPage.tsx:1939-1940` | Cập nhật mã phòng & ghi chú fail im lặng |
| `DbListing` thiếu field `area` nhưng filter diện tích vẫn dùng | `QuanLyPage.tsx:417,420` | Lọc theo diện tích không hoạt động |
| So sánh `status === "Available"` với type lowercase | `ChuTroDashboardPage.tsx:69-77` | 5 nhánh điều kiện luôn false |

Cộng thêm: `expiring`/`unpaid` được dùng như `RoomStatus` ở 4 chỗ dù không tồn tại trong BR-002 → mọi bộ đếm liên quan **luôn ra 0**. Đã sửa thành trạng thái dẫn xuất (`isContractExpiringSoon()` từ `contract.end`, và `!bill.paid`), nên các con số giờ mới có nghĩa.

**Đây là lý do Nấc A đáng làm trước feature**, dù `strict: false`.
