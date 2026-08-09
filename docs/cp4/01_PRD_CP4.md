# PRD — Trọ Nhanh CP4

> **Kế thừa `docs/A_PRD_TroNhanh_MVP.md`** (vẫn hiệu lực). File này chỉ mô tả phần **mở rộng CP4**.
> Khi mâu thuẫn: file này thắng A_PRD; `docs/02_Technical_...v2.md` là nguồn enum/BR.

---

## 0. Mục tiêu CP4

**Mục tiêu:** prototype phải chạy **trơn tru như một dự án thương mại thật** và **test được end-to-end** 5 luồng dưới đây. Không phải "có màn hình", mà là: người dùng thao tác → dữ liệu thật ghi/đọc từ Supabase → màn hình phản ánh đúng cái họ vừa tạo → tài khoản khác không thấy dữ liệu riêng tư của họ.

**Khác biệt so với CP3:** CP3 hỏi "luồng lõi có chạy thật không?". CP4 hỏi **"có ai bấm vào chỗ nào mà gặp đường cùng không?"** — mọi CTA phải dẫn tới một hành động thật, không phải `alert("[Demo]")`.

### 0.1 Năm luồng bắt buộc test được

| # | Luồng | Trạng thái đầu CP4 | Task |
|---|---|---|---|
| 1 | **Đăng tin cho thuê** (Seller) | ✅ chạy, ❌ không upload ảnh thật | T19, T20 |
| 2 | **Đăng tin tìm phòng** (Renter · DemandPost RoomWanted) | ❌ không có form, bảng thiếu 15 cột, card hardcode | T14, T22 |
| 3 | **Đăng tin ở ghép** (Renter · DemandPost RoommateWanted) | ❌ cùng vấn đề | T14, T22 |
| 4 | **Review tin đăng liên quan tới chủ trọ** — 3 nghĩa, làm cả 3 | ❌ chưa có gì | T16, T21, T23, T26 |
| 4a | · Đánh giá (rating) chủ trọ / khu trọ + chủ trọ phản hồi | ❌ chỉ có empty state "Chưa có đánh giá" | T26 |
| 4b | · Kiểm duyệt tin đăng (Moderator approve/reject) | ❌ không có bảng role, không có route admin | T21 |
| 4c | · Chủ trọ duyệt/phản hồi tin nhu cầu (match với phòng trống) | ❌ chưa có | T23 |
| 5 | **Quản lý khu & nhà trọ** | ⚠️ 3 lệnh ghi vi phạm CHECK; không thêm được người ở | T01, T24, T27 |

### 0.2 Bốn extras — phải LÀM THẬT, không stub
Lý do: 4 thứ này là nơi 5 luồng trên hiện đang **đi vào đường cùng**.

| Extra | Vì sao bắt buộc | Task |
|---|---|---|
| **Upload ảnh thật (Supabase Storage)** | 0 lời gọi `storage.` trong repo; ảnh tin là URL Unsplash băm từ UUID → luồng 1 không thể test thật | T13, T19 |
| **Nhắn tin in-app tối giản** | Nút "Nhắn tin" có ở chi tiết tin **và** card demand post nhưng chỉ trả lời canned → luồng 2/3/4c cụt | T15, T25 |
| **Sửa tin đăng** | Hiện là `alert("[Demo]")` — sản phẩm thương mại phải sửa được tin đã đăng | T20 |
| **Occupancy + Hợp đồng** | Chỉ đọc, không tạo được → không có người ở ⇒ không có hợp đồng ⇒ luồng điện nước/hóa đơn chỉ chạy trên data seeder, và **review verified-only bất khả thi** | T24 |

