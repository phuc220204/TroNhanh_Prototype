# CLAUDE.md — Luật bắt buộc cho Agent Code (Trọ Nhanh)

> File này được nạp tự động mỗi session. Đây là **luật**, không phải gợi ý.
> Tài liệu kèm theo: `docs/cp4/00_README_CP4.md` (bắt đầu từ đây) · `docs/A_PRD_TroNhanh_MVP.md` (PRD nền CP3) · `docs/cp4/01_PRD_CP4.md` (scope CP4).

---

## 0. Nguồn chân lý & thái độ

- Thứ tự ưu tiên khi mâu thuẫn: **file task đang làm** → `docs/cp4/*` → `docs/02_Technical_Project_Specification_TroNhanh_v2.md` → `docs/A_PRD_TroNhanh_MVP.md`.
- **Rõ ràng hơn thông minh.** Code dễ đọc quan trọng hơn code ngắn.
- **Không tự thêm tính năng ngoài scope task.** Thấy cần thêm → ghi `// TODO(proposal): ...` và hỏi người dùng.
- **Mỗi lần chỉ làm 1 task file.** Xong DoD rồi mới sang task sau. Tự kiểm DoD trước khi báo xong.
- Enum trạng thái, tên entity, business rule: **lấy đúng, không tự đặt mới**.

## 1. Thuật ngữ (BẮT BUỘC dùng đúng)

`Property` (khu trọ) · `Room` (phòng) · `Occupancy` (người ở — **KHÔNG phải role**) · `Renter` (tài khoản đi thuê) · `Seller` (người đăng tin) · `RentalListing` (tin cho thuê) · `DemandPost` (tin nhu cầu) · `Review` (đánh giá khu trọ) · `Moderator` (người kiểm duyệt).

- ❌ **CẤM dùng "Tenant"** ở bất kỳ đâu: biến, bảng, comment, UI copy. Thay bằng `Occupancy` hoặc `Renter`.
- UI copy cũng phải đúng: dùng **"Người ở"**, không dùng "Người thuê trọ" khi nói về `Occupancy`.

## 2. Ranh giới domain — 4 shell

```
src/shared/       hạ tầng dùng chung: supabase client, types, services hạ tầng, contexts, UI primitives
src/marketplace/  Public/Renter/Seller-tin-đăng: landing, search, chi tiết, đăng tin, demand post, review
src/workspace/    SaaS chủ trọ (/chu-tro/*): dashboard, khu/phòng, người ở, hợp đồng, điện nước, hóa đơn
src/admin/        Kiểm duyệt & quản trị (/quan-tri/*) — shell thứ 4, xem §2.3
src/routes/       router
```

### 2.1 Luật cross-import
`marketplace` và `workspace` **KHÔNG import lẫn nhau qua tầng dữ liệu**, và **không query thẳng table của domain kia**.

Cơ chế cưỡng chế: mọi truy cập DB đi qua service layer đặt **trong shell sở hữu table đó**.
- `properties`, `rooms`, `occupancies`, `contracts`, `utility_readings`, `invoices`, `invoice_items`, `payments` → chỉ `src/workspace/services/`
- `rental_listings`, `listing_amenities`, `listing_media`, `demand_posts`, `reviews` → chỉ `src/marketplace/services/`
- `profiles`, `user_roles`, `conversations`, `messages`, `user_subscriptions`, `platform_settings` → `src/shared/services/`
- `moderation_logs` + mọi RPC moderator → chỉ `src/admin/services/`

### 2.2 Điểm nối được phép — đúng 2 cái, không thêm
1. **"Tạo tin từ phòng trống"** (Room → RentalListing, prefill). `Room` và `RentalListing` là **2 entity độc lập**.
2. **`src/shared/services/vacancy-service.ts`** → `getMyVacantRoomSummaries()`. Chỉ trả `{ roomId, district, price, area, propertyName }` — **không** trả dữ liệu vận hành. Dùng cho `/chu-tro/tim-nguoi-thue`.

Mọi crossing khác phải server-side (trong RPC), không phải ở frontend.

