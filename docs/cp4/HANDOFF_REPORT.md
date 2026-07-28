# BÁO CÁO BÀN GIAO — CP4

> **Đọc file này trước tiên** nếu bạn là Agent tiếp nhận (Antigravity / Codex / agent khác).
> Ngày: 2026-07-25 · Người thực hiện phần này: Claude Code (Opus 5) · Nhánh: `mvp-cp3`

---

## 1. Tóm tắt trong 30 giây

**Đã làm:** toàn bộ phần **logic nặng / bán kính ảnh hưởng toàn cục** — 9 migration SQL (RLS + 16 RPC), typing từ 0 lên có type-check, error layer, query key factory, guard bảo mật, dọn 51 file dead code. Kèm bộ tài liệu đầy đủ.

**Chưa làm:** **toàn bộ tầng screen** (Phase 2, T19–T28) + service layer đọc/ghi + router mới.

**Lý do chia thế này:** một agent yếu viết RLS sẽ tạo ra **rò rỉ dữ liệu im lặng** (public SELECT lên `properties` → phơi số tài khoản ngân hàng) hoặc **list rỗng không báo lỗi** (inline `exists()` trong policy). Viết RPC thiếu ownership assert thì không có gì cứu được. Đó là 3 loại lỗi không thể phát hiện bằng cách nhìn UI. Ngược lại, dựng screen trên nền đã typed + đã có RPC là việc an toàn, sai thì thấy ngay.

**Trạng thái build hiện tại (đã chạy thật, không phải phỏng đoán):**
```
pnpm typecheck        → 0 lỗi   ✅  (lần đầu tiên trong lịch sử repo này)
pnpm typecheck:strict → 0 lỗi   ✅
pnpm build            → thành công  ✅
dev server + Supabase → chạy thật với dữ liệu seed, drawer render đúng  ✅
```

---

## 2. ✅ MÔI TRƯỜNG ĐÃ SẴN SÀNG — không còn việc setup nào chặn bạn

Cập nhật 2026-07-28. Những việc dưới đây **đã hoàn tất**, không cần làm lại:

| Việc | Trạng thái |
|---|---|
| `supabase init` + `link` | ✅ có `supabase/config.toml` |
| `db push` — **11 migration đã lên Supabase** | ✅ `migration list` xác nhận cả 12 dòng ở cột Remote |
| `pnpm db:types` → `database.types.ts` (40KB) | ✅ đã commit |
| `createClient<Database>` + `types/db.ts` (**T04b**) | ✅ đã nối, đã bắt được 7 mismatch |
| Tắt email confirmation | ✅ (4 account đăng ký qua app thành công) |
| 4 account demo `@tronhanh.demo` + role Admin | ✅ |
| Seeder chạy thật | ✅ properties/rooms/occupancies/contracts/invoices đều có dữ liệu |

**Nghĩa là bạn `git pull` rồi `pnpm install` là code được ngay.**

Chỉ còn **1 việc tay của chủ dự án** (không chặn bạn): seed lại `seller.a` để có dữ liệu 3 kỳ — xem `06_QA_CHECKLIST.md` §"Dọn dữ liệu demo".

---

## 3. ĐÃ LÀM — chi tiết

### 3.1 T01 — Sửa 7 bug đang hỏng demo cho mọi user

| Bug | File | Hậu quả trước khi sửa |
|---|---|---|
| `.eq("id", user.id)` trên `profiles` (×2) | `DangTinPage.tsx:559, 750` | `profiles.id` là uuid độc lập; auth id ở `user_id` → **kích hoạt Seller CHƯA TỪNG hoạt động**, prefill tên fail im lặng |
| `status = "Inactive"` | `QuanLyPage.tsx:309` | Vi phạm CHECK → **nút ẩn tin lỗi cho mọi user** |
| `status = "Repairing"` + option "Đang sửa" | `QuanLyPhongPage.tsx:288, 374, 840, 923, 1051, 1931` | Vi phạm CHECK `rooms.status` → **UI chết, write fail** |
| `justifyinit: "center"` | `ProtectedRoute.tsx:22` | CSS property vô nghĩa |
| `config.ts` throw ở module load | `config.ts` | Thiếu `.env` → **màn hình trắng** thay vì thông báo |
| `rooms.code` (cột không tồn tại) | `QuanLyPhongPage.tsx:1939` | Cột đúng là `room_code` → đổi mã phòng fail im lặng |
| `rooms.description` (cột không tồn tại) | `QuanLyPhongPage.tsx:1940` | Ghi chú phòng fail im lặng → đã thêm cột trong migration `0100` |

