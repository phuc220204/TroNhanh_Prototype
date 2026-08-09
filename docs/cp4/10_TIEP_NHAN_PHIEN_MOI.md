# Tiếp nhận phiên mới — đọc file này TRƯỚC

> Cập nhật: 2026-08-08 · Nhánh `feature/cp4-foundation`
> Đọc kèm: `CLAUDE.md` (luật) · `CONTEXT_HANDOFF.md` (bối cảnh + bài học Antigravity)
>
> File này trả lời đúng ba câu: **đang dở gì · làm gì tiếp · đừng vấp vào đâu.**

---

## 1. Trạng thái build — SẠCH, không có việc dở

```
30/30 migration đã lên remote
pnpm typecheck / typecheck:strict / build  đều xanh
noImplicitAny ĐÃ BẬT  ·  build đã gồm cả 2 nấc typecheck
```

Không có blocker. Việc tiếp theo chọn từ §3 — **và §3 giờ gần như chỉ còn việc
của chủ dự án.**

### Hai luật về migration — vẫn phải nhớ

> ⚠️ **ĐỪNG sửa `database.types.ts` bằng tay. ĐỪNG bọc `as any`.** Ba lỗi đó là
> tín hiệu ĐÚNG cho biết migration chưa lên DB. Trong dự án này việc "làm cho lỗi
> biến mất" đã xảy ra 3 lần (T19, T20, T27) và mỗi lần đều dẫn tới typecheck xanh
> nhưng app chết lúc chạy thật.

> ⚠️ **Lỗi `failed to connect to the docker API` sau dòng `Applying migration...`
> là NHIỄU.** Đã gặp 4 lần. Kiểm bằng:
> ```
> npx supabase migration list
> ```
> Mọi dòng phải có `local` khớp `remote`. Đó là bằng chứng duy nhất đáng tin —
> `db:types` không dùng được làm bằng chứng khi migration chỉ sửa trigger/policy
> (PostgREST không expose nên file types không đổi).

Phần "đơn giá theo phòng" **đã hoàn chỉnh**, kể cả UI sửa: `/chu-tro/quan-ly-phong`
→ bấm một phòng → nút **"Sửa phòng"** trên header modal chi tiết. Ghi qua RPC
`update_room` (migration `20260808100000`) chứ không update thẳng, vì đổi trạng
thái phòng sang `Rented` phải kéo theo tin đăng liên kết (BR-027).

---

## 2. QUYẾT ĐỊNH NGHIỆP VỤ chốt trong phiên trước — đừng làm ngược lại

| Quyết định | Lý do |
|---|---|
| **Không nhãn phiên bản nào lọt ra UI** — không `[V1]`, `[Demo]`, "sắp có" | Sản phẩm phải trông như app thật đang kinh doanh. Nút không làm được việc thì **xóa** hoặc **đổi thành việc làm được thật** |
| **"Yêu thích" và "Tin đã lưu" là MỘT** | Hai nhãn cùng nghĩa; tách ra khiến người dùng đi tìm ở hai chỗ. Cả hai dẫn về `/yeu-thich` |
| **Nhắc nợ tự động KHÔNG làm ở CP4** | Cần app mobile cho người ở mới có nghĩa. Xem `08_BACKLOG_SAU_CP4.md` §1 |
| **Đơn giá điện/nước theo PHÒNG, ghi đè giá khu** | Chủ trọ thu 3.500đ/kWh với hợp đồng cũ, 3.700đ với phòng ký mới. `null` = theo khu; `0` = miễn phí — **hai ý khác nhau, đừng gộp** |
| **Boost chỉ đặt được qua RPC có ghi `payments`** | Trước đó client tự cấp boost miễn phí qua 2 đường |

### Một ranh giới quan trọng khi gặp "nút chết"

Câu hỏi đúng là **"tính năng này có nằm trong sản phẩm không"**, không phải
"code có tồn tại không".

- Nút chết vì tính năng **không thuộc sản phẩm** → xóa
- Nút chết vì tính năng **chưa làm xong** → làm cho xong

Phiên trước đã xóa "Yêu thích" vì thấy "không có route, không có bảng" — sai, đó
là dấu hiệu việc còn dở. Chủ dự án đã chỉ ra và nó được làm thành tính năng thật.

