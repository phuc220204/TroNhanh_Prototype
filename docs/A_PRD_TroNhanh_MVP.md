# PRD — Trọ Nhanh MVP (bản chạy thật)
> **Product Requirements Document** dùng làm nguồn chân lý cho Agent Code (Claude Code / Codex).
> Đọc kèm: `B_AGENT_RULES.md` (luật code) và `C_BUILD_PLAN.md` (thứ tự thực hiện).
> Nhóm 211 · EXE101 · Cập nhật cho CP3.

---

## 0. Mục tiêu & phạm vi MVP

**Mục tiêu:** biến prototype UI hiện tại thành **sản phẩm chạy thật** — người dùng đăng ký / đăng nhập / đăng tin / tìm kiếm / quản lý phòng thì màn hình phản ánh **đúng dữ liệu họ tạo**, lưu lại thật (không mock cứng trong code). Mục đích là lấy đánh giá thực tế (đưa cô Nhâm dùng thử sau CP3).

**Nguyên tắc phạm vi:** làm đủ để 4 luồng dưới đây chạy end-to-end, **không** làm dư tính năng ngoài scope.

| Luồng MVP (bắt buộc chạy thật) | Ghi chú |
|---|---|
| Auth: đăng ký / đăng nhập / đăng xuất | Supabase Auth |
| Marketplace: All Listing → Search → Chi tiết tin | dữ liệu thật từ DB |
| Đăng tin cho thuê (Seller) + Boost | tin mới hiện ngay sau khi đăng |
| Workspace SaaS: Dashboard → Quản lý khu/phòng → **Ghi điện nước → Hóa đơn VietQR** | luồng trọng tâm CP3 |

**Ngoài scope MVP (để giai đoạn sau):** nhắn tin đầy đủ (chỉ UI), review khu trọ, bản đồ, công cụ thuế, "Phòng của tôi", Admin/Moderator, gia hạn hợp đồng phức tạp. Có thể để màn placeholder.

---

## 1. Quyết định kiến trúc cho MVP

### 1.1 Backend = Supabase (điều chỉnh có chủ đích so với file 04)
Tài liệu Kiến trúc (file 04) đề xuất NestJS + Prisma + Postgres cho production. **Cho MVP vibe-code này, dùng Supabase trực tiếp** để ra sản phẩm chạy thật nhanh nhất:

- **Vì sao Supabase, không phải Firebase/mockapi.io:** dữ liệu Trọ Nhanh là *quan hệ* (Property→Room→Occupancy→Contract→Invoice) → hợp Postgres của Supabase hơn Firestore (NoSQL, join khó); Supabase khớp luôn định hướng Postgres ở file 04. mockapi.io bị loại vì **không có auth thật**.
- Supabase cung cấp sẵn: **Auth** (email/password), **Postgres + RLS** (đúng multi-tenant lọc theo `owner_id`), **Storage** (ảnh tin, scan hợp đồng), **auto REST/JS SDK**.
- **Không dựng backend NestJS riêng ở giai đoạn này.** Frontend gọi Supabase qua `@supabase/supabase-js`. Đây là bước đệm; khi lên production có thể chèn API layer NestJS sau mà không đổi schema.

### 1.2 Stack
- **Frontend:** React + Vite + TypeScript + TailwindCSS (giữ prototype hiện có).
- **Client dữ liệu:** `@supabase/supabase-js`.
- **Routing:** React Router.
- **Auth/session:** Supabase Auth tự quản session (không tự viết JWT).

### 1.3 Ranh giới 2 domain (giữ nguyên nguyên tắc file 06)
Tách code frontend thành **2 shell**, không gọi chéo table domain nhau:
```
src/
  shared/        # supabase client, types, UI components, hooks, auth context
  marketplace/   # shell Public/Renter: landing, search, all-listing, chi tiết, đăng tin
  workspace/     # shell chủ trọ (/chu-tro/*): dashboard, khu/phòng, điện nước, hóa đơn
  routes/
```
Điểm nối hợp lệ duy nhất: "Tạo tin từ phòng trống" (Room → RentalListing, prefill). Room và RentalListing là **2 entity độc lập**.

---

## 2. Thuật ngữ bắt buộc (dùng đúng, không sai lệch)

