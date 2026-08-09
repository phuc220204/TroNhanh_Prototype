# T32 — Dọn dữ liệu & đi luồng trên DB trống

> Mục tiêu: đưa app về trạng thái một sản phẩm mới triển khai, rồi đi lại toàn bộ
> luồng như người dùng thật đầu tiên. **DB trống là trạng thái app sẽ ở khi có
> khách thật đầu tiên, và chưa ai từng test nó.**

---

## Phần 0 — Baseline trước khi dọn (đã chạy)

```
rental_listings    34      demand_posts       49
listing_media       3      reviews             0
platform_settings   4  ✓   subscription_plans  0  ⚠️
tin đang có boost  27
```

⚠️ **`subscription_plans`: SQL Editor đọc `3`, anon key đọc `0`.**

Lần đầu tôi kết luận "bảng rỗng" — **sai**. Bảng có đủ 3 gói; vấn đề là **RLS đang
bật mà không có policy SELECT nào**, nên không ai đọc được, kể cả người đã đăng
nhập. (RLS được bật ở ngoài migrations — grep `enable row level security` trong
`supabase/migrations/` không có dòng nào cho bảng này.)

Hệ quả: `subscription-service.ts` embed `subscription_plans(*)` luôn trả `null` ⇒
`SubscriptionData.plan` luôn `null`. Chưa component nào tiêu thụ `plan` nên không
hỏng gì thấy được — bug im lặng.

Cách sửa **không phải** seed lại (đã có dữ liệu) mà là thêm policy SELECT cho
`anon, authenticated` — bảng giá là thông tin công khai. Kèm theo: `TrialModal`
đang hardcode danh sách gói, nên giá trong UI và giá trong DB là hai nguồn chân lý
độc lập. **Việc riêng, không thuộc T32.**

⚠️ **27/34 tin đang có `boost_expire_at`** — dấu vết của lỗ boost cũ (client tự
set được, không qua thanh toán). Đã vá ở commit `47d46a9`; truncate sẽ xóa hết.

---

## Phần 1 — Dọn dữ liệu ✅ ĐÃ XONG (2026-08-06)

Kết quả: **16/16 bảng nghiệp vụ = 0**. Anon cũng xác nhận marketplace trống
(`rental_listings` 34→0 · `demand_posts` 49→0 · `listing_media` 3→0).

Sáu bảng giữ lại còn nguyên: `profiles` 12 · `user_roles` 19 ·
`subscription_plans` 3 · `platform_settings` 4 · `user_subscriptions` 9.

> `profiles` = 12 chứ không phải 4 như dòng "kỳ vọng" trong script — kỳ vọng đó
> viết hẹp, thực tế đã có 12 tài khoản đăng ký qua 9 task. Không phải lỗi.
> Điều cần là **Admin còn nguyên** (`user_roles` > 0) và đúng vậy.

<details>
<summary>Cách chạy lại (nếu cần dọn lần nữa)</summary>

Supabase CLI **không có** lệnh chạy SQL ad-hoc lên remote (`db reset` chỉ tác
động DB local). Nên bước này buộc phải làm tay.

1. Mở **Supabase Dashboard** → project Trọ Nhanh → **SQL Editor** → **New query**
2. Dán **toàn bộ** nội dung `supabase/scripts/reset-demo-data.sql`
3. Bấm **Run**
4. Cuộn xuống kết quả: có **22 dòng**. 16 dòng đầu ghi "phải rỗng" → cột `so_dong`
   phải là `0`. 6 dòng cuối ghi "phải còn" → phải `> 0`
5. **Dán kết quả đó vào chat** để tôi đối chiếu

> Nếu một dòng "phải rỗng" mà khác 0, hoặc một dòng "phải còn" mà bằng 0 →
> **dừng lại, đừng dùng tiếp**, gửi tôi xem.

Sau đó chạy `node supabase/scripts/verify-public-state.mjs` để xác nhận phần
công khai từ phía client.

</details>

### Dọn ảnh đã upload (không bắt buộc)

SQL không xóa file trong Storage. Ảnh mồ côi không ảnh hưởng luồng nào, chỉ tốn
dung lượng. Muốn dọn: Dashboard → **Storage** → bucket `listing-images` → chọn
tất cả → Delete.

---

## Phần 2 — BẠN đi luồng trên DB TRỐNG (chưa seed)

