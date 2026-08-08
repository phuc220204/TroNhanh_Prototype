# Tài khoản demo — dùng để test

> Đính file này kèm mọi task cần đăng nhập kiểm thử.
> Trạng thái xác nhận ngày **2026-07-28** bằng truy vấn trực tiếp trên Supabase.

---

## 1. Bốn tài khoản

Mật khẩu **giống nhau cho cả 4**: `TroNhanh@2026`
Email confirmation đã **TẮT** → đăng ký/đăng nhập không cần xác nhận mail.

| Email                    | Mật khẩu        | Vai trò            | Dữ liệu đã seed                                                |
| ------------------------ | --------------- | ------------------ | -------------------------------------------------------------- |
| `seller.a@tronhanh.demo` | `TroNhanh@2026` | Renter + Seller    | **3 khu · 12 phòng · 18 hóa đơn · 36 chỉ số điện nước** (3 kỳ) |
| `seller.b@tronhanh.demo` | `TroNhanh@2026` | Renter + Seller    | 3 khu · 12 phòng · 18 hóa đơn · 36 chỉ số                      |
| `renter.a@tronhanh.demo` | `TroNhanh@2026` | Renter             | không có dữ liệu SaaS (đúng thiết kế)                          |
| `admin@tronhanh.demo`    | `TroNhanh@2026` | **Admin** + Renter | không có dữ liệu SaaS                                          |

> ⚠️ **Đuôi `@tronhanh.demo` là bắt buộc, không đổi.** RPC `demo_link_me_to_seeded_occupancy()` chỉ tác động lên khu trọ mà chủ có email kết thúc `@tronhanh.demo` — đây là ràng buộc phạm vi cố ý để hàm demo không đụng dữ liệu thật.

---

## 2. Dùng tài khoản nào cho việc gì

| Bạn đang test                                                                  | Đăng nhập bằng                      |
| ------------------------------------------------------------------------------ | ----------------------------------- |
| Đăng tin cho thuê · sửa tin · quản lý khu/phòng · điện nước · hóa đơn · VietQR | `seller.a`                          |
| **Cô lập dữ liệu (BR-007)** — A không thấy gì của B và ngược lại               | `seller.b`                          |
| Đăng tin tìm phòng / ở ghép · nhắn tin · đánh giá khu trọ                      | `renter.a`                          |
| Kiểm duyệt tin · quản lý user · bật/tắt chế độ kiểm duyệt                      | `admin`                             |
| Marketplace công khai · che SĐT (BR-014)                                       | **cửa sổ ẩn danh**, không đăng nhập |

**Cách test cô lập RLS:** làm gì đó bằng `seller.a`, rồi đăng nhập `seller.b` và xác nhận **không thấy gì** của A. Cả hai đều có 3 khu / 12 phòng nên phép thử này có ý nghĩa thật, không phải "pass vì bên kia rỗng".

---

## 3. Dữ liệu đã seed của `seller.a` (mốc để đối chiếu)

**Khu trọ Phan Văn Trị** — Bình Thạnh — 7 phòng

| Phòng    | Trạng thái | Người ở        | Giá        |
| -------- | ---------- | -------------- | ---------- |
| P101     | Trống      | —              | 3.200.000đ |
| P102     | Đang thuê  | Nguyễn Văn An  | 2.800.000đ |
| P201     | Đã ẩn      | —              | 3.500.000đ |
| **P202** | Đang thuê  | Trần Minh Khoa | 3.000.000đ |
| P203     | Đang thuê  | Lê Thị Hương   | 2.900.000đ |
| P301     | Đang thuê  | Phạm Quốc Bảo  | 3.600.000đ |
| P302     | Trống      | —              | 2.600.000đ |

**Căn hộ Quận 7** — Quận 7 — 3 phòng · **Nhà trọ Thủ Đức** — Thủ Đức — 2 phòng

> **P202 là phòng tốt nhất để test**: đang thuê, có đủ 3 kỳ điện nước + hóa đơn, và **kỳ mới nhất còn nợ** → thấy được banner công nợ, cột "Còn lại", nhãn "Quá hạn".

