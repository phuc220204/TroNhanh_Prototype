# Trọ Nhanh

Nền tảng tìm/cho thuê phòng trọ, kèm module SaaS quản lý dành cho chủ trọ.
Đồ án EXE101 — nhóm 211, Checkpoint 4.

Tiếp tục sửa OC1 hoặc chuyển sang Antigravity: đọc [file bàn giao](docs/ANTIGRAVITY_OC1_HANDOFF.md)
và [hướng dẫn thao tác tay](docs/OC1_MANUAL_STEPS_VI.md) trước khi triển khai.

**Stack:** Vite · React 18 · TypeScript · Supabase (Postgres + Auth + Storage) ·
React Query · React Router (hash router).

> **Người mới vào dự án đọc theo thứ tự:**
> `CLAUDE.md` (luật bắt buộc) → [`docs/cp4/00_README_CP4.md`](docs/cp4/00_README_CP4.md) → file task đang làm.

---

## 1. Chạy dự án lần đầu

Cần **Node 20+** và **pnpm**.

```bash
pnpm install
```

Tạo `.env` ở thư mục gốc từ `.env.example`, điền hai biến của project Supabase
(Settings → API):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

> ❌ **Chỉ dùng `anon` key.** `service_role` key không bao giờ được đặt ở
> frontend — nó bỏ qua toàn bộ RLS, mà RLS chính là cơ chế cô lập dữ liệu giữa
> các chủ trọ. `.env` đã nằm trong `.gitignore`.

Liên kết CLI với project rồi đẩy schema:

```bash
pnpm exec supabase link --project-ref <project-ref>
```

```bash
pnpm db:push
```

```bash
pnpm db:types
```

Chạy dev server:

```bash
pnpm dev
```

Mở http://localhost:5173

> ⚠️ **Đừng đổi port khỏi 5173.** Google Cloud Console khai redirect URI cố định
> theo port đó; đổi là luồng đăng nhập Google chết mà không có thông báo lỗi nào.

### 1.1 Hai việc phải làm tay trên Supabase Dashboard

Không có lệnh CLI nào làm thay được hai việc này.

**a) Email confirmation** — Trên database kiểm thử riêng, có thể tắt
*Confirm email* ở Authentication → Providers → Email để các tài khoản demo và
`auth.spec.ts` hoạt động tức thì. Trên production, giữ xác nhận email và kiểm
tra email xác thực được gửi/nhận: `RegisterPage` đã hiển thị hướng dẫn kiểm tra
hộp thư khi `signUp` chưa trả session.

