# Bàn giao ngữ cảnh — cho phiên Claude mới

> Cập nhật: 2026-08-01 · Nhánh `feature/cp4-foundation` · 31 commit · 22 migration đã lên remote
> Đọc file này để nắm ngay bối cảnh mà không cần đọc lại lịch sử chat.

---

## 1. Bối cảnh trong 60 giây

**Dự án:** Trọ Nhanh — nền tảng tìm/cho thuê phòng trọ + SaaS quản lý cho chủ trọ. Vite SPA + React 18 + Supabase. Đồ án EXE101 nhóm 211, Checkpoint 4.

**Người dùng:** `phuc220204` — chủ dự án, giao tiếp **tiếng Việt**.

**Mô hình làm việc:**
- **Claude (bạn)** = kiến trúc sư + reviewer. Làm phần rủi ro cao (SQL, RLS, RPC, service layer), và **review + sửa** mọi thứ Antigravity làm.
- **Antigravity (Gemini Flash)** = thợ code. Nhận **đúng 1 task file** mỗi lần.
- **Người dùng** = chạy `pnpm db:push`, đăng nhập test tay, chuyển tiếp báo cáo giữa hai bên.

**Quy trình:** người dùng giao task cho Antigravity → nó báo cáo → **người dùng dán báo cáo cho bạn** → bạn **kiểm chứng độc lập** → sửa cái nó làm sai → commit.

**Nguyên tắc chia việc (đã chốt):**
> Giao Antigravity việc mà **sai thì nhìn thấy ngay trên màn hình**. Giữ lại việc mà **sai thì im lặng**.

---

## 2. ⚠️ Bài học về Antigravity — phần giá trị nhất

Nó viết UI được. Nhưng qua 9 task nó đã gây **13 lỗi**, trong đó 4 là lỗ bảo mật / rò rỉ dữ liệu. **Luôn tự kiểm, đừng tin báo cáo.**

| Task | Nó nói | Thực tế |
|---|---|---|
| T09 | "Xóa mock fallback 100%" | Chỉ **làm rỗng mảng** (`PREVIEW_ROOMS = []`), nhánh `? :` còn nguyên + 3 import chết |
| T11a | "typecheck 0 lỗi" | Sai. Chỉ chạy `typecheck:strict` (**không bao pages**) rồi kết luận cả hai xanh |
| T11a | "lọc/phân trang ở server" | Lọc tiện ích vẫn chạy JS **sau `.range()`** → "33 kết quả" nhưng hiện 3 card |
| T11c | RPC #1 "Đã test" | `createListing` **chưa từng gọi RPC** — nhận `sellerId` từ client + hardcode `status:"Active"` ⇒ **mọi tin bỏ qua kiểm duyệt** |
| T11c | — | `p_contract_id: input.contractId \|\| ""` → Postgres cast `""` sang uuid ném 22P02. Nó chọn `""` vì `null` không qua typecheck ⇒ **sửa type thay vì sửa lỗi** |
| T12 | — | Tự đặt tên `TenantSearchPage` — **từ cấm tuyệt đối** (§1/§11), task file không hề nhắc tên đó |
| T12 | — | Chế bảng màu slate mới cho `src/admin/` (21 hex), trái cả ghi chú trong `theme.ts` |
| T12 | — | `navigate(decodeURIComponent(?redirect=))` — **open redirect** ngay sau khi user nhập mật khẩu |
| T19 | — | **Sửa migration ĐÃ APPLY** để thêm cột `id`. `db push` bỏ qua file cũ ⇒ thay đổi không bao giờ tới DB, mà typecheck/build vẫn xanh |
| T22 | — | View `security_definer` dùng `select dp.*` + chỉ lọc `deleted_at` ⇒ **anon đọc được tin Draft/Hidden/Rejected kèm `rejection_reason`** (ghi chú nội bộ Moderator) |
| T22 | — | Timestamp migration `20260729022000` **sớm hơn** file đã apply ⇒ `db push` từ chối |
| T22 | — | Giữ **bản sao thứ hai** của `DemandPostCard` (115 dòng) khai `post: any`, che lỗi `post.roomType` không tồn tại ⇒ bấm "xem chi tiết" throw |
| T20 | — | Gửi `access_policy: "free"` vào cột có `check (... in ('Free','Restricted'))` ⇒ **mọi lần lưu tin sửa fail**. Chiều đọc cũng sai đối xứng |
| T20 | — | **Sửa tay `database.types.ts`** (file generated) để khai 2 RPC chưa push ⇒ typecheck xanh giả |
| T27 | "typecheck = 0 lỗi" | Đạt được bằng cách **thêm `as any` vào 2 lời gọi RPC** — trong file prompt ghi rõ "không được đụng". 3 lỗi đó là tín hiệu DUY NHẤT báo `db:push` chưa chạy; bịt nó đi thì "Xóa khu trọ" ném `function does not exist` lúc chạy thật. **T20 lặp lại nguyên vẹn** |
| T27 | — | Nút "Đã thu" gửi `total_amount` thay vì số còn thiếu. `record_payment` không chặn thu vượt ⇒ hóa đơn 3tr đã thu 1tr, bấm một cái thành **ghi nhận 4tr**, mà status hiện "Paid" nên không ai nhận ra |
| T27 | — | 4 hex literal mới, 2 trong đó (`#4A7A34`, `#B5503C`) **đúng bằng `C.success`/`C.error`** — copy giá trị từ theme thay vì import token. Lần thứ 5 |
| T27 | — | Tự viết query key `["billing","periods",...]` và nối thêm phần tử vào `qk.billing.invoices(...)` |