**Quyết định enum:** không nới CHECK cho `Inactive`/`Repairing`. `Inactive` là typo. `Repairing` là 1 nhãn UI không có nghiệp vụ đằng sau → dùng `Hidden`, đổi nhãn thành **"Đang ẩn / bảo trì"**.

### 3.2 T02 — Xóa 51 file + ~30 dependency

Đã verify trước khi xóa: grep `components/ui`, `cn(`, `clsx`, `tailwind-merge`, `class-variance-authority` **ngoài** folder `ui/` = **0 hit** (41/41 match nằm trong chính folder bị xóa).

Xóa: `src/shared/components/ui/**` (48 file) · `HomeFilter.tsx` (530 dòng, không ai import) · `mockListings.ts` · `default_shadcn_theme.css` · `figmaAssetResolver` trong `vite.config.ts` (map tới `src/assets/` không tồn tại).

Dependency bỏ: `@mui/*`, `@emotion/*`, 27 gói `@radix-ui/*`, `recharts`, `react-dnd*`, `embla`, `cmdk`, `vaul`, `sonner`, `react-slick`, `react-responsive-masonry`, `react-hook-form`, `input-otp`, `next-themes`, `react-day-picker`, `react-popper`, `@popperjs`, `react-resizable-panels`, `cva`, `tailwind-merge`, `clsx`, `tw-animate-css`, `canvas-confetti`, `date-fns`.

`react`/`react-dom` chuyển từ `peerDependencies` + `optional: true` → `dependencies`. (Trước đó `pnpm install --frozen-lockfile` trên CI **không đảm bảo** cài React.) Đổi `name` từ `@figma/my-make-file` → `tro-nhanh`.

**Bẫy đã gặp:** `src/styles/tailwind.css` import `tw-animate-css` → phải xóa dòng đó, nếu không `vite build` fail. **Typecheck không bắt được** (lỗi ở tầng CSS).

Mọi file đã xóa đều git-tracked ⇒ `git checkout <path>` lấy lại được.

### 3.3 T03 — TypeScript (từ zero)

`tsconfig.json` Nấc A (`strict: false`, `noImplicitAny: false`) + `tsconfig.strict.json` Nấc D (full strict, chỉ include `src/**/services`, `shared/query`, `shared/types`).

**Lần typecheck đầu tiên ra 17 lỗi, trong đó 4 là bug runtime thật chưa ai biết:**

| Bug | Ở đâu | Hậu quả |
|---|---|---|
| `signOut` được gọi nhưng **không hề destructure** từ `useAuth()` | `LandlordShell.tsx` `MobileTabBar` | **Đăng xuất từ tab bar mobile throw ReferenceError** |
| `DbListing` thiếu field `area` nhưng filter diện tích vẫn dùng | `QuanLyPage.tsx:417, 420` | Lọc theo diện tích không hoạt động |
| So sánh `status === "Available"` với type lowercase | `ChuTroDashboardPage.tsx:69-77` | **5 nhánh điều kiện luôn false** |
| `expiring`/`unpaid` dùng như `RoomStatus` (không tồn tại trong BR-002) | `QuanLyPhongPage.tsx:924, 1058, 1987, 1988` | Mọi bộ đếm liên quan **luôn ra 0** |

Cái cuối đã sửa thành **trạng thái dẫn xuất**: `isContractExpiringSoon()` đọc từ `contract.end` (≤30 ngày), và `!bill.paid` — nên các con số giờ mới có nghĩa. Thao tác của 2 nhánh menu cũ (`expiring`, `unpaid`) đã gộp vào nhánh `rented`, thêm nhánh `deposited` còn thiếu.

### 3.4 Migration — 9 file, đã viết xong