---

## 3. VIỆC CÒN LẠI đến khi xong CP4

| Task | Nội dung | Ai làm | Trạng thái |
|---|---|---|---|
| **T32 phần 2** | Đi luồng trên DB trống — checklist 32 mục ở `09_T32_CHECKLIST_DB_TRONG.md` (mục 1–5 đã xong) | **Chủ dự án** — cần click, đăng ký, quét QR | ❌ **việc kế tiếp, chặn mọi thứ khác** |
| **T30-1** | Chạy `supabase/tests/rls.sql` — 27 assertion cô lập RLS, **CHƯA TỪNG CHẠY** | **Chủ dự án** (SQL Editor) | ❌ |
| **T30-2** | Test storage cross-folder qua Console | Chủ dự án | ❌ |
| **T31-1** | Rà toàn bộ AC ở `06_QA_CHECKLIST.md` §5 | Chủ dự án | ❌ |
| **T31-5** | Video demo 30–60s luồng điện nước → VietQR | Chủ dự án | ❌ |
| **T29** | Playwright: cài + config + 7 spec / 30 test | Claude | ✅ **đã viết, CHƯA CHẠY** (xem cảnh báo dưới) |
| **T30-3** | README: 4 account demo, lệnh setup, tắt email confirmation, SQL bootstrap Admin | Claude | ✅ |
| **T31-2** | Bật `noImplicitAny: true` | Claude | ✅ — **chỉ 7 lỗi**, không phải 150–400 |
| **T31-3** | `build` = `build:ci` | Claude | ✅ |
| **T31-4** | Dọn docs | Claude | ✅ |

### Hai phụ thuộc thứ tự dễ bỏ sót

1. **T32 phần 2 phải TRƯỚC `pnpm test:e2e`.** Bộ E2E đã viết xong nhưng **cố ý
   chưa chạy lần nào** vì lý do này: nó tạo khu, phòng, tin đăng, tin nhắn. Chạy
   trước là mất vĩnh viễn cơ hội test "trải nghiệm khách đầu tiên trên hệ thống
   trống". Trước khi chạy, đọc `tests/e2e/README.md` §1 (điều kiện chạy + dữ liệu
   rác mỗi lần chạy và cách dọn).
2. **`rls.sql` phải chạy khi ĐÃ CÓ dữ liệu.** 7 test đầu là "seller.b không đọc
   được `properties`/`rooms`/... của seller.a". Trên DB trống thì A không có gì →
   B đọc 0 dòng → **test pass nhưng vô nghĩa**. Seed `seller.a` trước.

---

## 4. CHƯA VERIFY TAY — quan trọng nhất khi tiếp nhận

Sáu RPC + hai trigger đã lên remote nhưng **chưa từng được gọi thật lần nào**.

| Việc | Cách kiểm |
|---|---|
| **🔴 Trigger canh boost** | Console ở `/tai-khoan/tin-cho-thue`: `window.__sb.from("rental_listings").update({boost_expire_at:"2030-01-01"}).eq("id","<id>")`. Phải ra `BOOST_REQUIRES_PAYMENT`. **Thành công = lỗ boost vẫn mở** |
| `soft_delete_property` | Xóa khu còn phòng `Rented` → phải bị chặn |
| `extend_contract` | Gia hạn lấn sang hợp đồng Active khác → `ROOM_HAS_ACTIVE_CONTRACT` |
| `boost_listing` | Chọn gói → tin có badge nổi bật, `payments` có dòng purpose `Boost` |
| `link_listing_to_room` | Gắn phòng cho tin; gắn **cùng phòng** cho tin thứ hai → `ROOM_ALREADY_LISTED` |
| `record_utility_reading` (đã sửa) | Tạo phòng có đơn giá riêng → ghi chỉ số → `utility_readings.unit_price` phải là giá PHÒNG, không phải giá khu |
| **VietQR** | **Quét bằng app ngân hàng thật.** CRC đã kiểm (`crc16("123456789")==="29B1"`), payload parse ngược đúng TLV, nhưng **28 mã BIN chưa đối chiếu NAPAS** — BIN sai thì QR vẫn quét ra, chỉ ra sai ngân hàng |
| **Google login gộp tài khoản** | Đăng nhập Google bằng email đã có tài khoản mật khẩu → phải vào ĐÚNG tài khoản cũ, `/tai-khoan` giữ tên cũ. Điều kiện: `email_confirmed_at` không null |
| **Lưu tin yêu thích** | Bấm tim → `/yeu-thich` thấy tin → **reload, tim vẫn đỏ** |
| **Bug chuyển tab** | Nhập dở form đăng tin → alt-tab → quay lại, dữ liệu phải còn |