### 0.3 Nền kỹ thuật — Phase 0 làm TRƯỚC feature
Không phải "dọn dẹp cho đẹp". Cụ thể:
- **Không có `tsconfig.json`, `typescript` chưa cài** → ~11k dòng `.tsx` chưa từng được type-check. Chính 3 bug enum bên dưới là loại lỗi mà `Database` generic bắt được ở compile-time.
- **Supabase CLI chưa init** (`supabase/` không có `config.toml`) → CP4 thêm ~9 migration; paste tay đúng thứ tự vào DB có data thật là rủi ro lớn nhất của cả checkpoint.
- **57 file shadcn + ~30 dependency chết** → grep `components/ui`, `cn(`, `clsx`, `tailwind-merge`, `class-variance-authority` ngoài folder đó = **0 hit**. Phải xóa trước khi bật tsc, nếu không tsc phải check 57 file chưa từng được check.

### 0.4 Ngoài scope CP4 (giữ placeholder ghi rõ version)
Bản đồ (`[Bản đồ — V1]`), công cụ thuế (`[Công cụ thuế — V1]`), báo cáo nâng cao, gia hạn hợp đồng phức tạp, mobile app, thanh toán thật (mọi thanh toán trong CP4 **phải ghi "(giả lập)"** — AS-002: nền tảng không giữ tiền).

---

## 1. Ba bug đang hỏng demo cho mọi user (T01)

Đây không phải "nice to fix" — mỗi cái làm một luồng lỗi ngay lần bấm đầu.

| # | Lỗi | Ở đâu | Hậu quả | Sửa |
|---|---|---|---|---|
| 1 | Query `profiles` bằng `.eq("id", user.id)` | `DangTinPage.tsx:559`, `:750` | `profiles.id` là `gen_random_uuid()` độc lập, auth id nằm ở `profiles.user_id` → **kích hoạt Seller không chạy** (C_BUILD_PLAN bước 2.2 thực chất chưa hoạt động), prefill tên liên hệ im lặng fail | `.eq("user_id", user.id)` |
| 2 | Ghi `status = "Inactive"` | `QuanLyPage.tsx:307` | CHECK chỉ cho `Active/PendingApproval/Hidden/Expired` → **nút ẩn tin lỗi cho mọi user** | `'Hidden'` |
| 3 | Ghi `status = "Repairing"` | `QuanLyPhongPage.tsx:374` (option), `:1931` (write), `:840/923/1051` (branch) | CHECK `rooms.status` chỉ cho 4 giá trị, `RoomStatus` không có member này → **UI chết, write fail** | Bỏ "Đang sửa" khỏi UI, dùng `Hidden` |

**Quyết định enum:** không nới CHECK cho `Inactive`/`Repairing`. `Inactive` là typo không phải state. `Repairing` là 1 nhãn UI không có nghiệp vụ đằng sau — nới enum để phục vụ nó thì phải sửa `types/status.ts`, `ROOM_STATUS_META`, dashboard, và CHECK. Đổi nhãn card dashboard thành **"Phòng đang ẩn / bảo trì"** đọc từ `status='Hidden'`.

Kèm trong T01: `ProtectedRoute.tsx:22` có CSS property vô nghĩa `justifyinit`; `config.ts` throw ở module load → màn hình trắng khi thiếu `.env`, phải fail-soft.

---

## 2. Luồng 1 — Đăng tin cho thuê (mở rộng)

Giữ stepper 4 bước hiện có. Bổ sung:

### 2.1 Upload ảnh thật (T19)
- Bước 3 upload lên bucket `listing-images`, path `{seller_id}/{listing_id}/{uuid}.webp`.
- Client resize trước khi upload: canvas → `toBlob('image/webp', 0.82)`, cạnh dài max 1600px. Không cần edge function.
- Ghi row `listing_media` (`storage_path`, `sort_order`, width/height/size/mime). **Lưu `storage_path`, KHÔNG lưu URL** — derive bằng `getPublicUrl()` lúc render, để đổi bucket/CDN không thành migration dữ liệu.
- Add / remove / **reorder** ảnh.
- Ràng buộc "≥3 ảnh" đặt ở **form (Yup)** thôi — không đặt trong RPC, vì seeder và row cũ sẽ vỡ.
- Row cũ không có media → fallback ảnh Unsplash deterministic (giữ `getListingImage` làm fallback, không phải nguồn chính).
- Bỏ `URL.createObjectURL` ở `DangTinPage.tsx:1369` (blob URL chết sau reload).