| File | Nội dung |
|---|---|
| `0100_status_lifecycle` | BR-001 đầy đủ cho listing (7 trạng thái) + demand post · cột kiểm duyệt · `rental_listings.property_id` · `rooms.description` · **`occupancies.link_status`** (cổng chống review gian lận) · `contracts` thêm `Draft` |
| `0200_indexes` | 22 index. **De-dupe TRƯỚC khi tạo unique index** (nếu không `db push` bị chặn). `pg_trgm` cho search tiếng Việt (không `tsvector`) |
| `0300_listing_metadata` | Rút `---METADATA---` khỏi `description` → 11 cột thật + `metadata jsonb` chỉ giữ `nearby`. Backfill cả 2 marker, có xử lý JSON hỏng |
| `0400_roles_moderation` | **`user_roles` bảng riêng** + 5 definer helper + `platform_settings` + `moderation_logs` + trigger signup |
| `0500_reviews` | `reviews` + `can_review_contract()` + **view `property_public_profiles`** + trigger `avg_rating` + policy renter đọc contract/invoice của mình |
| `0600_demand_posts` | +15 cột + backfill `title` bằng đúng chuỗi mapper đang synthesize |
| `0700_messaging` | `conversations` + `messages` + trigger unread đúng phía + Realtime |
| `0800_listing_media` | `listing_media` + bucket `listing-images` + 4 storage policy |
| `0900_rpcs_core` + `0900b` + `1000_demo` | **16 RPC** |

**3 quyết định bảo mật quan trọng nhất:**

1. **`user_roles` là bảng riêng, KHÔNG phải cột `profiles.role`.** `profiles` đã có policy `for update using (auth.uid() = user_id)` → một cột `role` ở đó cho phép **bất kỳ ai tự nâng mình thành Admin bằng 1 request PATCH**. Đây là lỗ privilege-escalation, không phải chuyện style. `user_roles` **cố ý không có policy INSERT/UPDATE/DELETE** — chỉ ghi qua RPC.

2. **Không bao giờ public SELECT lên `properties`.** RLS là row-level, không phải column-level → `bank_account_number` sẽ public. BR-024 chỉ implement bằng view `property_public_profiles` allow-list 6 cột, `security_invoker = false`.

3. **Không inline `exists()` vào bảng caller đọc không được** → âm thầm trả `false`, không lỗi, chỉ có list rỗng bí ẩn. 4 policy mới cần bọc `security definer`. Đã có 7 helper.

**Moderator cố ý KHÔNG có policy UPDATE** trên `rental_listings` → mọi transition buộc đi qua `moderate_listing()` ⇒ audit trail không thể bỏ sót. **Nếu bạn thêm policy UPDATE ở đó, bạn phá cơ chế audit.**

### 3.5 Nền TypeScript & bảo mật đã dựng

| File | Vai trò |
|---|---|
| `src/shared/services/supabase-error.ts` | **Nơi DUY NHẤT được `console.*`**. 27 domain error code → message tiếng Việt + `withErrorHandling()` wrapper |
| `src/shared/query/keys.ts` | Key factory cho toàn bộ React Query. **Không tự viết key string** |
| `src/shared/query/queryClient.ts` | Config + cờ `USE_REALTIME_MESSAGING` |
| `src/shared/components/RequireAuth.tsx` | Thay `ProtectedRoute`, thêm bảo toàn `?redirect=` |
| `src/shared/components/RequireRole.tsx` | Guard vai trò, render **màn 403** (không redirect — redirect làm Moderator thật tưởng bị đăng xuất) |
| `src/shared/components/MissingEnvScreen.tsx` | Thay màn hình trắng khi thiếu `.env` |
| `src/shared/services/vacancy-service.ts` | **Điểm nối duy nhất được phép** giữa 2 domain + `scoreDemandMatch()` thuần hàm |
| `src/shared/contexts/AuthContext.tsx` | Thêm `roles` + `hasRole()`; **sửa bug spinner nháy mỗi giờ** khi token tự refresh |
| `src/shared/theme.ts` | Hợp nhất token: thêm `error`/`warning`/`success`/`deposited` + `radius` + `space` |
| `supabase/tests/rls.sql` | 9 test cô lập RLS ở tầng SQL |

### 3.6 Tài liệu — 12 file