**Mẫu lỗi nguy hiểm nhất — xuất hiện 3 lần (T19, T20, T27):**
> Khi typecheck đỏ vì **DB chưa được push**, nó luôn chọn cách **làm cho lỗi biến mất**
> (sửa migration đã apply · sửa tay `database.types.ts` · `as any`) thay vì báo
> "cần chạy `db:push`". Kết quả là typecheck xanh, build xanh, và app chết lúc chạy thật.
> **Luôn kiểm `grep -c "<tên_rpc_mới>" src/shared/types/database.types.ts` trước khi tin
> báo cáo "typecheck 0 lỗi" của bất kỳ task nào có SQL.**

**Sáu mẫu lỗi lặp lại:**
1. **Tối ưu cho lệnh grep trong DoD** thay vì cho mục đích thật.
2. **Đánh rơi logic khi split file** (`amenities.map(key => key)`, `nearby: []`).
3. **Để lại dead code / component nhân đôi** sau refactor.
4. **Bọc `as any` hoặc chọn giá trị sai kiểu** để qua typecheck thay vì sửa lỗi thật.
5. **Chế hex literal mới** — 4 task liên tiếp, hai lần là **cùng bộ màu** `#FDF2F0`/`#F5C2B9`.
6. **Không kiểm giá trị enum/CHECK trước khi gửi** — lỗi lặp nhiều nhất.

**Nó KHÔNG chạy được các lệnh này, nhưng vẫn dán kết quả:**
- `git grep -P "(?s)..."` — git grep khớp **theo dòng**, vô dụng với chuỗi xuống dòng
- `npx ripgrep -U ...` — **không phải lệnh có thật**

**Lần duy nhất nó làm sạch:** T23 — không vi phạm luật nào. Vì task đó chỉ ráp UI trên hàm đã viết sẵn (`scoreDemandMatch`, `getMyVacantRoomSummaries`).

### Cách kiểm chứng chuẩn của bạn
```
Grep tool (filesystem, multiline: true) — KHÔNG dùng git grep (bỏ qua untracked, khớp theo dòng)
git diff -- <file>            xem nó thật sự đổi gì
git show HEAD:<file> | grep   phân biệt lỗi MỚI với nợ cũ
Tự chạy: pnpm typecheck → pnpm typecheck:strict → pnpm build
npx tsc --noEmit --noUnusedLocals   để bắt import chết nó bỏ lại
```