**Đừng seed lại ngay.** Đây là phần giá trị nhất của T32: nó test đúng thứ mà dữ
liệu seed vẫn luôn che mất.

Ghi lại **kết quả thật** vào cột bên phải — kể cả khi đúng.

### 2.1 Khách chưa đăng nhập

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 1 | Mở `/` | **Không** có dải banner "DEMO" nào. Khu "Phòng mới đăng tải" ra EmptyState hoặc ẩn, **không** phải khung trống méo | |
| 2 | `/tat-ca-phong` | EmptyState tử tế, không phải bảng trống + "0 kết quả" lơ lửng | |
| 3 | `/tim-phong` rồi bấm Tìm | Không crash, ra EmptyState | |
| 4 | `/tin-nhu-cau` | EmptyState | |
| 5 | Mở DevTools → tab Console | **0 lỗi đỏ** trên cả 4 trang trên | |

### 2.2 Đăng ký tài khoản mới hoàn toàn

Dùng email thật của bạn (không phải `@tronhanh.demo`) để test cả trigger tạo profile.

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 6 | `/dang-ky` → đăng ký | Vào được app, không lỗi | |
| 7 | Vào `/tai-khoan` | Tên và SĐT hiện đúng như lúc đăng ký (trigger `handle_new_user`) | |
| 8 | Vào `/chu-tro` | EmptyState **"Bạn chưa có khu trọ nào"** + nút "Tạo khu trọ đầu tiên" | |
| 9 | Trên trang công khai | Thấy dải onboarding mới *"Tài khoản của bạn chưa có khu trọ nào…"* + nút khởi tạo dữ liệu mẫu. **Không** thấy chữ "DEMO"/"Demo Prototype" | |

### 2.3 Đường đi của chủ trọ thật — làm HOÀN TOÀN bằng tay, không seed

Đây là đường **chưa bao giờ được đi trọn vẹn** trong dự án này.

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 10 | Kích hoạt gói **TRIAL** ở chân Sidebar | Module SaaS mở khóa | |
| 11 | Tạo khu trọ đầu tiên | Lưu được, hiện ở danh sách | |
| 12 | Tab **Cài đặt** → nhập đơn giá điện/nước + chọn ngân hàng + STK thật của bạn | Lưu được. **Thử nhập đơn giá điện = `0`** → phải bị chặn kèm câu tiếng Việt (không âm thầm thành 3500) | |
| 13 | Vẫn ở Cài đặt: **mã VietQR hiện ngay dưới form** | **Quét bằng app ngân hàng thật** → ra đúng tên ngân hàng + đúng STK bạn vừa nhập | |
| 14 | Thử nhập STK có chữ (`12ab34`) | Bị chặn, câu tiếng Việt | |
| 15 | Nhập STK nhưng **không chọn ngân hàng** | Bị chặn: "đã nhập số tài khoản thì phải chọn ngân hàng…" | |
| 16 | Thêm 2 phòng | Hiện ở danh sách phòng | |
| 17 | Tab **Người ở** → thêm người ở + hợp đồng | Phòng chuyển `Đang thuê` | |
| 18 | Ghi chỉ số điện nước | Lưu được | |
| 19 | Thử ghi chỉ số **nhỏ hơn** kỳ trước | Bị chặn: "chỉ số kỳ này không được nhỏ hơn kỳ trước" | |
| 20 | Tạo hóa đơn cho phòng đó | Tạo được; **mã QR trong form mang đúng số tiền tổng** | |
| 21 | `/chu-tro/hoa-don` | Hóa đơn vừa tạo hiện ra, đủ mã phòng + tên khu | |
| 22 | Mở chi tiết hóa đơn → bấm **"Đã thu <số tiền>đ"** | Trạng thái đổi. **Reload trang → vẫn đúng** | |