**b) Tạo Admin đầu tiên bằng SQL** — đăng ký `admin@tronhanh.demo` qua
`/dang-ky` trước, rồi chạy đúng một lần trong SQL Editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'Admin' from auth.users where email = 'admin@tronhanh.demo'
on conflict (user_id, role) do nothing;
```

Không có đường tự động, và đó là **chủ ý**: `grant_role()` đòi người gọi đã là
Admin, còn `user_roles` không có policy INSERT nào. Một hàm client-callable kiểu
`claim_admin` sẽ là backdoor sống sót vào production.

---

## 2. Tài khoản demo

Cả bốn dùng chung mật khẩu **`TroNhanh@2026`**.
Chi tiết dữ liệu từng tài khoản: [`docs/cp4/DEMO_ACCOUNTS.md`](docs/cp4/DEMO_ACCOUNTS.md).

| Email | Vai trò | Dùng để test |
|---|---|---|
| `seller.a@tronhanh.demo` | Renter + Seller | đăng tin · quản lý khu/phòng · điện nước · hóa đơn · VietQR |
| `seller.b@tronhanh.demo` | Renter + Seller | **cô lập dữ liệu (BR-007)** — B không được thấy gì của A |
| `renter.a@tronhanh.demo` | Renter | tin nhu cầu · nhắn tin · đánh giá khu trọ |
| `admin@tronhanh.demo` | Admin | kiểm duyệt tin · quản lý user · chế độ kiểm duyệt |

Các tài khoản này chỉ dành cho database kiểm thử. Production không còn DemoFAB,
banner seed hay RPC `demo_*`; fixture cần thiết phải được nạp có chủ đích từ SQL
Editor, không qua giao diện người dùng.

---

## 3. Lệnh

| Lệnh | Việc |
|---|---|
| `pnpm dev` | dev server ở cổng 5173 |
| `pnpm build` | typecheck cả hai nấc rồi mới build — **type error là chặn deploy** |
| `pnpm typecheck` | Nấc A + B (`noImplicitAny`) trên toàn `src` và `tests` |
| `pnpm typecheck:strict` | Nấc D — full strict, chỉ áp cho `*/services`, `shared/query`, `shared/types` |
| `pnpm db:push` | đẩy migration lên Supabase remote |
| `pnpm db:types` | sinh lại `src/shared/types/database.types.ts` từ DB thật |
| `pnpm test:e2e` | Playwright — **đọc [`tests/e2e/README.md`](tests/e2e/README.md) §1 trước** |
| `pnpm test:e2e:ui` | Playwright ở chế độ UI |

### Hai cái bẫy hay gặp khi chạy lệnh DB

**`failed to connect to the docker API` sau dòng `Applying migration...` là
nhiễu.** CLI chỉ dò stack local để cache catalog; việc đó thất bại nhưng KHÔNG
liên quan tới việc đẩy SQL lên remote. Kiểm chứng bằng:

```bash
pnpm exec supabase migration list
```

Mọi dòng phải có `local` khớp `remote`. Thiếu `remote` = chưa apply.

**Đừng sửa tay `src/shared/types/database.types.ts`, và đừng bọc `as any`.**
Lỗi typecheck trỏ vào một RPC "không tồn tại" là tín hiệu ĐÚNG cho biết migration
chưa lên DB. Bịt nó đi thì typecheck xanh, build xanh, và app chết lúc chạy thật —
việc này đã xảy ra ba lần trong dự án.

---

## 4. Cấu trúc thư mục

```
src/shared/        hạ tầng chung: supabase client, types, services hạ tầng, contexts, UI primitives
src/marketplace/   public/renter/seller-tin-đăng: landing, tìm kiếm, chi tiết, đăng tin, tin nhu cầu, review
src/workspace/     SaaS chủ trọ (/chu-tro/*): dashboard, khu/phòng, người ở, hợp đồng, điện nước, hóa đơn
src/admin/         kiểm duyệt & quản trị (/quan-tri/*)
src/routes/        router
supabase/migrations/  SQL — chỉ THÊM file mới, không sửa file đã apply
tests/e2e/         Playwright
docs/cp4/          PRD, quyết định schema, hợp đồng RPC, checklist QA
```

`marketplace` và `workspace` **không import lẫn nhau qua tầng dữ liệu**. Mọi truy
cập DB đi qua service layer nằm trong shell sở hữu bảng đó. Chi tiết và hai điểm
nối được phép: `CLAUDE.md` §2.

---

## 5. Còn phải làm tay (không tự động hoá được)

| Việc | Ở đâu |
|---|---|
| Chạy bộ test RLS | dán nguyên `supabase/tests/rls.sql` vào SQL Editor; cột `passed` phải TRUE ở mọi dòng. **Phải có dữ liệu của `seller.a` trước** — trên DB trống thì "B không đọc được gì của A" pass vì A vốn không có gì, tức pass mà vô nghĩa |
| Test storage cross-folder | console trình duyệt khi đã đăng nhập — upload vào thư mục của UUID người khác phải bị chặn |
| Quét VietQR bằng app ngân hàng thật | 28 mã BIN chưa đối chiếu NAPAS; BIN sai thì QR vẫn quét ra, chỉ là ra sai ngân hàng |
| Đi checklist DB trống | [`docs/cp4/09_T32_CHECKLIST_DB_TRONG.md`](docs/cp4/09_T32_CHECKLIST_DB_TRONG.md) — **làm trước khi chạy E2E**, vì E2E tạo dữ liệu và xoá mất trạng thái "hệ thống trống" |
| Cấu hình domain Auth + thương hiệu Google | Làm trong Supabase/Google Cloud rồi chạy checklist [`docs/OC1_DEPLOYMENT_CHECKLIST.md`](docs/OC1_DEPLOYMENT_CHECKLIST.md); mã nguồn không thể tự thay cấu hình tài khoản nhà cung cấp |

---

## 6. Nguồn gốc thiết kế

Bản thiết kế gốc trên Figma:
https://www.figma.com/design/GVlt6ekA4QWOxDsefB8wuI/Design-System-for-Tr%E1%BB%8D-Nhanh

Ghi công thư viện và tài nguyên: [`ATTRIBUTIONS.md`](ATTRIBUTIONS.md).