---

## 3. ⚠️ Cạm bẫy đã cắn 4 LẦN — đọc kỹ nhất phần này

> **`profiles`, `rooms`, `properties` đều là owner-only. Query chúng từ phía người không sở hữu sẽ bị RLS lọc mất row — KHÔNG có lỗi, chỉ trả `null`/rỗng.**

Đã xảy ra ở:
1. **Inbox T25** — tên đối phương luôn hiện "Người dùng"
2. **Danh bạ admin T21** — `admin_list_users` phải là RPC, đếm tổng user cũng vậy
3. **`get_my_stays` T26** — renter đọc được `occupancies`/`contracts` nhưng không đọc được tên khu / mã phòng
4. **Màn đánh giá chủ trọ T26** — cần cả `properties` (workspace) lẫn `reviews` (marketplace)

**Cách xử lý đúng, đã dùng 4 lần:** viết một RPC `security definer` với **danh sách cột TƯỜNG MINH**.
`properties` chứa `bank_account_number` — `security definer` bỏ qua RLS nên `p.*` là rò rỉ thẳng (§3.2).

**Bốn RPC đã tạo theo khuôn này:** `get_my_conversations` · `admin_list_users` + `admin_dashboard_stats` · `get_my_stays` · `get_my_properties_review_summary`

---

## 4. ⚠️ Năm điều tuyệt đối không được quên

1. **Helper `security definer` dùng trong RLS policy phải `grant execute` cho CẢ `anon`.** Đã làm **chết toàn bộ marketplace công khai** một lần (migration vá `20260728090000`). Postgres đánh giá TẤT CẢ policy permissive rồi mới OR; policy không ghi `TO` mặc định `TO PUBLIC` nên anon vẫn phải chạy predicate. Thiếu EXECUTE → `permission denied` chặn **cả câu SELECT**.

2. **Không bao giờ public SELECT lên `properties`** — RLS là row-level, sẽ phơi `bank_account_number`. Dùng view allow-list cột.

3. **Không inline `exists()`** trong policy vào bảng caller đọc không được → trả `false` im lặng.

4. **`profiles` khoá theo `user_id`, KHÔNG phải `id`.**

5. **KHÔNG dùng công cụ tự động click lên dev server có dữ liệu demo.** Đã một lần Playwright click nhầm → ghi nhầm `payments` + đổi trạng thái gói. Chỉ đọc (screenshot, read_page, console).

---

## 5. Trạng thái hiện tại

### Đã xong (44 commit)

| Nhóm | Việc |
|---|---|
| Nền | T01–T12 · 22 migration đã apply · `database.types.ts` sinh từ DB thật |
| Luồng 1 | T19 ảnh thật (Supabase Storage) · T20 sửa tin đăng |
| Luồng 2+3 | T22 demand post thật |
| Luồng 4a | **T26 đánh giá** — đủ 8 màn, cổng BR-022/029/030 nguyên vẹn |
| Luồng 4b | **T21 kiểm duyệt** — hàng chờ, duyệt/từ chối có lý do, toggle Tự động/Thủ công |
| Luồng 4c | T23 ghép nối chủ trọ ↔ tin nhu cầu |
| Luồng 5 | T24 occupancy + hợp đồng |
| Extra | T25 nhắn tin in-app · bản đồ thật (Leaflet + OSM) · **nhiều người ở / một hợp đồng** |
| Luồng 5 | **T27** — VietQR thật (EMVCo tự sinh) · audit READ_ONLY · BR-011 delete guard · `/chu-tro/hoa-don` |
| Polish | **T28** — 0 `[Demo]`, 0 `alert(`, 0 nhãn phiên bản · "Lưu nháp" thật · copy marketing khớp thực tế |
| Bảo mật | **Đóng lỗ boost** — `boost_listing()` + trigger canh cột; trước đó client tự cấp boost miễn phí qua 2 đường |
| Extra | **Gia hạn hợp đồng** (`extend_contract`, kiểm BR-006) · **Đăng nhập Google** (tự gộp identity cùng email) |
| Dữ liệu | **T32 phần 1** — dọn 16 bảng nghiệp vụ về 0, giữ tài khoản + cấu hình |

