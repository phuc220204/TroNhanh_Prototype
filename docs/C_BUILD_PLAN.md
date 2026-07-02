# BUILD PLAN — Trọ Nhanh MVP
> Lộ trình chia bước nhỏ để giao Agent Code làm **tuần tự**. Mỗi bước có mục tiêu + "Định nghĩa hoàn thành" (DoD).
> Đọc kèm: `A_PRD_TroNhanh_MVP.md` + `B_AGENT_RULES.md`.
> Cách dùng: đưa Agent **từng bước một**, xong DoD rồi mới sang bước sau. Không nhảy bước.

---

## Giai đoạn 0 — Nền tảng (setup)

### Bước 0.1 — Khởi tạo dự án Supabase
- Tạo project Supabase; lấy `Project URL` + `anon key`.
- Bật Auth (email/password).
- **DoD:** đăng nhập được Supabase dashboard; có URL + anon key.

### Bước 0.2 — Kết nối frontend ↔ Supabase
- Tạo `.env` (từ `.env.example`) với `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Tạo `src/shared/config.ts` (validate env) và `src/shared/supabaseClient.ts`.
- **DoD:** app gọi được `supabase.auth.getSession()` không lỗi; `.env` KHÔNG bị commit (có trong `.gitignore`); `.env.example` đã commit.

### Bước 0.3 — Cấu trúc thư mục 2 shell
- Tạo `src/shared/`, `src/marketplace/`, `src/workspace/`, `src/routes/`.
- Di chuyển các trang prototype hiện có vào đúng shell.
- **DoD:** app build & chạy; routing phân tách rõ marketplace (`/`) vs workspace (`/chu-tro/*`).

---

## Giai đoạn 1 — Database schema + RLS

### Bước 1.1 — Tạo bảng MVP (mục 8.1 PRD)
- Viết SQL migration tạo: `profiles`, `rental_listings`, `listing_amenities`, `properties`, `rooms`, `occupancies`, `contracts`, `utility_readings`, `invoices`, `invoice_items`, `payments`, `subscription_plans`, `user_subscriptions`, `demand_posts`.
- Mọi bảng: `id uuid`, `created_at`, `updated_at`; bảng nghiệp vụ thêm `deleted_at`.
- **DoD:** chạy migration thành công; xem được bảng trong Supabase Table Editor.

### Bước 1.2 — Bật RLS + policy
- Bảng SaaS (`properties`, `rooms`, `occupancies`, `contracts`, `utility_readings`, `invoices`, `payments`, `user_subscriptions`): policy `owner_id = auth.uid()` cho mọi thao tác.
- Bảng Marketplace (`rental_listings`, `demand_posts`): SELECT public khi `status='Active'`; INSERT/UPDATE/DELETE giới hạn owner.
- **DoD:** test bằng 2 tài khoản — Seller A không đọc được `properties` của Seller B.

### Bước 1.3 — Seed dữ liệu mẫu
- Seed `subscription_plans` (gói 600k/3 năm + gia hạn), vài `rental_listings` Active, 1 Seller demo với 1 Property + vài Room.
- **DoD:** trang chủ hiển thị tin thật từ DB (không mock cứng).

---

## Giai đoạn 2 — Auth (trang đang thiếu)

### Bước 2.1 — Đăng ký / Đăng nhập / Đăng xuất
- Trang `/dang-ky`, `/dang-nhap`; dùng Supabase Auth (email + password).
- Sau đăng ký → tạo bản ghi `profiles` (full_name, contact_phone, `is_seller=false`).
- `AuthContext` ở `src/shared/` giữ user hiện tại; route bảo vệ cho `/chu-tro/*`.
- **DoD:** đăng ký → tự đăng nhập; refresh trang vẫn giữ session; đăng xuất về trang chủ.

### Bước 2.2 — Kích hoạt Seller
- Khi user tạo Property đầu tiên hoặc đăng RentalListing đầu tiên → set `profiles.is_seller = true`.
- **DoD:** user thường vào `/chu-tro` thấy trạng thái "chưa là Seller"/CTA; sau khi tạo tin/khu thì vào được Workspace.

---

## Giai đoạn 3 — Marketplace chạy thật

### Bước 3.1 — All Listing Page (`/tat-ca-phong`)
- Đọc toàn bộ `rental_listings` Active + bộ lọc (giá/khu vực/loại/diện tích/tiện ích) + phân trang. Boost xếp trước (BR-005).
- **DoD:** lọc thay đổi → kết quả từ DB đổi đúng; tin boost lên đầu.

### Bước 3.2 — Search Page (`/tim-phong`)
- Nhận keyword/filter từ hero → hiển thị "Tìm thấy N phòng phù hợp". Dùng chung nguồn `rental_listings`, khác ngữ cảnh vào (xem PRD 5.1).
- **DoD:** search từ landing ra kết quả đúng; phân biệt rõ với All Listing.

### Bước 3.3 — Chi tiết tin (`/phong/{id}`)
- Gallery + bảng chi phí + tiện ích + khối liên hệ. Guest thấy SĐT che một phần (BR-014).
- **DoD:** mở tin thật; guest vs đăng nhập thấy SĐT khác nhau.

### Bước 3.4 — Đăng tin cho thuê + Boost (SỬA)
- Stepper 4 bước; **BỎ trường "Trạng thái phòng"** khỏi form độc lập (PRD 5.4).
- Upload ảnh lên Supabase Storage. Submit → tạo `rental_listings` (status Active cho MVP hoặc PendingApproval).
- **THÊM block Boost** (7/15/30 ngày) + thanh toán giả lập → set `boost_expire_at`.
- **DoD:** đăng tin xong → tin hiện ngay ở All Listing; bấm boost → tin lên đầu + có badge "Nổi bật".

### Bước 3.5 — Quản lý tin đăng + nút Đẩy tin
- Bảng tin của Seller; cột "Phòng liên kết"; nút "Đẩy tin".
- **DoD:** Seller thấy đúng tin của mình; đẩy tin cập nhật `boost_expire_at`.

### Bước 3.6 — Demand Posts (1 khối, 2 lựa chọn)
- Khối "Người thuê đang tìm phòng" trên landing đọc `demand_posts`. Form đăng có 2 nút: "Tìm phòng" / "Tìm người ở ghép".
- **DoD:** đăng demand post → hiện ở khối tương ứng.

---

## Giai đoạn 4 — Workspace SaaS + Gating

### Bước 4.1 — Sidebar 2 nhóm + Gating 4 trạng thái (VẤN ĐỀ 1)
- Sidebar chia "Tin đăng (Miễn phí)" / "Quản lý vận hành (Gói SaaS)".
- Đọc `user_subscriptions.status` → render gating: NONE (khóa + CTA dùng thử) / TRIAL (banner còn X ngày) / ACTIVE (full) / READ_ONLY (disable nút ghi + CTA gia hạn).
- **Toggle giả lập gói** để demo chuyển trạng thái (ghi vào `user_subscriptions`).
- **DoD:** bấm toggle → UI nhóm SaaS đổi đúng theo 4 trạng thái; READ_ONLY khóa nút tạo/sửa nhưng vẫn xem được.

### Bước 4.2 — Dashboard (SỬA theo BR-012)
- Card "Việc cần xử lý"; KPI "Phòng trống" luôn hiện; "Tổng phòng"/"Đang thuê" **mặc định ẩn** + toggle; bảng tình trạng phòng.
- **DoD:** số liệu tính từ DB thật; tổng phòng ẩn mặc định, bật được.

### Bước 4.3 — Quản lý khu & phòng
- CRUD `properties` (kèm cấu hình đơn giá + thông tin nhận tiền VietQR) và `rooms` (status BR-002). Drawer chi tiết phòng.
- **DoD:** tạo khu/phòng thật; đổi trạng thái phòng lưu vào DB; RLS đúng.

### Bước 4.4 — Occupancy + Contract (cơ bản)
- Thêm người ở (Occupancy, `user_id` nullable — fallback tên+SĐT); tạo Contract → Room chuyển Rented (dùng RPC transaction).
- **DoD:** gán người ở + tạo hợp đồng → Room status đổi đúng, atomic.

---

## Giai đoạn 5 — Điện nước → Hóa đơn VietQR (TRỌNG TÂM CP3)

### Bước 5.1 — Cấu hình khu (Bước 0 của luồng)
- Form đơn giá điện/nước/dịch vụ + thông tin nhận tiền (bank, STK, tên chủ TK) trong Cài đặt khu.
- **DoD:** lưu vào `properties`; hiển thị lại đúng.

### Bước 5.2 — Ghi chỉ số điện nước (auto-tính)
- Form hiện **chỉ số kỳ trước**; nhập kỳ này; validate `current ≥ previous`; auto-tính tiền = (current−previous)×unit_price.
- **DoD:** nhập sai (current < previous) → báo lỗi; nhập đúng → ra số tiền chính xác, lưu `utility_readings`.

### Bước 5.3 — Tạo hóa đơn kỳ
- Gộp tiền phòng + điện + nước + dịch vụ → `invoices` + `invoice_items` (RPC transaction). Tính `total_amount`, `due_date`.
- **DoD:** hóa đơn tạo ra có tổng = Σ items; hiển thị trong danh sách hóa đơn.

### Bước 5.4 — Xuất hóa đơn kèm VietQR
- Render hóa đơn (ảnh/PDF) có STK + **mã VietQR** (amount điền sẵn) của khu. Dùng vietqr.io/thư viện QR EMVCo — **không tích hợp ngân hàng thật**.
- **DoD:** hóa đơn hiển thị QR đúng chuẩn quét được bằng app ngân hàng (số tiền + STK đúng).

### Bước 5.5 — Ghi nhận thu
- Nút "Đã thu" → tạo `payments` (Cash/BankTransfer) → Invoice `status=Paid` (RPC). Quá hạn → Overdue.
- **DoD:** bấm "Đã thu" → trạng thái hóa đơn đổi + dashboard cập nhật; nền tảng không giữ tiền (chỉ ghi nhận).

---

## Giai đoạn 6 — Hoàn thiện & demo

### Bước 6.1 — Màn placeholder + banner DEMO
- Đặt placeholder rõ cho màn ngoài scope (nhắn tin, review, bản đồ, thuế, Phòng của tôi, Admin). Banner "DEMO" ở nơi còn mock.
- **DoD:** không có màn "chết"; người xem hiểu cái gì đã xong, cái gì đang chờ.

### Bước 6.2 — Chuẩn hóa danh mục + rà nhất quán
- Áp 1 bộ khoảng giá / loại hình / tiện ích chung (PRD mục 9). Tách "Ở ghép" khỏi bộ lọc cho thuê. Đổi tagline khỏi "Nền tảng #1".
- **DoD:** 3 trang (Landing/Search/All-Listing) dùng cùng bộ giá trị; không còn số/nhãn lệch nhau.

### Bước 6.3 — Rà Acceptance Criteria + quay video demo
- Đi qua checklist mục 10 PRD. Kiểm RLS 2 tài khoản. Kiểm không hardcode secret, không console.log.
- Quay video demo 30–60s cho luồng lõi (đặc biệt điện nước → VietQR).
- **DoD:** tất cả AC pass; video demo mượt sẵn sàng nộp/thuyết trình.

---

## Bảng phụ thuộc (làm đúng thứ tự)
```
GĐ0 setup → GĐ1 schema+RLS → GĐ2 auth → GĐ3 marketplace ─┐
                                     └→ GĐ4 workspace+gating → GĐ5 điện nước/VietQR → GĐ6 hoàn thiện
```
- GĐ3 và GĐ4 có thể chạy song song **sau khi** GĐ2 xong.
- GĐ5 phụ thuộc GĐ4 (cần Property/Room/Contract trước).

## Gợi ý giao việc cho Agent
- Mỗi lần chỉ đưa Agent **1 bước** + trích phần PRD liên quan + nhắc `B_AGENT_RULES.md`.
- Sau mỗi bước: yêu cầu Agent tự kiểm DoD trước khi báo xong.
- Ưu tiên đường: **GĐ0 → GĐ1 → GĐ2 → GĐ5-relevant** nếu cần demo luồng VietQR gấp cho CP4.