### 2.3 `src/admin/` được miễn luật §2.1 một cách tường minh
Admin/Moderator hợp lý khi nhìn cả 2 domain. Nhưng: `src/admin/services/` **chỉ được gọi RPC moderator** (`moderate_listing`, `grant_role`, `set_platform_setting`, …) và các policy moderator-scoped. Không viết query thô vào bảng nghiệp vụ.

### 2.4 Shell đi theo dữ liệu, không đi theo khung giao diện
Một page render bên trong `LandlordShell` nhưng chạy 100% trên `rental_listings` thì **thuộc marketplace**. Đó là lý do `QuanLyPage.tsx` nằm ở `src/marketplace/pages/`.

## 3. Backend = Supabase

- Dùng `@supabase/supabase-js` với generic: `createClient<Database>(...)`. **Không** tự viết JWT/auth.
- **Bật RLS cho mọi bảng.** RLS là cơ chế multi-tenant — **không** dựa vào việc lọc ở client.
- ❌ **Không bao giờ** đặt `service_role` key ở frontend. Frontend chỉ dùng `anon` key.
- **Không sửa `supabase/migrations/20260702_init.sql`.** Mọi thay đổi schema là file migration MỚI, đặt tên `YYYYMMDDHHMMSS_<slug>.sql`, và **idempotent** (`if not exists` / `drop ... if exists`) để `db push` lại được an toàn.
- Dùng **Supabase CLI**, không paste tay vào SQL editor: `supabase db push`.

### 3.1 ⚠️ LUẬT RLS QUAN TRỌNG NHẤT — security definer
> **Bất kỳ predicate nào trong policy phải đọc row NGOÀI phạm vi RLS của caller thì BẮT BUỘC bọc trong hàm `security definer stable`. TUYỆT ĐỐI không inline `exists (select ... from <bảng caller không đọc được>)`.**

**Vì sao:** `exists` lồng trong policy **cũng chịu RLS của bảng bên trong** → âm thầm trả `false`. Không có lỗi, không có warning — chỉ có list rỗng bí ẩn. Đây là lỗi tốn nhiều giờ debug nhất trong setup này.

Helper đã có (dùng, đừng viết lại): `has_role(uuid,text)` · `is_moderator()` · `can_review_contract(uuid,uuid)` · `is_linked_occupant(uuid)` · `is_property_public(uuid)` · `owns_property(uuid)` · `owns_room(uuid)`.

Mọi helper: `language sql stable security definer set search_path = public`.

> ⚠️ **Helper dùng TRONG POLICY phải `grant execute` cho MỌI role có thể chạm bảng đó — kể cả `anon`.**
>
> Postgres đánh giá **TẤT CẢ** policy permissive rồi mới OR kết quả. Một policy không ghi mệnh đề `TO` thì mặc định `TO PUBLIC`, nên `anon` vẫn phải chạy predicate của nó. Nếu `anon` thiếu EXECUTE trên hàm trong đó → **`permission denied` và CẢ câu SELECT bị chặn**, không phải trả về rỗng.
>
> Đây từng làm **toàn bộ marketplace công khai chết** (anon không xem được tin nào) vì `is_moderator()` bị `revoke ... from anon` — xem migration `20260728090000`.
>
> An toàn vì các hàm này chỉ trả boolean về **chính người gọi**; với anon thì `auth.uid()` là null nên luôn false.
>
> Kèm theo: **luôn ghi `to authenticated` tường minh** cho policy chỉ dành cho người đã đăng nhập.

Hàm nhận uuid tùy ý (`has_role(uuid,text)`) thì **không** cấp cho anon — tránh dò thông tin.

**Ngoại lệ duy nhất** được inline `exists`: khi cả hai phía đều đọc được row đó bằng RLS của chính họ (ví dụ policy trên `messages` nhìn `conversations` — cả 2 participant đều SELECT được conversation).

### 3.2 ⚠️ NGUY CƠ RÒ RỈ DỮ LIỆU — không public SELECT lên `properties`
> **TUYỆT ĐỐI không thêm policy public/anon SELECT lên bảng `properties`.**