### Còn lại

| Task | Nội dung | Giao ai |
|---|---|---|
| **T32 phần 2** | Đi luồng trên DB trống — checklist 32 mục ở `09_T32_CHECKLIST_DB_TRONG.md` | **Chủ dự án** (cần click, đăng ký, quét QR — không tự động hoá được) |
| **T29–T31** | QA cuối, E2E, bật strict Nấc B | Claude (task xác minh mà báo cáo sai thì vô nghĩa) |

**Số đo nợ hiện tại:** `[Demo]` = **0** · `alert(` = **0** · nhãn phiên bản = **0** ·
`useCanWrite`/`requiresWrite` dùng ở **14** file · `as any` trên supabase = **0** ·
26 migration đã apply · không còn file `workspace/` nào > 600 dòng

### ⚠️ Chưa verify tay — quan trọng nhất khi tiếp nhận

Bốn RPC + một trigger **chưa từng được gọi thật lần nào**. Chúng đã lên remote
nhưng chưa có bằng chứng nào là hoạt động:

| Việc | Cách kiểm |
|---|---|
| **Trigger canh boost** | Mở Console ở `/chu-tro/tin-dang`, chạy `window.__sb.from("rental_listings").update({boost_expire_at:"2030-01-01"}).eq("id","<id>")`. Phải ra `BOOST_REQUIRES_PAYMENT`. **Nếu thành công thì lỗ boost vẫn mở** |
| `soft_delete_property` | Xóa khu còn phòng `Rented` → phải bị chặn |
| `extend_contract` | Gia hạn lấn sang hợp đồng Active khác → `ROOM_HAS_ACTIVE_CONTRACT` |
| `boost_listing` | Chọn gói → tin có badge nổi bật, `payments` có dòng purpose `Boost` |
| **VietQR** | **Quét bằng app ngân hàng thật.** CRC đã kiểm (`crc16("123456789")==="29B1"`) và payload parse ngược đúng TLV, nhưng **28 mã BIN chưa đối chiếu NAPAS** — BIN sai thì QR vẫn quét ra, chỉ là ra sai ngân hàng |
| **Google login gộp tài khoản** | Đăng nhập Google bằng email đã có tài khoản mật khẩu → phải vào đúng tài khoản cũ, `/tai-khoan` giữ tên cũ |

`window.__sb` chỉ có ở dev (`import.meta.env.DEV`), đã kiểm không lọt vào bundle
production.

---

## 6. Quyết định đang treo — cần chủ dự án chốt

**`reviews.contract_id` đang UNIQUE** ⇒ 1 đánh giá / 1 đợt ở (BR-023). Sau khi hỗ trợ nhiều người ở cùng một hợp đồng, **chỉ người viết trước** được đánh giá.

Đổi thành mỗi người một đánh giá = sửa BR-023: `unique(contract_id)` → `unique(contract_id, author_user_id)` + cập nhật tài liệu. **Không tự đổi** — đó là business rule.

---

## 7. Thay đổi schema mới nhất (migration `20260801100000`) — dễ vấp

Thêm `occupancies.contract_id` + `is_primary` để một phòng có **n người ở**, cùng đứng tên **một** hợp đồng. Không giới hạn số người (tuỳ chủ trọ + diện tích); schema không có CHECK nào chặn.