| Thuật ngữ | Nghĩa | Cấm nhầm |
|---|---|---|
| **Property** | Khu trọ / khu căn hộ (cấp 1 SaaS) | |
| **Room** | Phòng trong Property (cấp 2) | |
| **Occupancy** | Người ở thực tế (bản ghi do Seller tạo), `userId` nullable | KHÔNG phải role |
| **Renter** | Tài khoản người đi thuê | |
| **Seller** | Người đăng tin cho thuê (chủ trọ/được ủy quyền) | |
| **RentalListing** | Tin cho thuê do Seller đăng | |
| **Demand Post** | Tin nhu cầu do Renter đăng (tìm phòng / ở ghép) | |
| ~~Tenant~~ | **CẤM DÙNG** — thay bằng Occupancy hoặc Renter | |

---

## 3. Router Marketplace ↔ SaaS + Gating 4 trạng thái (VẤN ĐỀ 1 — đã chốt)

### 3.1 Chia sidebar Workspace `/chu-tro/*` thành 2 nhóm rõ ràng

| Nhóm | Mục | Trạng thái truy cập |
|---|---|---|
| **Tin đăng (Miễn phí)** | Đăng tin · Quản lý tin đăng · Đẩy tin (Boost) | Luôn mở, **không gating** |
| **Quản lý vận hành (Gói SaaS)** | Khu trọ & Phòng · Người ở · Hợp đồng · Hóa đơn & Điện nước · (Báo cáo) | **Có gating 4 trạng thái** |

Lý do: Marketplace (đăng tin) **miễn phí cho mọi Seller**; SaaS là lớp quản lý **trả phí**. Phải thể hiện rõ để người dùng/giám khảo biết cái nào free, cái nào cần gói.

### 3.2 Gating 4 trạng thái (enum `subscription_status`)

| Trạng thái | Ý nghĩa | UI của nhóm SaaS |
|---|---|---|
| `NONE` | Chưa dùng gói | Nhóm SaaS hiện **icon khóa** + CTA *"Dùng thử miễn phí 1 tháng"* |
| `TRIAL` | Đang dùng thử (mặc định 1 tháng) | Mở full + banner *"Còn X ngày dùng thử"* |
| `ACTIVE` | Đã mua gói | Mở full |
| `READ_ONLY` | Hết hạn | Xem được, nút tạo/sửa/xóa **disabled** + CTA *"Gia hạn để tiếp tục"* (BR-015, không mất dữ liệu) |

### 3.3 Toggle giả lập gói (chỉ cho demo)
Thêm một control (ẩn trong Cài đặt hoặc góc màn) để **giả lập chuyển trạng thái** `NONE → TRIAL → ACTIVE → READ_ONLY`, giúp thuyết trình bấm minh họa cơ chế freemium. Lưu trạng thái vào bảng `user_subscriptions` của Seller (không hardcode).

---

## 4. Luồng Điện nước → Hóa đơn VietQR (VẤN ĐỀ 3 — đã chốt, TRỌNG TÂM CP3)

**Nghiệp vụ end-to-end, 5 bước.** Nền tảng **KHÔNG giữ tiền** — chỉ ghi nhận.

**Bước 0 — Cấu hình một lần** (Cài đặt khu trọ / `properties`):
- Đơn giá điện (`electricity_unit_price`, đ/kWh), đơn giá nước (`water_unit_price`, đ/m³), phí dịch vụ (`service_fee`).
- Thông tin nhận tiền của khu: `bank_name`, `bank_account_number`, `bank_account_name` → nguồn sinh VietQR. Đặt **theo từng khu** để tách dòng tiền/thuế.

**Bước 1 — Ghi chỉ số** (`utility_readings`):
- Form hiển thị **chỉ số kỳ trước** (`previous_reading`) để đối chiếu; nhập **chỉ số kỳ này** (`current_reading`).
- Validate `current_reading ≥ previous_reading` (nếu nhỏ hơn → báo lỗi).
- Tự tính: `tiền điện = (current − previous) × electricity_unit_price` (tương tự nước).
- *Đây là phần cần bổ sung so với form hiện tại (đang thiếu chỉ số cũ + auto-tính).*