### 2.2 Chuyển metadata khỏi `description` (T06)
Hiện `listingMetadata.ts` **JSON-serialize chi phí / giờ giấc / địa điểm gần / lat-lng rồi nhét vào cột `description`** sau marker `---METADATA---`, đọc ra thì parse lại. Hệ quả: không filter được theo chi phí, và blob JSON nằm trong đúng cột sắp được trigram-index.

→ Promote thành cột thật: `electricity_price`, `water_price`, `water_unit`, `service_price`, `deposit`, `access_policy`, `access_open_time`, `access_close_time`, `latitude`, `longitude`. `metadata jsonb` **chỉ giữ `nearby`** (thật sự phi cấu trúc, không bao giờ filter).

### 2.3 Sửa tin đăng (T20)
Route `/dang-tin-cho-thue/:id`, dùng lại stepper ở edit mode. Thay 2 `alert("[Demo]")` ở `QuanLyPage.tsx:745,826`.
**BR-003:** sửa field quan trọng (title/price/address/district/area/property_type/description) của tin đang `Active` **khi kiểm duyệt thủ công đang bật** → về `PendingApproval`, UI phải giải thích rõ "tin của bạn cần duyệt lại".

### 2.4 Boost — giữ nguyên, chỉ sửa nhãn
Gói 7/15/30 ngày, giá lấy từ `platform_settings.boost_config`. Nút thanh toán **phải ghi "(giả lập)"**.

---

## 3. Luồng 2 & 3 — Đăng tin tìm phòng / ở ghép (T14, T22)

### 3.1 Vấn đề hiện tại: card đang giả vờ có dữ liệu
`demand_posts` chỉ có 6 cột (`renter_id`, `kind`, `desired_districts`, `price_min`, `price_max`, `status`). Nhưng `DemandPostCard` (`HomePage.tsx:250`) render `name`, `initials`, `title`, `roomType`, `moveIn`, `amenities`, `needed`, `requirements` — và mapper ở `HomePage.tsx:1184-1207` **hardcode toàn bộ**:

```
initials: "ND"                                    name: "Khách tìm trọ"
title: `Tìm phòng tại ${districts.join(", ")}`     roomType: "Phòng trọ / Căn hộ"
moveIn: "Dọn vào trong tháng"                      amenities: ["Wifi","WC riêng","Tự do"]
needed: "Cần 1 người"                              requirements: ["Sạch sẽ","Gọn gàng","Vui vẻ"]
```

Và `selectRenterPostType` (`HomePage.tsx:1223`) mở modal `[Demand Posts — đang phát triển]` thay vì form.

> **Điều kiện fail của luồng 2/3:** nếu sau T22 card vẫn hiện `"Khách tìm trọ"` / `"ND"` / `"Cần 1 người"` / `"Sạch sẽ, Gọn gàng, Vui vẻ"` → task chưa xong. Đó chính là các giá trị phải bị xóa.

### 3.2 Một luồng, 2 lựa chọn (đúng A_PRD §5.6)
`/dang-tin-nhu-cau` có 2 nút: **"Tìm phòng"** (`?kind=tim-phong` → RoomWanted) hoặc **"Tìm người ở ghép"** (`?kind=o-ghep` → RoommateWanted). Cùng một trang, form đổi shape theo `kind`.

### 3.3 Field theo `kind`

**Chung:** `title` (bắt buộc), `description`, `desired_districts[]`, `price_min`, `price_max`, `contact_name`, `contact_phone`, `status`.

**RoomWanted:** `property_type` (từ `catalog.ts PROPERTY_TYPES`), `min_area`, `desired_amenities[]` (từ `AMENITIES`), `move_in_date`, `occupant_count`.

**RoommateWanted:** `current_address`, `district`, `share_price`, `needed_count` (bắt buộc), `gender_requirement` (`Any|Male|Female`), `requirements[]`.