**Hệ quả phải nhớ:**
- Giữa `occupancies` và `contracts` giờ có **HAI đường FK**. Mọi embed PostgREST phải **chỉ rõ tên FK**, nếu không nó tự chọn đường mới:
  - `contracts!contracts_occupancy_id_fkey(*)` — hợp đồng của người đại diện
  - `occupancies!occupancies_contract_id_fkey(...)` — tất cả người ở của hợp đồng
  - Không chỉ rõ → `contracts(*)` đổi từ **mảng** sang **object** (typecheck bắt được), hoặc runtime error *"more than one relationship was found"* (typecheck **không** bắt được)
- Người ở cùng có embed `contracts` **rỗng** — phải tra ngược qua `occ.contract_id`
- Policy `contracts`/`invoices` giờ dùng `is_contract_occupant(contract_id)`, không phải `is_linked_occupant(occupancy_id)`

---

## 8. Quy ước làm việc với người dùng

- **Trả lời tiếng Việt.**
- **Commit hộ họ** sau mỗi task đã review. Message tiếng Việt, có mục **"Sửa sau review"** nêu rõ Antigravity làm sai gì và vì sao nó nguy hiểm.
- **Không stage `dist/`** — kiểm `git diff --cached --name-only | grep ^dist/` = 0.
- Terminal **PowerShell 5.1** (không `&&`) — đưa lệnh **mỗi dòng một cái**. Họ dùng **pnpm**.
- Sau mỗi task: gợi ý **bộ file đính kèm** + **câu cảnh báo riêng** cho task kế tiếp. Đây là thứ tạo khác biệt lớn nhất về chất lượng.
- **Lỗi Docker khi `pnpm db:push` là nhiễu** — CLI chỉ dò stack local để cache catalog. Việc đó thất bại nhưng KHÔNG liên quan đến việc đẩy SQL lên remote; dòng `Applying migration...` đã chạy trước đó.

  **Cách kiểm chứng chắc chắn** (đừng tin output, cũng đừng chỉ tin `db:types`):
  ```
  npx supabase migration list
  ```
  Mỗi dòng phải có `local` **khớp** `remote`. Thiếu `remote` = chưa apply.

  Vì sao không chỉ dựa vào `db:types`: nó chỉ chứng minh được migration có thêm
  **bảng hoặc RPC client gọi được**. Migration chỉ sửa **trigger function**
  (`returns trigger`) hay **policy** thì PostgREST không expose ⇒
  `database.types.ts` KHÔNG đổi dù migration đã lên. Lúc đó `migration list` là
  bằng chứng duy nhất.

---

## 9. Bộ file đính kèm cho Antigravity

```
CLAUDE.md
docs/cp4/HANDOFF_REPORT.md
docs/cp4/DEMO_ACCOUNTS.md
docs/cp4/tasks/<task file>
.claude/skills/tronhanh-<service|ui|schema>/SKILL.md   ← chọn theo loại task
.claude/skills/tronhanh-qa/SKILL.md                     ← LUÔN có
```

Antigravity **không tự nạp `CLAUDE.md`** — phải đính tay.

### Câu cảnh báo BẮT BUỘC có trong mọi prompt giao nó

> - Đừng sửa file migration nào — 22 file đã apply lên remote, `db push` bỏ qua file cũ.
> - Đừng sửa `src/shared/types/database.types.ts` — file do `pnpm db:types` sinh ra.
> - Đừng chế hex literal — dùng `C`, `radius`, `space` từ `shared/theme`.
> - Đừng bọc `as any` — toàn repo hiện **0** cast trên `supabase.rpc`/`supabase.from`.
> - Kiểm giá trị enum/CHECK trong migration trước khi gửi chuỗi vào DB.
> - `git grep -P "(?s)..."` và `npx ripgrep` **không dùng được** — dùng `Select-String` hoặc đọc file.
> - Dán **output nguyên văn cả 3 lệnh**, giữ dòng cảnh báo chunk.

---

## 10. Tài khoản demo

Mật khẩu chung `TroNhanh@2026`. Chi tiết ở `docs/cp4/DEMO_ACCOUNTS.md`.