Đơn giá đã cấu hình: điện **3.500đ/kWh** · nước **15.000đ/m³** · dịch vụ **100.000đ/tháng**.

---

## 4. Route chính

| Route                                                                             | Cần đăng nhập?                                      |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `/` · `/tat-ca-phong` · `/tim-phong` · `/phong/:id`                               | không                                               |
| `/dang-nhap` · `/dang-ky`                                                         | không                                               |
| `/chu-tro` · `/chu-tro/quan-ly-phong` · `/chu-tro/tin-dang` · `/chu-tro/dang-tin` | có                                                  |
| `/quan-tri/*`                                                                     | **Admin/Moderator** — user thường phải thấy màn 403 |
| `/styleguide`                                                                     | không                                               |

App dùng **hash router** → URL đầy đủ là `http://localhost:5173/#/chu-tro/quan-ly-phong`.

---

## 5. Seed lại khi cần

Seeder **không idempotent** — nó chặn nếu tài khoản đã có dữ liệu. Muốn seed lại phải xóa sạch trước.

**Bước 1** — SQL Editor (đổi email cho đúng tài khoản):

```sql
do $$
declare v_uid uuid;
begin
  select id into v_uid from auth.users where email = 'seller.a@tronhanh.demo';
  delete from public.payments        where owner_id = v_uid;
  delete from public.invoice_items   where invoice_id in (select id from public.invoices where owner_id = v_uid);
  delete from public.invoices        where owner_id = v_uid;
  delete from public.utility_readings where owner_id = v_uid;
  delete from public.contracts       where owner_id = v_uid;
  delete from public.occupancies     where owner_id = v_uid;
  delete from public.rooms           where owner_id = v_uid;
  delete from public.properties      where owner_id = v_uid;
  delete from public.listing_media   where listing_id in (select id from public.rental_listings where seller_id = v_uid);
  delete from public.listing_amenities where listing_id in (select id from public.rental_listings where seller_id = v_uid);
  delete from public.rental_listings where seller_id = v_uid;
  delete from public.demand_posts    where renter_id = v_uid;
end $$;
```

Giữ nguyên `auth.users` / `profiles` / `user_roles` — **không phải đăng ký lại tài khoản**.

**Bước 2** — đăng nhập tài khoản đó → bấm **"Khởi tạo dữ liệu mẫu"** ở DemoBanner.

**Kiểm lại:**

```sql
select u.email,
       (select count(*) from public.properties       p  where p.owner_id  = u.id) as khu,
       (select count(*) from public.rooms            r  where r.owner_id  = u.id) as phong,
       (select count(*) from public.invoices         i  where i.owner_id  = u.id) as hoa_don,
       (select count(*) from public.utility_readings ur where ur.owner_id = u.id) as chi_so
from auth.users u
where u.email like '%@tronhanh.demo'
order by u.email;
```

Đúng thì `seller.a` và `seller.b` ra **3 / 12 / 18 / 36**.

---

## 6. ⚠️ Luật khi test tự động

**Không dùng công cụ tự động click (Playwright/Puppeteer) lên dev server đang có dữ liệu demo.**

Đã xảy ra một lần: một lệnh click bị timeout, công cụ retry liên tục trong lúc overlay đang che, và cú click rơi trúng nút bên dưới → **ghi nhầm một bản ghi `payments`** và **đổi trạng thái gói sang ACTIVE**.

Nếu cần tự động hoá:

- Chỉ **đọc** (screenshot, `read_page`, đọc console) — không click các nút ghi
- Cần test luồng ghi thì làm **thủ công**, hoặc dựng Playwright spec riêng theo `T29` với dữ liệu tự dựng rồi dọn sau
- Chạm nhầm dữ liệu thì **nói ra**, đừng im lặng — seed lại theo §5 là xong

---

## 7. Bảo mật

- File này **không chứa secret**. `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` nằm trong `.env` (đã gitignore).
- Đây là tài khoản **demo trên DB demo**. Không dùng mật khẩu này ở bất cứ đâu khác.
- Trước khi lên production: xóa 4 tài khoản này và drop các hàm `demo_*` (xem `02_SCHEMA_DECISIONS.md` §13).