`name`/`initials` trên card lấy từ **join `profiles` theo `renter_id`**, không hardcode.

### 3.4 Trang liên quan
- `/tin-nhu-cau` — danh sách, filter theo `kind` + khu vực + khoảng giá.
- `/tin-nhu-cau/:id` — chi tiết, có CTA "Nhắn tin".
- `/tai-khoan/tin-nhu-cau` — tin của tôi: Sửa / Ẩn / Xóa.
- Khối trên landing đọc dữ liệu thật, giữ 2 tab như hiện tại.

### 3.5 Nhắc lại A_PRD §9
**"Ở ghép" KHÔNG phải một `property_type`** → không được xuất hiện trong bộ lọc loại hình ở `/tat-ca-phong` hay `/tim-phong`. Nó thuộc `DemandPost.kind = RoommateWanted`.

---

## 4. Luồng 4 — "Review tin đăng liên quan tới chủ trọ" (cả 3 nghĩa)

### 4a. Đánh giá (rating) khu trọ / chủ trọ + phản hồi (T16, T26)

**Verified-only** — đây là điểm bán hàng trong pitch deck ("review khu trọ xác thực"), và cũng là pain point của persona Minh Nhật ("đánh giá từ người ở cũ"). Điều kiện (BR-022, BR-030), enforce trong `can_review_contract()`:
1. Có `occupancies` với `user_id = tôi` **và** `link_status = 'Confirmed'` (BR-029 — không tự động Confirmed);
2. Hợp đồng đã **≥30 ngày** *hoặc* đã có **≥1 payment**;
3. Tôi **không phải** chủ khu đó (BR-030).

Ràng buộc khác: `unique(contract_id)` = **1 review / 1 đợt ở** (BR-023); sửa được trong **7 ngày**; rating 1–5; nội dung ≤1000 ký tự.

**Hiển thị (BR-024):** review chỉ public khi khu bật `is_public_profile_enabled`. Trang công khai `/khu-tro/:slug`. Badge rating trên card tin đăng **chỉ khi** tin có `property_id` **và** khu đã bật public profile.

**Chủ trọ phản hồi:** `/chu-tro/danh-gia` — xem review của khu mình + trả lời (`seller_reply`, ≤1000 ký tự, 0..1 lần).

**Kiểm duyệt review:** `/quan-tri/kiem-duyet-danh-gia` — ẩn review bị báo cáo.

**Thay thế:** empty state "Chưa có đánh giá" ở `/phong/:id`.

**UX bắt buộc:** người chưa đủ điều kiện **không thấy form**, thấy thông báo rõ "chưa đủ điều kiện đánh giá" + lý do. Không bao giờ show form rồi báo lỗi sau khi submit.

> ⚠️ Điều kiện này khiến review **không demo được** trên DB sạch. Xử lý bằng RPC `demo_link_me_to_seeded_occupancy()` + 1 nút trong `DemoFAB` — xem `07_RISKS.md` #2. **Không giải bằng cách nới `can_review_contract`**: cổng 30 ngày *là* toàn bộ giá trị chống gian lận, và giám khảo rất có thể hỏi đúng chỗ đó.

### 4b. Kiểm duyệt tin đăng (T21)

**Vòng đời (BR-001):** `Draft → PendingApproval → Active | Rejected`, cộng `Hidden`, `Expired`, `Rented`.

- Moderator: `/quan-tri/kiem-duyet-tin` — queue filter theo status, Approve / Reject.
- **Reject bắt buộc có lý do** (FR-064). Reject không lý do → chặn ở RPC.
- Approve → `approved_at = now()`, `expire_at = now() + 60 ngày` (BR-026).
- **Mọi transition ghi 1 row `moderation_logs`.** Cơ chế cưỡng chế: moderator **không có policy UPDATE** trên `rental_listings` — mọi thay đổi phải qua RPC `moderate_listing()`, nên audit trail không thể bị bỏ sót.
- Seller thấy badge `Chờ duyệt` / `Bị từ chối` + lý do + nút **"Sửa & gửi lại"** ở `/tai-khoan/tin-cho-thue`.