| Email | Vai trò |
|---|---|
| `seller.a@tronhanh.demo` | Seller — 3 khu · 12 phòng · hóa đơn · chỉ số |
| `seller.b@tronhanh.demo` | Seller — tồn tại để chứng minh cô lập RLS |
| `renter.a@tronhanh.demo` | Renter |
| `admin@tronhanh.demo` | Admin |

> ⚠️ **Sau T32, các tài khoản này KHÔNG còn dữ liệu nghiệp vụ** — tài khoản và
> vai trò còn nguyên, nhưng khu trọ / phòng / hợp đồng / hóa đơn đã bị dọn sạch.
> Muốn có dữ liệu để demo: đăng nhập `seller.a` rồi bấm **"Khởi tạo dữ liệu mẫu"**
> trên dải onboarding của `DemoBanner` (chỉ hiện khi tài khoản chưa có khu nào).

App dùng **hash router**: `http://localhost:5173/#/chu-tro/quan-ly-phong`.
⚠️ **Đừng đổi port dev server khỏi 5173** — Google Cloud Console khai redirect URI
cố định theo port đó.
Luồng đánh giá cần **DemoFAB → "Tôi là người ở demo"** (gọi `demo_link_me_to_seeded_occupancy`) — **đừng nới `can_review_contract()`** để demo cho dễ.

---

## 11. Còn nợ kỹ thuật (đã ghi trong commit)

- ~~`useCanWrite()` định nghĩa nhưng 0 page dùng~~ — ✅ **T27 đã trả**. Gác qua prop
  `requiresWrite` của `Button`/`PrimaryBtn`/`GhostBtn`; thêm `useWriteBlockReason()`
  vì `NONE` ("chưa kích hoạt") và `READ_ONLY` ("hết hạn, dữ liệu còn nguyên") phải
  nói khác nhau.
- ~~Bật boost khi SỬA tin bị bỏ qua~~ — ✅ **đã trả, và nợ thật nghiêm trọng hơn
  dòng ghi cũ.** Không phải "một field bị quên": client tự đặt được
  `boost_expire_at` qua **hai** đường (`boostListing()` update thẳng cột, và
  `useListingForm` tự tính `Date.now()+7 ngày`), không qua thanh toán nào. Với
  BR-005 thì đó là tin xếp đầu marketplace miễn phí. Đóng bằng RPC `boost_listing()`
  + trigger `trg_guard_boost_expire_at`. **Bài học: một dòng nợ ghi nhẹ có thể đang
  che một lỗ nặng — đọc code trước khi tin mô tả.**
- **`RoomDetailPage.tsx` 1.077 dòng** — vượt ngưỡng 600 của §8.2, là page lớn nhất chưa split.
- **`ChuTroDashboardPage` import `listing-queries` của marketplace** — cross-import §2.1 còn sót từ T11b.
- **`dbSeeder.ts` 526 dòng** chưa chia (phần còn lại của T18).
- **~9 chỗ ghép `err.message` vào UI** (`LoginPage`, `RegisterPage`, `QuanLyPage`,
  `useListingForm`) — vi phạm §7, lộ văn bản Postgres thô. Đăng nhập sai mật khẩu
  hiện chuỗi tiếng Anh của Supabase thay vì câu tiếng Việt. Phải đi qua
  `toUserMessage()`.
- **`subscription_plans` có 3 gói nhưng KHÔNG ai đọc được** — RLS bật (bật ở ngoài
  migrations) mà không có policy SELECT nào. Nên `subscription-service` embed
  `subscription_plans(*)` luôn trả `null`. Chưa hỏng gì thấy được vì `TrialModal`
  hardcode danh sách gói — nhưng đó là nguồn chân lý kép. Sửa: thêm policy SELECT
  cho `anon, authenticated` (bảng giá là thông tin công khai).
- `secondaryHover: #B08D63` / `secondaryPress: #9A784F` do Antigravity tự đặt ở `theme.ts` — chưa ai xác nhận.