**Bước 2 — Tạo hóa đơn** (`invoices` + `invoice_items`):
- Gộp dòng: tiền phòng + điện + nước + dịch vụ → `total_amount` + `due_date`.
- InvoiceItem.type ∈ `Rent | Electricity | Water | Service | Other`.

**Bước 3 — Xuất hóa đơn kèm VietQR:**
- Render hóa đơn (ảnh/PDF) có **STK + mã VietQR của khu**, số tiền điền sẵn vào QR.
- **Kỹ thuật VietQR:** dùng chuẩn VietQR (Napas) sinh QR động từ `bankBIN + accountNumber + amount + addInfo`. Với MVP chỉ cần **render ảnh QR đúng chuẩn hiển thị** (có thể dùng API ảnh của vietqr.io hoặc thư viện tạo QR EMVCo) — **không cần tích hợp ngân hàng thật**.
- Nếu Occupancy có `user_id` (Renter gắn phòng) → hiện hóa đơn in-app + thông báo; nếu không → chủ tự tải file gửi.

**Bước 4 — Ghi nhận thu** (`payments`):
- Người ở quét VietQR chuyển thẳng cho chủ (hoặc tiền mặt) → chủ bấm **"Đã thu"** → tạo Payment (`method: Cash | BankTransfer`) → Invoice `status: Paid`.
- Quá `due_date` chưa thu → `Overdue` + nhắc (job/cron đơn giản, hoặc kiểm khi load).

**UI cần bổ sung cho luồng này:** (a) màn cấu hình đơn giá + thông tin nhận tiền của khu; (b) form ghi điện nước có chỉ số cũ + auto-tính; (c) màn xem trước hóa đơn có VietQR; (d) nút Xuất + Đánh dấu đã thu.

---

## 5. Marketplace — đặc tả các trang

### 5.1 All Listing Page vs Search Page (đã chốt — GIỮ 2 TRANG)
- **All Listing Page** (`/tat-ca-phong`) = trang **cha**: xem *toàn bộ* tin đang hiển thị trên hệ thống + bộ lọc + phân trang. Vào từ nút "Xem tất cả".
- **Search Page** (`/tim-phong`) = trang **kết quả tìm kiếm**: khi user chủ động search bằng keyword/filter từ hero. Hiển thị "Tìm thấy N phòng phù hợp".
- Cả hai đọc chung bảng `rental_listings` (status = Active), khác nhau ở *ngữ cảnh vào* và *bộ lọc mặc định*.

### 5.2 Landing (`/`)
Hero + search box (vị trí, loại phòng, khoảng giá) + "Phòng mới đăng tải" + khối "Người thuê đang tìm phòng" (Demand Posts). Badge "★ Nổi bật" cho tin có `boost_expire_at` còn hiệu lực (boost xếp trước — BR-005).

### 5.3 Chi tiết tin (`/phong/{id}`)
Gallery + bảng chi phí (thuê/điện/nước/dịch vụ/cọc) + tiện ích + khối liên hệ (Nhắn tin / Gọi). Guest thấy SĐT che một phần; đăng nhập mới thấy đủ (BR-014).

### 5.4 Đăng tin cho thuê (`/dang-tin-cho-thue`) — SỬA
Stepper 4 bước: (1) cơ bản → (2) tiện ích & mô tả → (3) ảnh ≥ 3 → (4) chi phí.
- **BỎ trường "Trạng thái phòng" (Còn trống/Sắp trống/Đang sửa) khỏi form đăng tin độc lập** — đó là thuộc tính của Room (SaaS), không phải RentalListing. Chỉ khi "Tạo tin từ phòng" mới có liên kết Room.
- **THÊM Boost:** ở bước 4 (hoặc màn sau submit) có block *"Đẩy tin nổi bật"* với 2–3 gói theo thời hạn (7/15/30 ngày) + giá + nút thanh toán (giả lập).

### 5.5 Quản lý tin đăng (`/tai-khoan/tin-cho-thue`)
Bảng tin: cột "Phòng liên kết" (mã Room nếu tạo từ phòng, "—" nếu độc lập), trạng thái (Đang hiển thị/Chờ duyệt/Đã ẩn/Hết hạn), lượt xem, thao tác. **THÊM nút "Đẩy tin"** ở cột thao tác.

