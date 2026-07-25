# QA Checklist — CP4

---

## 0. Chuẩn bị (2 việc làm tay, không có trong task nào)

### 0.1 TẮT email confirmation
Supabase Dashboard → **Authentication → Providers → Email** → tắt *"Confirm email"*.
Không làm thì **mọi account demo fail ở bước register → login**.

### 0.2 Apply migration bằng CLI, KHÔNG paste tay
```bash
npx supabase init
npx supabase link --project-ref <ref lấy từ VITE_SUPABASE_URL>
npx supabase db push
pnpm db:types
```

---

## 1. Bốn tài khoản demo

Mật khẩu chung: **`TroNhanh@2026`**

| Account | Vai trò | Tạo bằng | Có dữ liệu gì |
|---|---|---|---|
| `seller.a@tronhanh.demo` | Renter + Seller | `/dang-ky` → bấm "Khởi tạo dữ liệu mẫu" ở `DemoBanner` | 3 khu, ~12 phòng, occupancies, contracts, invoices, 6 tin Active |
| `seller.b@tronhanh.demo` | Renter + Seller | `/dang-ky` + seed | 1 khu, 3 phòng, 2 tin — **tồn tại CHỈ để chứng minh RLS cô lập** |
| `renter.a@tronhanh.demo` | Renter | `/dang-ky` | 2 demand post; rồi 1 click "Tôi là người ở demo" |
| `admin@tronhanh.demo` | Admin | `/dang-ky` + **1 snippet SQL** (dưới) | — |