`/CLAUDE.md` (luật, tự nạp mỗi session) · `docs/cp4/00`→`07` · `.claude/skills/tronhanh-{schema,service,ui,qa}/SKILL.md`

---

## 4. CHƯA LÀM — việc của bạn

### 4.1 Phần còn lại của Phase 0/1 (làm trước, mọi thứ khác phụ thuộc)

| # | Việc | Ghi chú |
|---|---|---|
| ~~T04b~~ | ~~`createClient<Database>` + `types/db.ts`~~ | ✅ **ĐÃ XONG** |
| **T06 client** | Ngừng gọi `appendMetadataToDescription` ở **write path**; giữ parser ở read path 1 release | `marketplace/utils/listingMetadata.ts`, `DangTinPage`, `RoomDetailPage` |
| **T08 primitive** | Dựng 8 component: `Button` `Badge` `Card` `Table` `EmptyState` `Pagination` `Toast` `Skeleton` trong `shared/components/common/` | **Làm sớm** — 12 screen mới đều cần, không có thì mỗi page tự mọc 200 dòng style |
| **T08 token** | Xóa 24 khai báo `--tn-*` dead trong `styles/theme.css`; `StyleGuidePage` xóa `C` local → import `shared/theme` | Styleguide là **bài test hồi quy** cho việc này |
| **T09 fallback** | Xóa mock fallback: `HomePage.tsx:1219-1221`, `QuanLyPhongPage.tsx:1898`, `ChuTroDashboardPage.tsx:643,653` | Vi phạm PRD AC#1. Cần `EmptyState` từ T08 trước |
| **T10 còn lại** | Mount `QueryClientProvider` trong `App.tsx`; tạo `SubscriptionContext`; **xóa hack `window.dispatchEvent("tronhanh_sub_status")`** (`LandlordShell.tsx:346`) | `grep tronhanh_sub_status src` phải = 0 |
| **T11a/b/c** | **Toàn bộ service layer.** Signature đầy đủ ở `04_FRONTEND_ARCH.md` §4 | Đây là thứ mọi task Phase 2 phụ thuộc |
| **T12** | Router: thêm ~20 route, nest `RequireAuth`/`RequireRole`, tạo `RenterShell`, **chuyển `QuanLyPage.tsx` từ `workspace/` sang `marketplace/`** | Shell đi theo dữ liệu, không theo khung giao diện |
| **T18 seeder** | Chia `dbSeeder.ts` thành `seed-seller` / `seed-renter` / `seed-demo-world`; thêm nút DemoFAB gọi `demo_link_me_to_seeded_occupancy` | Không có nút này thì **review không demo được** |

### 4.2 Phase 2 — 5 luồng + 4 extras (T19–T28)

Chi tiết ở `05_BUILD_PLAN_CP4.md`. **Thứ tự khuyến nghị:**

```
T11a + T11b + T11c  →  T12  →  song song: T19, T22, T24, T25
                                       →  T21, T26, T23, T20, T27, T28  →  T29–T31
```

**Song song được** (đều chỉ cần T17 + guard, đã xong): `T21 ‖ T22 ‖ T24 ‖ T25`

### 4.3 Nếu thiếu thời gian
**Tối thiểu:** T19 (ảnh), T22 (demand post), T24 (occupancy), T25 (nhắn tin).
**Cắt:** `/chu-tro/hoa-don` (T27); bật Nấc B (T31).
**KHÔNG cắt:** T21 (kiểm duyệt), T26 (review) — 2/3 nghĩa của luồng 4, và ấn tượng nhất khi demo.

---

## 5. 8 CẠM BẪY — đọc kỹ, đây là chỗ sẽ mất thời gian nhất

1. **`profiles` khoá theo `user_id`, KHÔNG phải `id`.** `profiles.id` là `gen_random_uuid()` độc lập. Đây là bug đã có sẵn và sẽ tái diễn. `Database` generic giờ bắt được — **đừng bỏ generic đi**.

2. **Policy không được inline `exists()`** vào bảng caller đọc không được → list rỗng **không có lỗi nào**. Dùng 7 helper `security definer` đã có.

3. **Không thêm policy public SELECT lên `properties`** → phơi số tài khoản ngân hàng cho anon.