RLS là **row-level, không phải column-level**. Một policy public sẽ phơi `bank_account_number`, `bank_account_name`, và toàn bộ đơn giá ngay khi ai đó "bật trang khu trọ công khai". BR-024 chỉ được implement bằng view `property_public_profiles` với **allow-list cột tường minh** (`security_invoker = false`). Nếu thấy ai "sửa" view đó thành `security_invoker = true` hoặc thêm cột — đó là regression bảo mật.

Nguyên tắc chung: **cần public đọc một phần bảng có cột nhạy cảm → dùng view allow-list cột, không dùng policy.**

## 4. Quản lý secret

- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Gom vào `src/shared/config.ts` (validate).
- ❌ Không hardcode secret. ❌ Không commit `.env`. `.env.example` liệt kê tên biến, không có giá trị thật.
- Không rải `import.meta.env` khắp nơi.
- `config.ts` **fail-soft**: export `configError: string | null`, `App.tsx` render màn hình tiếng Việt. **Không throw ở module load** — trong graph route lazy-load nó tạo màn hình trắng.

## 5. Quy ước đặt tên (định danh tiếng Anh)

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Biến, hàm | `camelCase` | `roomList`, `calculateInvoiceTotal()` |
| Class, Type, Interface, Component React | `PascalCase` | `RoomCard`, `InvoiceItem` |
| Hằng số, biến môi trường | `UPPER_SNAKE_CASE` | `MAX_ROOMS_PER_PROPERTY` |
| File TS/logic, service | `kebab-case` | `listing-queries.ts`, `create-invoice.ts` |
| File Component React | `PascalCase` | `RoomCard.tsx` |
| Bảng/cột DB | `snake_case`, bảng số nhiều | bảng `rooms`, cột `property_id` |
| Hàm RPC Postgres | `snake_case`, động từ trước | `create_invoice_with_items` |
| Route URL | `kebab-case` tiếng Việt | `/chu-tro/quan-ly-phong`, `/tin-nhu-cau` |
| Nhánh Git | `<type>/<mô-tả-ngắn>` | `feature/utility-reading` |

- Boolean có tiền tố `is/has/can/should`: `isSeller`, `hasActiveContract`, `canWrite`.
- Hàm bắt đầu bằng động từ: `getRoomById`, `createInvoice`, `markInvoicePaid`.
- Tránh viết tắt (`occupancy` không `occ`); ngoại lệ: `id`, `url`, `qr`.
- Comment/commit có thể tiếng Việt; **tên định danh luôn tiếng Anh**.
- Hàm RPC demo-only **phải** có tiền tố `demo_` và được liệt kê trong `docs/cp4/02_SCHEMA_DECISIONS.md` §"Drop trước production".

## 6. Async, transaction & RPC

- Luôn `await` mọi Promise; bọc `try/catch`. Không trộn `.then()` với `async/await` trong cùng hàm.
- **Nhóm thao tác đa bảng phải atomic** → gói trong **một Postgres function (RPC)**. Không để trạng thái lệch giữa các bảng bằng chuỗi `await` tuần tự.
- Bắt buộc dùng RPC: tạo tin đăng (+amenities+media), sửa tin, kiểm duyệt tin, tạo occupancy+contract (+đổi room status), tạo invoice+items, ghi payment (+đổi invoice status), post review, start conversation, grant/revoke role.

### 6.1 Luật viết RPC
Mọi function: `language plpgsql volatile security definer set search_path = public`, kèm:
```sql
revoke execute on function public.<fn>(...) from public, anon;
grant  execute on function public.<fn>(...) to authenticated;
```
Body **mở đầu bằng**:
```sql
v_uid := auth.uid();
if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
```

> **`security definer` bypass RLS ⇒ assert ownership BÊN TRONG body CHÍNH LÀ biên bảo mật.** Không có assert = không có bảo mật.

- `set search_path = public` là **bắt buộc**, không phải trang trí (chống search-path hijacking).
- **Giá trị nhạy cảm derive server-side, KHÔNG nhận từ client:** `seller_id`, `owner_id`, `poster_id`, `property_id` của review, `previous_reading`, `unit_price`, `invoice.total_amount`, và `status` của tin đăng. Nhận từ client = cho client tự phong quyền.
- Raise domain error code làm **message** (`raise exception 'REVIEW_NOT_ELIGIBLE'`) để `supabase-error.ts` map sang tiếng Việt mà không phải string-match văn bản Postgres.