### Bootstrap Admin đầu tiên
Không có đường tự động — **cố ý**. `grant_role()` đòi phải đã là Admin, và `user_roles` không có policy INSERT. Chạy đúng 1 lần trong SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'Admin' from auth.users where email = 'admin@tronhanh.demo'
on conflict (user_id, role) do nothing;
```

> ❌ **KHÔNG tạo hàm client-callable kiểu `claim_admin`.** Đó là backdoor sẽ sống sót vào production.

### Làm review demo được
Login `renter.a` → `DemoFAB` → **"Tôi là người ở demo"** → gọi `demo_link_me_to_seeded_occupancy()`.
Rồi login `seller.a` → gọi `demo_enable_public_profiles()` (nút trong DemoFAB) để BR-024 cho phép review hiện công khai.

---

## 2. Tự động hoá vs QA tay

| Playwright | QA tay | Tầng SQL |
|---|---|---|
5 happy path; login/register; đăng tin kèm ảnh thật (`page.setInputFiles`); đăng demand post; kiểm duyệt approve→hiện; occupancy+contract→phòng Rented; gửi/nhận tin nhắn (2 browser context) | VietQR có quét được bằng app ngân hàng thật; chất lượng crop ảnh; cảm giác độ trễ Realtime; layout ở 375/768/1280; chạy thử toàn bộ 60s thuyết trình | **RLS cô lập** (`supabase/tests/rls.sql`) |

> ❌ **Không làm visual-regression snapshot.** 1.950 inline style object + page transition của `motion` sẽ sinh flake vô tận.

`data-testid` là selector ổn định **duy nhất** (codebase có zero `className`) → thêm testid là DoD của chính task tạo ra element.

---

## 3. Click-path — 5 luồng bắt buộc

Mỗi luồng ghi rõ **điều kiện FAIL**. Nếu gặp điều kiện fail, task tương ứng chưa xong.

### Luồng 1 — Đăng tin cho thuê

Login `seller.a` → `/chu-tro/dang-tin`
1. **Bước 1:** tiêu đề, Phòng trọ, địa chỉ, Quận 7, 25 m², 3.500.000, SĐT
2. **Bước 2:** Wifi + Máy lạnh + WC riêng, mô tả, thêm 2 địa điểm gần
3. **Bước 3:** **upload 4 ảnh thật** → xem progress → xóa 1 → đổi thứ tự
4. **Bước 4:** điện/nước/dịch vụ/cọc, chọn Boost 7 ngày, thanh toán **(giả lập)**
5. Submit → màn thành công → `/chu-tro/tin-dang`: row tồn tại, badge trạng thái đúng
6. `/tat-ca-phong`: **ảnh vừa upload (không phải ảnh stock)** hiện trên card, có badge ★ Nổi bật, nằm **trên** các tin không boost
7. `/phong/:id`: gallery = 3 ảnh còn lại; bảng chi phí khớp **chính xác** Bước 4
8. Incognito: SĐT che `0901****567`; đăng nhập lại: SĐT đầy đủ (BR-014)

> **FAIL nếu:** card hiện ảnh Unsplash (media chưa persist) · bảng chi phí rỗng (backfill/read path của migration 0300 sai) · tin không boost lại xếp trên tin boost (BR-005).

### Luồng 2 — Đăng tin tìm phòng

Login `renter.a` → `/` → khối "Người thuê đang tìm phòng" → **"Tìm phòng"** → `/dang-tin-nhu-cau?kind=tim-phong`
1. Điền: tiêu đề, khu vực (Quận 7 + Bình Thạnh), 2–4 triệu, Phòng trọ, ≥20 m², Wifi + WC riêng, ngày dọn vào, 1 người, mô tả
2. Submit → về `/`: card hiện **tiêu đề của tôi**, **khu vực của tôi**, **tháng dọn vào của tôi**, **tiện ích tôi chọn**, và **tên + initials từ `profiles`**
3. `/tin-nhu-cau/:id` khớp
4. `/tai-khoan/tin-nhu-cau` liệt kê kèm Ẩn / Sửa / Xóa

> **FAIL nếu card còn hiện bất kỳ chuỗi nào sau đây** — đó chính là giá trị hardcode T22 phải xóa:
> `"Khách tìm trọ"` · `"ND"` · `"Cần 1 người"` · `"Phòng trọ / Căn hộ"` · `"Dọn vào trong tháng"` · `"Sạch sẽ, Gọn gàng, Vui vẻ"` · `"Wifi, WC riêng, Tự do"`

### Luồng 3 — Đăng tin ở ghép

Cùng lối vào → **"Tìm người ở ghép"** → form đổi sang shape RoommateWanted
1. Điền: địa chỉ hiện tại, quận, giá chia, `needed_count = 1`, giới tính = Nữ, yêu cầu
2. Submit → card hiện nhãn vai trò **ở ghép** và **"Cần 1 người · Nữ"** đọc từ cột thật
3. `/tin-nhu-cau?kind=o-ghep` filter đúng
4. Xác nhận **"Ở ghép" KHÔNG xuất hiện** trong bộ lọc loại hình ở `/tat-ca-phong` (A_PRD §9)

### Luồng 4 — Review (cả 3 nghĩa)

**4a · Đánh giá chủ trọ**
Login `renter.a` → DemoFAB → "Tôi là người ở demo" → `/tai-khoan/phong-cua-toi` thấy khu + hợp đồng → "Đánh giá khu" → 5 sao + nội dung → submit → `/khu-tro/:slug` thấy review + điểm trung bình → `/tat-ca-phong` thấy badge rating trên tin của khu đó.
Rồi login `seller.a` → `/chu-tro/danh-gia` → phản hồi → reply hiện công khai.

*Negative (bắt buộc kiểm):* account mới toanh → nút "Đánh giá khu" **không hiện / disabled** kèm "chưa đủ điều kiện", **không bao giờ** hiện form rồi báo lỗi sau submit · `seller.a` **không** review được khu của mình (BR-030) · sửa review ở ngày thứ 8 bị từ chối (BR-023) · review chỉ hiện công khai khi khu bật `is_public_profile_enabled` (BR-024).

**4b · Kiểm duyệt**
Login `admin` → `/quan-tri/cai-dat` → chuyển kiểm duyệt sang **Thủ công** → login `seller.a` → đăng 1 tin → tin **không** hiện ở `/tat-ca-phong`, `/chu-tro/tin-dang` hiện "Chờ duyệt" → login `admin` → `/quan-tri/kiem-duyet-tin` → thử **Reject với lý do rỗng → bị chặn** → Reject có lý do → seller thấy "Bị từ chối" + lý do + nút "Sửa & gửi lại" → sửa & gửi lại → Approve → giờ hiện ở `/tat-ca-phong`.
Kiểm `moderation_logs` có **2 row**.

*Negative:* login `renter.a`, tự gõ `/quan-tri/kiem-duyet-tin` → màn **403** (không phải redirect về login).

**4c · Chủ trọ duyệt tin nhu cầu**
Login `seller.a` → `/chu-tro/tim-nguoi-thue` → danh sách xếp theo độ khớp khu vực + giá với phòng trống của `seller.a` → filter theo khu vực → "Nhắn tin" → mở conversation với `renter.a`.

### Luồng 5 — Quản lý khu & nhà trọ

Login `seller.a` → `/chu-tro/quan-ly-phong`
1. Tạo khu (tên, địa chỉ, quận, số tầng)
2. Tab **Cài đặt**: bank + STK + tên TK + đơn giá điện/nước/phí dịch vụ → save & reload → **vẫn còn**
3. Tab **Phòng**: tạo P101 (tầng 1, 22 m², 3.200.000, Available); thử `room_code` **trùng** → bị từ chối
4. Mở drawer phòng → tab **Người ở**: **thêm người ở + tạo hợp đồng** → phòng chuyển **Đang thuê**, và nếu có tin liên kết thì tin chuyển **Đã cho thuê** — **trong MỘT transaction** (BR-027)
5. Thử tạo hợp đồng Active thứ 2 chồng thời gian → lỗi tiếng Việt (BR-006)
6. **Ghi điện nước**: chỉ số kỳ trước **tự điền từ DB**; nhập chỉ số **thấp hơn** → lỗi tiếng Việt; nhập đúng → tiền tự tính
7. **Tạo hóa đơn** → tổng = Σ items → xem trước hóa đơn có STK + **VietQR quét được, đúng số tiền**
8. **"Đã thu"** → trạng thái Paid, KPI dashboard cập nhật
9. Đổi toggle demo sang **READ_ONLY** → **mọi** nút tạo/sửa disabled, dữ liệu **vẫn xem được** (BR-015)
10. Dashboard: "Phòng trống" luôn hiện; "Tổng phòng"/"Đang thuê" **mặc định ẩn**, bật được (BR-012)
11. Login `seller.b` → `/chu-tro/quan-ly-phong` **không thấy khu nào của A**; `/chu-tro/dang-tin/<id tin của A>` → "Không tìm thấy tin" (BR-007)

> **FAIL nếu:** ẩn tin báo lỗi (bug `Inactive`) · đổi trạng thái phòng báo lỗi (bug `Repairing`) · chỉ số kỳ trước là 0 khi đã có kỳ trước · tổng hóa đơn ≠ Σ items · `seller.b` thấy bất cứ gì của `seller.a`.

---

## 4. RLS ở tầng SQL

Chạy `supabase/tests/rls.sql` trong SQL Editor sau khi thay 4 UUID. **Mọi cột `ok_*` phải `true`.**

9 test: cô lập SaaS · đọc public marketplace vẫn chạy · tin chưa duyệt vô hình với anon · **rò rỉ cột bank (test quan trọng nhất)** · user không tự nâng Admin · review verified-only + BR-030 · cô lập nhắn tin · RPC từ chối người không đủ quyền · (storage: kiểm tay).

**Storage kiểm tay** — trong console browser khi đã login:
```js
await supabase.storage.from('listing-images')
  .upload(`<UUID_NGƯỜI_KHÁC>/x/y.webp`, new Blob(['x']))