**Chế độ kiểm duyệt — quyết định quan trọng:** `platform_settings.auto_approve_listings`, **mặc định `true`**.
- `true` → tin vào `Active` ngay, **nhưng vẫn ghi `moderation_logs`** với `moderator_id = null, reason = 'auto (demo)'` để audit trail đầy đủ và queue UI có data hiển thị.
- `false` → tin vào `PendingApproval`.
- Admin bật/tắt ở `/quan-tri/cai-dat`, nhãn **"Chế độ kiểm duyệt: Tự động / Thủ công"**.
- Người thuyết trình bật "Thủ công" 60 giây để demo queue rồi tắt lại.

Lý do mặc định `true`: giám khảo đăng tin rồi không thấy gì hiện = app lỗi. Nhưng bỏ kiểm duyệt = mất luồng 4b. Xem `07_RISKS.md` #1. **Luôn hiện badge trạng thái cho Seller** ở cả 2 chế độ, để vòng đời vẫn nhìn thấy được.

**Role:** bảng `user_roles` riêng (`Renter/Seller/Admin/Moderator`), **không** dùng `profiles.role` — `profiles` đã có policy `for update using (auth.uid() = user_id)`, một cột `role` ở đó cho phép bất kỳ ai tự nâng mình thành Admin bằng 1 PATCH. Đây là lỗ privilege-escalation, không phải chuyện style.

### 4c. Chủ trọ duyệt / phản hồi tin nhu cầu (T23)

`/chu-tro/tim-nguoi-thue` — chiều ngược của luồng demand post.
- Danh sách `demand_posts` Active, **xếp hạng theo độ khớp** với phòng trống của chính Seller (khu vực + khoảng giá + diện tích).
- Nguồn phòng trống: `shared/services/vacancy-service.ts` → `getMyVacantRoomSummaries()`. Đây là **điểm nối duy nhất được phép** giữa 2 domain, chỉ trả `{roomId, district, price, area, propertyName}` — không có dữ liệu vận hành.
- Filter theo khu vực / kind / khoảng giá. CTA **"Nhắn tin"** → mở conversation với Renter.

---

## 5. Luồng 5 — Quản lý khu & nhà trọ (T24, T27)

### 5.1 Occupancy + Hợp đồng (T24) — phần đang thiếu hoàn toàn
`OccupantsView` (`QuanLyPhongPage.tsx:1705`) hiện **chỉ đọc**. Không thêm được người ở, không tạo được hợp đồng, không có transition phòng → `Rented`. Row `occupancies`/`contracts` chỉ tồn tại qua seeder.

Một RPC atomic (`create_occupancy_with_contract`):
```
tạo occupancies → tạo contracts → rooms.status = 'Rented' → (BR-027) tin đăng liên kết → 'Rented'
```
- `occupancies.user_id` nullable — fallback tên + SĐT khi người ở không có tài khoản.
- Gắn tài khoản Renter → `link_status = 'Pending'`, **không bao giờ tự động `Confirmed`** (BR-029). Đó là cổng chống review gian lận.
- **BR-006:** chặn hợp đồng Active thứ 2 chồng thời gian trên cùng phòng, báo lỗi tiếng Việt.

### 5.2 Cấu hình khu (T27)
Form đàng hoàng cho: `bank_name`, `bank_account_number`, `bank_account_name`, `electricity_unit_price`, `water_unit_price`, `service_fee`. Đây là nguồn sinh VietQR, đặt **theo từng khu** để tách dòng tiền/thuế.

### 5.3 Siết READ_ONLY (BR-015)
Audit toàn bộ nút ghi trong zone SaaS qua `useCanWrite()` — một chỗ, không check per-button. READ_ONLY = xem được, nút tạo/sửa/xóa disabled + CTA "Gia hạn để tiếp tục", **không mất dữ liệu**.