## 7. Xử lý lỗi & validation

- **Validate trước khi ghi, ở server (RPC).** Không tin dữ liệu client. Ví dụ bắt buộc: `current_reading ≥ previous_reading`; `invoice.total = Σ invoice_items.amount`; `room_code` unique trong property; không 2 hợp đồng Active chồng thời gian trên cùng phòng.
- Message lỗi cho user: **tiếng Việt, thân thiện**. ❌ Không lộ lỗi kỹ thuật/stack ra UI.
- Mọi lỗi đi qua `src/shared/services/supabase-error.ts` → `toUserMessage(e)`.
- ❌ **Không `console.log` / `console.error` ở bất kỳ đâu ngoài `logError()` trong `supabase-error.ts`** (PRD AC#5).
- Kiểm ownership ở mọi thao tác SaaS: RLS lo tầng DB, RPC lo tầng ghi, UI cũng không hiển thị dữ liệu người khác.

## 8. Frontend

- ❌ **KHÔNG dùng `localStorage`/`sessionStorage` để tự quản auth** — Supabase Auth tự lo session.
- Data fetch qua **React Query** (`@tanstack/react-query`) + service layer. Key lấy từ `src/shared/query/keys.ts` — **không tự viết key string**.
- State chia sẻ: React context (`AuthContext`, `SubscriptionContext`). ❌ **Không dùng `window.dispatchEvent`/`addEventListener` làm event bus** giữa các component.
- 3 state phải phân biệt rõ: `isPending` / `isError` / `data.length === 0`. ❌ **Không fallback sang mock khi DB rỗng** — DB rỗng thì render `EmptyState` (PRD AC#1).
- Thao tác chính ≤ 3 chạm. Banner "DEMO" ở nơi còn mock. Mọi thanh toán giả lập phải ghi rõ **"(giả lập)"**.

### 8.1 Styling — inline style + token từ `src/shared/theme.ts`
- **Nguồn chân lý duy nhất cho token: `src/shared/theme.ts`** (`C`, `font`, `radius`, `space`).
- ✅ Code mới: inline `style={{}}`, import token từ `shared/theme`.
- ❌ Không hex literal mới. ❌ Không `className`. ❌ Không thêm biến `--tn-*`. ❌ Không dùng Tailwind cho code mới.
- Màu theo trạng thái lấy từ `src/shared/utils/statusMaps.ts`, không tự map.
- Dùng primitives ở `src/shared/components/common/` (`Button`, `Badge`, `Card`, `Table`, `EmptyState`, `Pagination`, `Toast`, `Skeleton`, `AppSelect`, `FormField`, `ModalShell`). Copy-paste một component lần thứ 2 → chuyển nó vào `common/`.
- Responsive qua `useBreakpoint()` (mobile <768 ≤ tablet <1024 ≤ desktop), không viết media query mới.

### 8.2 Split-on-touch (luật kích thước file)
Repo có nhiều file 1.000–2.200 dòng. **Không big-bang refactor.**
- Task chỉ được tái cấu trúc **vùng nó phải sửa**.
- File > **600 dòng** sau khi sửa → split là **phần của DoD task đó**.
- Page **mới** phải < **400 dòng**.
- Khi split: `pages/TenPage/index.tsx` + 1 file / view.

### 8.3 `data-testid`
Codebase có **zero `className`** ⇒ `data-testid` là selector ổn định **duy nhất** cho E2E. Thêm testid cho element mà spec E2E chạm vào là **DoD của chính task tạo ra element đó**, không phải việc dọn dẹp về sau.

### 8.4 Guard
- `RequireAuth` (đăng nhập) + `RequireRole anyOf={[...]}` (vai trò). Không dùng `ProtectedRoute` (đã thay).
- `RequireRole` render **màn 403 tiếng Việt**, không redirect — redirect làm Moderator thật tưởng mình bị đăng xuất.
- > **Guard client chỉ là UX.** Biên bảo mật thật là `is_moderator()` trong RPC + RLS policy moderator-scoped. Không bao giờ authorize dựa trên flag client đọc được (kiểu `profiles.is_seller`).
- READ_ONLY (BR-015): disable nút ghi qua `useCanWrite()` ở một chỗ, không check per-button.

## 9. Business rules phải tôn trọng

| BR | Nội dung |
|---|---|
| BR-001 | RentalListing status: `Draft / PendingApproval / Active / Rejected / Hidden / Expired / Rented` |
| BR-002 | Room status: `Available / Deposited / Rented / Hidden` — **đúng 4 giá trị, không có "Repairing"** |
| BR-003 | Sửa field quan trọng của tin Active → về `PendingApproval` (khi kiểm duyệt thủ công) |
| BR-004 | Invoice status: `Unpaid / PartiallyPaid / Paid / Overdue`; quá `due_date` → `Overdue` |
| BR-005 | Tin có `boost_expire_at` còn hạn **xếp trước** trong mọi danh sách |
| BR-006 | Một phòng không có 2 hợp đồng Active chồng thời gian |
| BR-007 | Dữ liệu SaaS riêng tư tuyệt đối giữa các Seller |
| BR-012 | Dashboard: "Phòng trống" luôn hiện; "Tổng phòng"/"Đang thuê" **mặc định ẩn**, có toggle |
| BR-014 | Guest thấy SĐT che một phần; đăng nhập mới thấy đủ |
| BR-015 | Hết hạn gói → module SaaS `READ_ONLY`, **không mất dữ liệu** |
| BR-022 | Chỉ review được khi occupancy `link_status='Confirmed'` + hợp đồng ≥30 ngày (hoặc đã có ≥1 payment) |
| BR-023 | 1 review / 1 đợt ở (`unique(contract_id)`); sửa được trong 7 ngày |
| BR-024 | Review chỉ hiện công khai khi khu bật `is_public_profile_enabled` |
| BR-026 | Tin được duyệt có hạn 60 ngày (`expire_at`) |
| BR-027 | Phòng chuyển `Rented` → tin đăng liên kết chuyển `Rented` |
| BR-029 | Gắn Renter vào Occupancy phải qua `link_status`: `Pending` → `Confirmed`. **Không tự động Confirmed** |
| BR-030 | Không tự review khu của mình; không tự nhắn tin cho tin của mình |
| AS-002 | Nền tảng **KHÔNG giữ tiền thuê**; hóa đơn kèm STK + VietQR; chủ tự bấm "Đã thu" |

## 10. Git & PR

- `main` (ổn định), `develop` (tích hợp); nhánh làm việc `feature/…`, `fix/…`, `chore/…` tách từ `develop`. Không commit thẳng `main`/`develop`.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- PR nhỏ, một mục tiêu (≈ 1 task file). Mô tả: thay đổi gì + cách test + DoD nào đã pass.

## 11. Cấm tuyệt đối

- ❌ Hardcode secret / anon key trong code. ❌ `service_role` key ở frontend.
- ❌ Dùng từ "Tenant".
- ❌ `marketplace` ↔ `workspace` import chéo hoặc query chéo table.
- ❌ Sửa `20260702_init.sql`.
- ❌ Policy public SELECT lên `properties` (§3.2).
- ❌ Inline `exists()` trong policy khi caller không đọc được bảng bên trong (§3.1).
- ❌ Nhận `owner_id`/`seller_id`/`status`/`total_amount` từ client trong RPC (§6.1).
- ❌ Mock cứng dữ liệu trong component khi đã có bảng thật.
- ❌ `console.*` ngoài `supabase-error.ts`.
- ❌ Hàm client-callable kiểu `claim_admin` — đó là backdoor sẽ sống sót vào production. Admin đầu tiên tạo bằng SQL snippet thủ công.
- ❌ Tự thêm tính năng ngoài scope task mà không hỏi.

## 12. DoD chung của mọi task

1. `npm run typecheck` exit 0 (và `typecheck:strict` nếu task chạm `src/**/services`).
2. Task có SQL → đã chạy `supabase db push` **và** `npm run db:types`.
3. Không `console.*` mới. Không `[Demo]` alert mới.
4. Đã tự đi qua phần "Cách test" trong file task.
5. Grep xác nhận không còn dấu vết cái mình vừa thay (ví dụ xóa hack thì `grep` phải ra 0 hit).