`window.__sb` chỉ có ở dev (`import.meta.env.DEV`), đã kiểm không lọt vào bundle production.

---

## 5. CẠM BẪY — đọc kỹ, đây là chỗ mất thời gian nhất

1. **RLS trả rỗng IM LẶNG.** `profiles`, `rooms`, `properties` là owner-only. Query
   từ phía người không sở hữu → RLS lọc mất row, **không có lỗi**. Đã cắn 4 lần.
   Cách đúng: RPC `security definer` với **danh sách cột TƯỜNG MINH** (đừng `p.*` —
   `properties` chứa `bank_account_number`).

2. **Helper dùng trong RLS policy phải `grant execute` cho CẢ `anon`.** Postgres
   đánh giá TẤT CẢ policy permissive rồi mới OR; policy không ghi `TO` mặc định
   `TO PUBLIC` nên anon vẫn chạy predicate. Thiếu EXECUTE → `permission denied`
   chặn **cả câu SELECT**. Đã làm chết toàn bộ marketplace công khai một lần.

3. **Hai đường FK giữa `occupancies` và `contracts`.** Mọi embed PostgREST phải chỉ
   rõ tên FK (`contracts!contracts_occupancy_id_fkey`), nếu không: hoặc đổi mảng
   thành object (typecheck bắt được), hoặc runtime *"more than one relationship
   was found"* (typecheck **không** bắt được).

4. **`redirectTo` của OAuth phải là origin trần.** App dùng hash router; Supabase
   nối `?code=` vào cuối URL. `origin/#/dang-nhap` → query nằm sau `#` →
   `location.search` rỗng → phiên KHÔNG được tạo, không có lỗi nào.

5. **Đừng đổi port dev khỏi 5173** — Google Cloud Console khai redirect URI cố định.

6. **`isLoading` đơn độc trong guard sẽ unmount cả cây route.** `RequireAuth` /
   `RequireRole` dùng `if (isLoading && !user)`. Lọc theo TÊN event trong
   `onAuthStateChange` là sai cách — phải so sánh `user.id`.

---

## 6. NỢ KỸ THUẬT đã biết

- **~9 chỗ ghép `err.message` vào UI** (`LoginPage`, `RegisterPage`, `QuanLyPage`,
  `useListingForm`) — vi phạm §7, lộ văn bản Postgres thô. Đăng nhập sai mật khẩu
  hiện chuỗi tiếng Anh của Supabase. Phải đi qua `toUserMessage()`.
- **`subscription_plans` có 3 gói nhưng KHÔNG ai đọc được** — RLS bật (bật ở ngoài
  migrations) mà không có policy SELECT. `SubscriptionData.plan` luôn `null`. Sửa:
  thêm policy SELECT cho `anon, authenticated`. Kèm theo `TrialModal` hardcode
  danh sách gói ⇒ nguồn chân lý kép.
- **`RoomDetailPage.tsx` ~1.080 dòng** — vượt ngưỡng 600 của §8.2. `OccupantsView`
  568 dòng và `MyListingsTable` cũng đang sát ngưỡng.
- **`ChuTroDashboardPage` import `listing-queries` của marketplace** — cross-import
  §2.1 còn sót từ T11b.
- **`dbSeeder.ts` 526 dòng** chưa chia. Nó cũng **chưa biết** ba cột giá mới của
  `rooms` — dữ liệu seed sẽ để `null` (thừa hưởng giá khu), đúng nhưng không test
  được nhánh giá riêng.
- ~~Chưa có UI sửa phòng~~ — ✅ **đã trả 2026-08-08.** RPC `update_room`
  (migration `20260808100000`) + `EditRoomModal`, mở từ nút "Sửa phòng" trên
  header modal chi tiết phòng. Phải là RPC vì đổi `status` sang `Rented` kéo theo
  tin đăng liên kết (BR-027) — hai bảng.