### 5.6 Demand Posts (đã chốt — 1 khối, 2 lựa chọn)
Renter đăng tin nhu cầu là **một luồng** với 2 nút chọn: **"Tìm phòng"** (RoomWantedPost) hoặc **"Tìm người ở ghép"** (RoommateWantedPost). Hiển thị 2 loại card *giống kiểu*, chỉ khác nhãn vai trò. (MVP: có thể chỉ hiển thị + đăng cơ bản.)

---

## 6. Workspace SaaS — đặc tả các trang

### 6.1 Dashboard (`/chu-tro`) — SỬA theo BR-012
- Card "Việc cần xử lý hôm nay" (phòng chưa thanh toán / hợp đồng sắp hết hạn / phòng trống / phòng đang sửa).
- KPI: **"Phòng trống" luôn hiển thị**. **"Tổng phòng" và "Đang thuê" mặc định ẩn**, có toggle bật (BR-012 — thông tin quy mô nhạy cảm, tôn trọng quyền riêng tư chủ trọ).
- Bảng "Tình trạng phòng" (xem nhanh) + "Tin đăng gần đây".

### 6.2 Quản lý khu & phòng (`/chu-tro/quan-ly-phong`)
2 cấp: danh sách khu (Property) bên trái + bảng phòng (Room) của khu đang chọn. Drawer chi tiết phòng: thông tin phòng, người ở hiện tại, hợp đồng, thanh toán tháng, **form ghi điện nước** (mục 4). Trạng thái phòng: `Available | Deposited | Rented | Hidden` (BR-002).

### 6.3 Hóa đơn & Điện nước (`/chu-tro/hoa-don`)
Danh sách hóa đơn theo kỳ, ghi điện nước, xuất hóa đơn VietQR, đánh dấu đã thu (mục 4).

---

## 7. Auth — Trang Đăng nhập / Đăng ký (đặc tả đầy đủ, đang thiếu)

- **Đăng ký** (`/dang-ky`): họ tên, email, mật khẩu (+ SĐT liên hệ). Tạo user qua Supabase Auth → tạo bản ghi `profiles` gắn `user_id`. Mọi tài khoản mặc định là **Renter**.
- **Đăng nhập** (`/dang-nhap`): email + mật khẩu → Supabase Auth session.
- **Đăng xuất:** clear session.
- **Kích hoạt Seller:** khi user đăng RentalListing đầu tiên **hoặc** tạo Property đầu tiên → gán năng lực Seller (vẫn miễn phí). Không cần role riêng — kiểm bằng việc có Property/Listing hay không, hoặc cột `is_seller`.
- *Ghi chú:* file 02 mô tả đăng ký bằng SĐT + OTP cho production. MVP dùng **email + password của Supabase Auth** cho nhanh; OTP/SĐT để sau. Ghi rõ đây là điều chỉnh MVP.

---

## 8. Data model cho Supabase (MVP scope)

> Bảng `snake_case` số nhiều; cột `snake_case`; PK `id uuid default gen_random_uuid()`; mọi bảng có `created_at`, `updated_at`; bảng nghiệp vụ có `deleted_at` (soft delete). Enum khớp file 02.

### 8.1 Bảng cần cho MVP (ưu tiên)