4. **RPC: assert ownership TRONG body chính là biên bảo mật.** `security definer` bypass RLS. Không assert = không bảo mật.

5. **Đừng nhận `owner_id`/`seller_id`/`status`/`total_amount`/`previous_reading`/`unit_price` từ client.** RPC đã derive server-side hết. Nếu bạn thêm param cho chúng, bạn mở lỗ.

6. **`link_status` không bao giờ auto `Confirmed`** (BR-029). Đó là toàn bộ giá trị chống gian lận của review. Và **đừng nới `can_review_contract()`** để demo cho dễ — dùng `demo_link_me_to_seeded_occupancy()`.

7. **`rooms.status` đúng 4 giá trị, `rental_listings.status` đúng 7.** Không có `Repairing`, không có `Inactive`. `expiring`/`unpaid` là **trạng thái dẫn xuất**, không phải RoomStatus.

8. **`data-testid` là DoD của từng task**, không dồn về T29. Codebase có **zero `className`** ⇒ testid là selector ổn định duy nhất.

---

## 6. Kiểm tra sức khoẻ trước khi bắt đầu

```bash
pnpm install
pnpm typecheck        # phải 0 lỗi
pnpm typecheck:strict # phải 0 lỗi
pnpm build            # phải xanh
pnpm dev              # trang chủ phải render
```

Nếu `typecheck` ra lỗi ngay khi chưa sửa gì → có thể bạn vừa chạy `pnpm db:types` và type mới làm lộ lỗi cũ. **Đó là điều tốt** — sửa chúng, đừng nới `tsconfig`.

## 7. Cách làm việc

1. Mở **đúng 1 file task** trong `docs/cp4/tasks/`, không mở cả folder.
2. `/CLAUDE.md` tự nạp — đó là luật, không phải gợi ý.
3. Gọi skill phù hợp: `tronhanh-schema` (SQL) · `tronhanh-service` (data) · `tronhanh-ui` (screen).
4. **Cuối mỗi task: chạy `tronhanh-qa`** và dán output thật của typecheck/build.
5. Xong DoD → commit → mới sang task sau.

> Nếu một DoD không pass: **giữ task ở trạng thái chưa xong**, nêu rõ cái gì fail. Báo hoàn thành một phần như thể đã hoàn thành là tệ hơn báo chưa xong.

---

## 8. Đã verify được gì / chưa verify được gì

**Đã chạy thật:**
- ✅ **11 migration apply sạch** lên Supabase, không lỗi SQL nào.
- ✅ **Trigger `handle_new_user()`** tạo `profiles` (đúng `full_name`/`contact_phone` từ metadata) + tự gán role `Renter`; cấp `Admin` bằng SQL snippet chạy đúng.
- ✅ **Seeder ghi thật** vào 9 bảng qua RLS của user thường — chứng minh policy không chặn nhầm chủ sở hữu.
- ✅ **Drawer chi tiết phòng** đọc `utility_readings`/`invoices`/`payments`/`contracts` và render đúng (đã chụp 3 tab).
- ✅ `typecheck` / `typecheck:strict` / `build` xanh.

**CHƯA verify — việc của bạn:**
- ⚠️ **`supabase/tests/rls.sql` chưa ai chạy.** Đây là kiểm chứng bảo mật quan trọng nhất (đặc biệt TEST 4 — rò rỉ cột `bank_*`). Cần thay 4 UUID rồi chạy. **Mọi cột `ok_*` phải `true`.**
- ⚠️ **13/16 RPC chưa được gọi lần nào.** Mới chỉ có đường ghi trực tiếp của seeder chạy qua. `create_listing_with_details`, `create_occupancy_with_contract`, `post_review`, `moderate_listing`, `start_conversation`… đều chưa có lần gọi thật nào. Task nào dùng RPC thì **phải test luồng đó tay ít nhất 1 lần**, đừng tin là nó chạy.
- ⚠️ **Cô lập RLS giữa 2 seller chưa test** (`seller.b` chưa seed dữ liệu).
- ⚠️ Còn **~38 `console.error`** ở các page cũ — T09 dọn.
- ⚠️ Mock fallback vẫn còn ở 4 chỗ (`HomePage`, `QuanLyPhongPage`, `ChuTroDashboardPage`) — T09 dọn.