### 2.4 Bốn thứ chưa từng chạy lần nào — quan trọng nhất

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 23 | **Thu một phần:** tạo hóa đơn mới → tab Thanh toán ghi nhận thu một phần → mở `/chu-tro/hoa-don` | Nút ghi **số còn thiếu**, không phải tổng hóa đơn. Modal hiện "Đã thu" và "Còn thiếu". QR mang số còn thiếu | |
| 24 | **Gia hạn hợp đồng:** Người ở → "Gia hạn HĐ" → +6 tháng | Ngày kết thúc dời đúng, người ở và hóa đơn cũ **còn nguyên** | |
| 25 | **Gia hạn chồng thời gian:** kết thúc HĐ phòng đó, tạo HĐ mới bắt đầu ngay sau, rồi thử gia hạn HĐ cũ lấn sang | Bị chặn: "Phòng này đã có hợp đồng còn hiệu lực trong khoảng thời gian đó" | |
| 26 | **Xóa khu còn phòng đang thuê:** Cài đặt → Vùng nguy hiểm → "Xóa khu trọ này" | Modal nói *"còn N phòng đang cho thuê"*, nút xóa **bị vô hiệu** | |
| 27 | **Xóa khu trống:** tạo khu mới không phòng → xóa | Xóa được, biến khỏi danh sách | |
| 28 | **Boost hợp lệ:** đăng 1 tin → `/chu-tro/tin-dang` → "Đẩy tin VIP" | Modal hiện **3 gói giá thật** (20k/35k/60k), có chữ "(giả lập)". Chọn gói → tin có badge nổi bật | |
| 29 | **🔴 Thử tấn công boost** — xem ô riêng bên dưới | Phải bị chặn | |

#### Ô riêng: thử tấn công boost (mục 29)

Đây là thứ tôi muốn biết nhất. Trigger `trg_guard_boost_expire_at` chưa được
chứng minh là hoạt động, và nó là lớp duy nhất chặn được lỗ boost.

Mở DevTools → Console, ở trang `/chu-tro/tin-dang` khi **đã đăng nhập**, dán:

```js
const { data, error } = await window.__sb
  .from("rental_listings")
  .update({ boost_expire_at: "2030-01-01T00:00:00Z" })
  .eq("id", "<ID_TIN_CUA_BAN>")
  .select();
console.log({ data, error });
```

> Nếu `window.__sb` không tồn tại, nói tôi — tôi sẽ thêm một cách phơi client
> chỉ trong chế độ dev để bạn chạy được thử nghiệm này.

**Kỳ vọng:** `error.message` chứa `BOOST_REQUIRES_PAYMENT`, và `data` rỗng.
**Nếu thành công (tin được boost tới 2030):** trigger chưa apply → nói tôi ngay,
lỗ vẫn mở.

### 2.5 Kiểm cô lập dữ liệu giữa 2 chủ trọ (BR-007)

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 30 | Đăng ký tài khoản thứ hai → tạo 1 khu → quay lại tài khoản thứ nhất | Mỗi tài khoản **chỉ thấy khu của mình**. `/chu-tro/hoa-don` không lẫn hóa đơn của nhau | |

### 2.6 READ_ONLY (BR-015)

| # | Việc | Kỳ vọng | Thực tế |
|---|---|---|---|
| 31 | Sidebar → đặt trạng thái gói **READ_ONLY** | Mọi nút tạo/sửa/xóa trong `/chu-tro/*` **bị vô hiệu**, hover thấy câu *"Gói dịch vụ đã hết hạn. Dữ liệu của bạn vẫn được giữ nguyên…"*. Dữ liệu **vẫn xem được đầy đủ** | |
| 32 | Vẫn READ_ONLY: gõ thẳng URL `/chu-tro/quan-ly-phong` | Vẫn bị khóa ghi (không có đường lách qua URL) | |

---

## Phần 3 — Sau đó mới seed lại

Chỉ khi Phần 2 xong và các mục đã đúng:

1. Đăng nhập `seller.a@tronhanh.demo` / `TroNhanh@2026`
2. Bấm nút **"Khởi tạo dữ liệu mẫu"** trên dải onboarding
3. Kiểm luồng đánh giá (BR-022): **DemoFAB → "Tôi là người ở demo"** →
   `/tai-khoan/phong-cua-toi` → xác nhận liên kết → viết đánh giá

> Luồng đánh giá đạt điều kiện qua **nhánh payment** của `can_review_contract()`
> (seeder set `invoices.contract_id` và tạo `payments`), không cần chờ hợp đồng
> đủ 30 ngày. Đã kiểm trước khi chốt thứ tự T32.
> **Đừng nới `can_review_contract()`** để demo cho dễ.

---

## Cách báo kết quả

Với mỗi mục **không đúng kỳ vọng**, gửi tôi:
- Số mục
- Điều bạn thấy (câu chữ hiện ra, hoặc "không có gì xảy ra")
- Console có lỗi đỏ nào không (chụp hoặc dán)

Mục đúng thì chỉ cần liệt kê số. Không cần viết dài.