### 5.4 Giữ nguyên (đã chạy đúng)
Ghi điện nước có chỉ số kỳ trước + validate `current ≥ previous`; hóa đơn + invoice_items; VietQR; "Đã thu". CP4 chỉ chuyển các write này sang RPC (T11c) để atomic và để `previous_reading`/`unit_price`/`total_amount` **derive server-side** thay vì nhận từ client.

---

## 6. Extra — Nhắn tin (T15, T25)

Tối giản nhưng **thật**: `conversations` + `messages`, 1-1, Realtime.
- `/tin-nhan` (inbox) + `/tin-nhan/:conversationId` (thread). **Một inbox duy nhất** ở `shared/pages/` — Seller và Renter là *cùng một account* (role additive), hai inbox sẽ xé một thread thành 2 URL.
- Vào từ: `/phong/:id` (thay canned auto-reply ở `RoomDetailPage.tsx:746`), card demand post, `/chu-tro/tim-nguoi-thue`.
- Badge unread trên navbar.
- **BR-019:** 1 conversation / (initiator, ref) — mở lại tin cũ thì dùng lại thread. **BR-030:** không tự nhắn tin cho tin của mình.
- `poster_id` **derive server-side** trong `start_conversation()` — nhận từ client sẽ cho phép mở thread "từ" người khác.
- Realtime + fallback `refetchInterval` 15s sau cờ `USE_REALTIME_MESSAGING` (mạng hội trường có thể chặn websocket).

---

## 7. Acceptance Criteria CP4

Kế thừa A_PRD §10, bổ sung. Một tính năng xong khi:

1. **Ghi/đọc dữ liệu thật** từ Supabase. **DB rỗng → `EmptyState`, KHÔNG fallback mock.** (Hiện có 4 chỗ vi phạm: `HomePage.tsx:1219-1221`, `QuanLyPhongPage.tsx:1898`, `ChuTroDashboardPage.tsx:643,653`.)
2. **RLS đúng:** Seller A không thấy dữ liệu SaaS của Seller B. Verify bằng `supabase/tests/rls.sql`, không phải bằng đi click.
3. **Business rule liên quan được tôn trọng** (bảng BR ở `/CLAUDE.md` §9).
4. **Không hardcode secret**; anon key qua `.env`.
5. **Không `console.*`** ngoài `supabase-error.ts`. **Không `alert("[Demo]")`.** Tên biến/hàm theo convention.
6. `npm run typecheck` exit 0. Task có SQL → đã `db push` + `db:types`.
7. **Mọi thao tác đa bảng đi qua RPC** — kill network giữa lúc ghi không để lại trạng thái lệch.
8. **Không có CTA đường cùng.** Việc chưa làm thì ghi rõ version (`[Bản đồ — V1]`), không phải `alert`.
9. **Thanh toán giả lập phải ghi "(giả lập)"** (AS-002).
10. Element mà E2E spec chạm vào **có `data-testid`** — codebase zero `className`, testid là selector ổn định duy nhất.

---

## 8. Danh mục chuẩn hóa (nhắc lại A_PRD §9 — vẫn hiệu lực)

Dùng **một** bộ giá trị từ `src/shared/constants/catalog.ts` ở mọi trang, kể cả các trang mới:
- **Khoảng giá:** `Dưới 2tr | 2–4tr | 4–6tr | Trên 6tr`
- **Loại hình:** `Phòng trọ | Căn hộ mini | Căn hộ dịch vụ | Ký túc xá | Nhà nguyên căn` — **"Ở ghép" không nằm ở đây**
- **Tiện ích:** Máy lạnh, Wifi, Gác lửng, Chỗ để xe, WC riêng, Giờ giấc tự do, Cho nuôi thú cưng
- **Tagline:** "Tìm trọ nhanh — Quản lý gọn"

Label khoảng giá/diện tích được parse thành số bằng `shared/utils/catalog-bounds.ts` để **cả 3 trang danh sách đồng ý với nhau** thay vì mỗi trang tự parse.