| Bảng | Cột chính | Ghi chú RLS |
|---|---|---|
| `profiles` | `user_id (FK auth.users)`, `full_name`, `contact_phone`, `is_seller` | user chỉ sửa hồ sơ mình |
| `rental_listings` | `seller_id`, `room_id (null)`, `title`, `property_type`, `price`, `district`, `area`, `status`, `boost_expire_at`, `contact_phone` | đọc public (status=Active); ghi bởi owner |
| `listing_amenities` | `listing_id`, `amenity` | — |
| `properties` | `owner_id`, `name`, `address`, `district`, `floor_count`, `bank_name`, `bank_account_number`, `bank_account_name`, `electricity_unit_price`, `water_unit_price`, `service_fee` | **RLS: owner_id = auth.uid()** |
| `rooms` | `property_id`, `owner_id`, `room_code`, `floor`, `area`, `price`, `status` | owner_id isolation; unique(property_id, room_code) |
| `occupancies` | `room_id`, `owner_id`, `user_id (null)`, `full_name`, `phone_number`, `start_date`, `occupant_count`, `is_active` | owner isolation |
| `contracts` | `room_id`, `occupancy_id`, `owner_id`, `start_date`, `end_date`, `rent_price`, `deposit`, `status` | owner isolation |
| `utility_readings` | `room_id`, `owner_id`, `type` (Electricity/Water), `period` (YYYY-MM), `previous_reading`, `current_reading`, `unit_price` | owner isolation; check current ≥ previous |
| `invoices` | `room_id`, `contract_id`, `owner_id`, `period`, `due_date`, `total_amount`, `status` (Unpaid/PartiallyPaid/Paid/Overdue) | owner isolation |
| `invoice_items` | `invoice_id`, `type`, `description`, `quantity`, `unit_price`, `amount` | qua invoice |
| `payments` | `invoice_id (null)`, `user_subscription_id (null)`, `owner_id`, `amount`, `method` (Cash/BankTransfer), `paid_at`, `purpose` (RentInvoice/Boost/Subscription) | owner isolation |
| `subscription_plans` | `name`, `duration_months`, `price`, `renewal_price`, `max_properties`, `max_rooms` | đọc public |
| `user_subscriptions` | `seller_id`, `plan_id`, `start_date`, `expire_date`, `status` (NONE/TRIAL/ACTIVE/READ_ONLY) | seller isolation |
| `demand_posts` | `renter_id`, `kind` (RoomWanted/RoommateWanted), `desired_districts`, `price_min`, `price_max`, `status` | đọc public; ghi owner |

### 8.2 Bảng để sau (V1+), có thể tạo rỗng/placeholder
`conversations`, `messages`, `favorites`, `reports`, `reviews`, `notifications`, `tax_settings`, `tax_declarations`, `media`, `amenities` (catalog), `roles`.

### 8.3 RLS (Row-Level Security) — bắt buộc cho bảng SaaS
Mọi bảng SaaS bật RLS với policy: `owner_id = auth.uid()` cho SELECT/INSERT/UPDATE/DELETE. Đây là cách Supabase thực thi multi-tenant (thay cho `WHERE ownerId` ở service layer của file 04). Bảng Marketplace đọc-public: policy SELECT cho `status = 'Active'`, ghi giới hạn owner.

---

## 9. Danh mục chuẩn hóa (VẤN ĐỀ nhất quán — đã chốt)

Dùng **một** bộ giá trị dùng chung ở mọi trang (tránh lệch giữa Landing/Search/All-Listing):

- **Khoảng giá** (thống nhất): `Dưới 2tr | 2–4tr | 4–6tr | Trên 6tr` (hoặc chốt lại 1 bộ, dùng khắp nơi).
- **Loại hình (property_type):** `Phòng trọ | Căn hộ mini | Căn hộ dịch vụ | Ký túc xá | Nhà nguyên căn`. **"Ở ghép" KHÔNG phải loại phòng cho thuê** → thuộc Demand Post (RoommateWanted), tách khỏi bộ lọc cho thuê.
- **Tiện ích:** Máy lạnh, Wifi, Gác lửng, Chỗ để xe, WC riêng, Giờ giấc tự do, Cho nuôi thú cưng.
- Tagline: dùng **"Tìm trọ nhanh — Quản lý gọn"**, tránh claim "Nền tảng #1" khi chưa launch.

---

## 10. Acceptance Criteria (định nghĩa "xong")

Một tính năng coi là xong khi:
1. Thao tác của user **ghi/đọc dữ liệu thật** từ Supabase (không mock cứng).
2. RLS đúng: Seller A **không** thấy dữ liệu SaaS của Seller B.
3. Business rule liên quan được tôn trọng (vd ghi điện nước validate current ≥ previous; dashboard ẩn tổng phòng mặc định; boost xếp trước).
4. Không hardcode secret (Supabase URL/anon key qua `.env`).
5. Không lỗi console; tên biến/hàm theo convention (mục Rules).

---

## 11. Màn placeholder (chưa làm — để ô chờ)
Những màn ngoài scope MVP để **placeholder ghi rõ**, thay sau: `[Nhắn tin — UI only]`, `[Review khu trọ — V1]`, `[Bản đồ — V1]`, `[Công cụ thuế — V1]`, `[Phòng của tôi — V1]`, `[Admin — sau]`.