// → phải trả lỗi
```

---

## 5. Rà Acceptance Criteria (PRD §7)

- [ ] Mọi thao tác ghi/đọc **dữ liệu thật**; DB rỗng → `EmptyState`, **không** mock fallback
- [ ] RLS: `seller.b` không thấy dữ liệu SaaS của `seller.a` (test SQL pass)
- [ ] BR liên quan được tôn trọng (BR-002/004/005/006/007/012/014/015/022/023/024/026/027/029/030)
- [ ] Không hardcode secret; `.env` không bị commit
- [ ] `grep -rn "console\." src` chỉ ra `supabase-error.ts`
- [ ] `grep -rn "\[Demo\]" src` = 0
- [ ] `pnpm typecheck` = 0 · `pnpm typecheck:strict` = 0 · `pnpm build` xanh
- [ ] Mọi task có SQL đã `db push` + `db:types`
- [ ] Thao tác đa bảng đi qua RPC — kill network giữa lúc ghi không để lại trạng thái lệch
- [ ] Không CTA nào dẫn tới `alert`; việc chưa làm ghi rõ version (`[Bản đồ — V1]`)
- [ ] Mọi thanh toán giả lập ghi **"(giả lập)"**
- [ ] Element E2E chạm tới đều có `data-testid`

---

## 6. Trước khi thuyết trình

- [ ] Chạy thử toàn bộ luồng 5 (điện nước → VietQR) **2 lần**, bấm không do dự
- [ ] Test đường fallback của Realtime (`USE_REALTIME_MESSAGING = false`)
- [ ] Quét thử VietQR bằng app ngân hàng thật ít nhất 1 lần
- [ ] Kiểm layout ở 375 / 768 / 1280
- [ ] Đặt `auto_approve_listings = true` trước khi lên demo (bật Thủ công chỉ trong 60s minh hoạ)
- [ ] Quay video 30–60s cho luồng lõi