- **Chiều ngược của BR-027 chưa làm, và đang là quyết định treo.** Phòng rời
  `Rented` (về `Available`) thì tin đăng KHÔNG tự quay lại `Active`. Tự động hoá
  chiều đó sẽ tạo đường vòng qua kiểm duyệt: bấm hai lần đổi trạng thái phòng là
  tin `Rented` lên `Active` mà không qua Moderator, và không tính lại hạn 60 ngày
  (BR-003/BR-026). Nếu chủ dự án muốn có, phải chốt xem tin quay về `Active` hay
  `PendingApproval`.
- **`dbSeeder` và `AddRoomModal` cùng tạo phòng nhưng khác đường.** Bản sao
  `ChuTroDashboardPage/AddRoomModal.tsx` đã xóa (nó gửi `owner_id` từ client và
  insert thẳng vào `rooms`); giờ chỉ còn `workspace/components/AddRoomModal`.
  `dbSeeder.ts` vẫn insert trực tiếp — chấp nhận được vì nó là công cụ demo, nhưng
  đừng lấy nó làm mẫu.
- **Gắn tin từ phía PHÒNG chưa làm, và có lý do.** Chủ dự án yêu cầu, nhưng
  `RoomDetailTabs` nằm ở `workspace/` còn `rental_listings` thuộc marketplace —
  thêm UI đó là **cross-import vi phạm §2.1**. Hiện chỉ có một lối vào từ tin đăng
  (`/tai-khoan/tin-cho-thue` → cột "Phòng liên kết"). Muốn làm chiều ngược thì phải qua
  một RPC đọc tin của chính mình, không phải import thẳng.
- `secondaryHover: #B08D63` / `secondaryPress: #9A784F` do Antigravity tự đặt ở
  `theme.ts` — chưa ai xác nhận.
- **`theme.ts` có `secondary` và `sand` cùng bằng `#C99B65`.** `StyleGuidePage`
  key các ô màu theo giá trị hex nên React cảnh báo trùng key ở console dev. Vô
  hại với production, nhưng nó cũng có nghĩa là một trong hai token đang thừa.
- **Nút "Liên hệ" trên tin nhu cầu của chính mình** đã ẩn (BR-030). Trước đó nút
  vẫn hiện và `handleMessage` return sớm — bấm không có gì xảy ra.

---

## 7. Số đo hiện tại

```
[Demo] = 0 · alert( = 0 · nhãn phiên bản = 0
as any trên supabase.rpc/.from = 0
console.* ngoài supabase-error.ts = 0
30 migration, tất cả đã lên remote (local khớp remote)
noImplicitAny = true, 0 lỗi · typecheck:strict 0 lỗi · build gồm cả 2 nấc
7 spec Playwright / 30 test — đã viết, chưa chạy
```

Tài khoản demo: mật khẩu chung `TroNhanh@2026`, chi tiết ở `DEMO_ACCOUNTS.md`.
⚠️ **Sau T32, các tài khoản này KHÔNG còn dữ liệu nghiệp vụ.** Muốn có dữ liệu:
đăng nhập `seller.a` → bấm **"Khởi tạo dữ liệu mẫu"** trên dải onboarding.

---

## 8. Cách làm việc với chủ dự án

- **Trả lời tiếng Việt.**
- Terminal **PowerShell 5.1** (không `&&`) — mỗi lệnh một dòng. Dùng **pnpm**.
- **Commit hộ họ** sau mỗi việc đã review. Message tiếng Việt, có mục
  **"Sửa sau review"** nêu rõ Antigravity làm sai gì và vì sao nguy hiểm.
- **Không stage `dist/`** — kiểm `git diff --cached --name-only | grep ^dist/` = 0.
- Mô hình: Claude = kiến trúc sư + reviewer (SQL/RLS/RPC/service + review mọi thứ
  Antigravity làm). Antigravity = thợ code UI, nhận đúng 1 task file mỗi lần.
  **Luôn tự kiểm chứng, đừng tin báo cáo** — xem bảng bài học ở `CONTEXT_HANDOFF.md` §2.
