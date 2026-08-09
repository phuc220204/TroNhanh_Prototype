# Tiếp nhận phiên mới — đọc file này TRƯỚC

> Cập nhật: 2026-08-09 · Nhánh `feature/cp4-foundation` (đã merge vào `main`)
> Đọc kèm: `CLAUDE.md` (luật) · `CONTEXT_HANDOFF.md` (bối cảnh + bài học Antigravity)
>
> File này trả lời đúng ba câu: **đang dở gì · làm gì tiếp · đừng vấp vào đâu.**

---

## 1. Trạng thái build — SẠCH

```
33 migration đã lên remote (local khớp remote)
pnpm typecheck / typecheck:strict / build  đều xanh
noImplicitAny ĐÃ BẬT · build gồm cả 2 nấc typecheck ⇒ type error CHẶN deploy
console.* ngoài supabase-error.ts = 0
7 spec Playwright / 30 test — đã viết, CHƯA CHẠY LẦN NÀO
main == feature/cp4-foundation, cả hai đã push lên GitHub
```

**Vercel deploy từ `main`.** Trước 2026-08-09 `main` vẫn ở CP3, nên bản deploy cũ
KHÔNG có kiểm duyệt / đánh giá / hóa đơn / tin nhu cầu. Giờ đã có.

### Hai luật về migration — vẫn phải nhớ

> ⚠️ **ĐỪNG sửa `database.types.ts` bằng tay. ĐỪNG bọc `as any`.** Lỗi typecheck
> trỏ vào RPC "không tồn tại" là tín hiệu ĐÚNG cho biết migration chưa lên DB.
> Việc "làm cho lỗi biến mất" đã xảy ra 3 lần (T19, T20, T27) và mỗi lần đều dẫn
> tới typecheck xanh nhưng app chết lúc chạy thật.

> ⚠️ **Lỗi `failed to connect to the docker API` sau `Applying migration...` là
> NHIỄU.** Kiểm bằng `npx supabase migration list` — mọi dòng phải có `local`
> khớp `remote`. Đó là bằng chứng duy nhất đáng tin.

---

## 2. Việc CHỦ DỰ ÁN phải làm ngay (theo thứ tự)

| # | Việc | Vì sao |
|---|---|---|
| 1 | Chạy `supabase/seeds/backfill_area_codes.sql` | Lần chạy trước còn `1 tin · 1 khu · 7 tin nhu cầu` thiếu mã khu vực. Bản mới đã thêm khối 5 cho tin nhu cầu của `dbSeeder`. Ba số kiểm cuối file phải về `0 · 0 · 0` (hoặc `1 · 1 · 0` nếu để nguyên khu `HD2` tự tạo tay) |
| 2 | Kiểm Vercel | Branch production phải là `main`; `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` phải có, thiếu là ra màn báo lỗi cấu hình |
| 3 | Thử màn khóa `/chu-tro` bằng **tài khoản mới** | Chưa ai xác minh. Kỳ vọng: "Tính năng dành riêng cho gói SaaS" + nút dùng thử, KHÔNG phải dashboard rỗng |
| 4 | **T32 phần 2** — `09_T32_CHECKLIST_DB_TRONG.md` mục 6→32 | Chặn mọi việc còn lại, và nghiệm thu luôn các RPC chưa từng gọi thật |
| 5 | T30-1 chạy `supabase/tests/rls.sql` | **Seed CẢ `seller.a` lẫn `seller.b`** trước, nếu không 7 assertion cô lập pass rỗng |
| 6 | T30-2 test storage cross-folder qua console | |
| 7 | T31-1 rà AC ở `06_QA_CHECKLIST.md` §5 | |
| 8 | T31-5 video demo 30–60s luồng điện nước → VietQR | |
| 9 | Quét VietQR bằng app ngân hàng thật | 28 mã BIN chưa đối chiếu NAPAS |

### Phụ thuộc thứ tự dễ bỏ sót

1. **T32 phần 2 phải TRƯỚC `pnpm test:e2e`.** Bộ E2E tạo khu, phòng, tin đăng, tin
   nhắn — chạy trước là mất vĩnh viễn cơ hội test "hệ thống trống". Đọc
   `tests/e2e/README.md` §1 trước khi chạy.
2. **`rls.sql` phải chạy khi ĐÃ CÓ dữ liệu ở CẢ HAI seller.**

---

## 3. Đã làm trong phiên 2026-08-08→09 (18 commit)

| Nhóm | Nội dung |
|---|---|
| Sửa phòng | RPC `update_room` + `EditRoomModal` — đơn giá riêng của phòng giờ sửa được, trước chỉ đặt được lúc tạo |
| T31-2 | Bật `noImplicitAny` — **chỉ 7 lỗi**, không phải 150–400 như dự kiến |
| T31-3 | `build` = `build:ci` ⇒ type error chặn deploy Vercel |
| T30-3 | README viết lại từ đầu (setup, 4 account demo, 2 việc làm tay) |
| T29 | 7 spec Playwright / 30 test + `tests/e2e/README.md` |
| Dữ liệu demo | SQL 20 tài khoản (Nguyễn Văn A→J bán, Trần Thị A→J thuê) + 15 tin cho thuê + 10 tin nhu cầu |
| **Đơn vị hành chính 2025** | Bỏ 6 quận cứng → 34 tỉnh / 3.321 phường/xã, có ô tìm kiếm không dấu |
| **Cải tổ router** | Tách khu vực TÀI KHOẢN (miễn phí) khỏi khu vực CHỦ TRỌ (SaaS) |

### Bug tìm ra khi làm (nợ cũ, không phải do phiên này gây)

- `dbSeeder` chết vì trigger canh boost — seeder hỏng từ 06/08 mà không ai biết
- Giá trên card lặp đơn vị: `5,5 tr/tháng đ/tháng`
- **Ô tìm kiếm navbar chưa bao giờ hoạt động** — chữ gõ vào bị gửi làm `districts` khớp CHÍNH XÁC
- **Bộ lọc "Cho nuôi thú cưng" chưa từng khớp tin nào** — `mapAmenityToKey` có catch-all trả `"wifi"`
- Tab bar mobile: `AllListingsPage` cả 4 nút không có `onClick`; 2 trang kia thiếu 2 nút
- Tin ở ghép luôn ghi `district = "Quận 7"` (mặc định `REGIONS[0]`, không có ô nhập)
- 3 trang `/tai-khoan/*` là vỏ rỗng "Chức năng đang được cập nhật"

---

## 4. ⚠️ QUYẾT ĐỊNH KIẾN TRÚC MỚI — đừng làm ngược lại

### 4.1 Hai khu vực, tách theo TIỀN/QUYỀN chứ không theo vai trò

```
/tai-khoan/*   miễn phí, mọi người đăng nhập
               Tin cho thuê của tôi · Tin nhu cầu của tôi · Tin đã lưu
               Phòng của tôi · Đánh giá của tôi · Tổng quan · Cài đặt

/chu-tro/*     SaaS vận hành, gác bằng TRẠNG THÁI GÓI
               Tổng quan · Khu trọ & Phòng · Người ở & Hợp đồng
               Hóa đơn · Cài đặt khu trọ

/dang-tin-cho-thue   công khai với mọi tài khoản
```

> **Đăng tin KHÔNG phải đặc quyền chủ trọ.** Role `Seller` do RPC tự cấp ở lần
> đăng tin đầu tiên và **không có policy/guard nào dùng nó để chặn** — nó chỉ
> nghĩa là "đã từng đăng tin". Đừng gác `/chu-tro/*` bằng role đó; gác bằng
> trạng thái gói.

5 redirect từ URL cũ đang giữ trong `routes/index.tsx`. Xóa được sau khi chắc
không còn ai bookmark.

### 4.2 Đơn vị hành chính — mô hình 2 CẤP

Từ 01/07/2025 (Nghị quyết 1685) Việt Nam **bỏ cấp quận/huyện**. TP.HCM sáp nhập
với Bình Dương và BR-VT, có **168 đơn vị cấp xã**.

- Dữ liệu: `src/shared/constants/vn-{provinces,wards}.generated.ts`
- Sinh lại: `node scripts/gen-vn-regions.mjs` (có 4 chốt kiểm; ra 63 tỉnh nghĩa là
  API rollback về dữ liệu trước sáp nhập → script tự dừng, không ghi đè)
- Tra cứu: `src/shared/utils/vn-regions.ts` · Giao diện: `<AreaSelect />`
- `REGIONS` trong `catalog.ts` **đã xóa** — đừng dựng lại danh sách quận cứng

`ward_code` là SỰ THẬT để lọc; `district` giờ là TÊN HIỂN THỊ (ảnh chụp lúc đăng).
`vn-wards` 117KB nằm ở **chunk riêng**, chỉ tải khi mở ô chọn khu vực — đừng
import thẳng module đó ở component.

---

## 5. CẠM BẪY — chỗ mất thời gian nhất

1. **RLS trả rỗng IM LẶNG.** `profiles`, `rooms`, `properties` owner-only. Cách
   đúng: RPC `security definer` với danh sách cột TƯỜNG MINH (đừng `p.*` —
   `properties` chứa `bank_account_number`).
2. **Helper dùng trong RLS policy phải `grant execute` cho CẢ `anon`.** Thiếu là
   `permission denied` chặn cả câu SELECT. Đã làm chết marketplace công khai một lần.
3. **Hai đường FK giữa `occupancies` và `contracts`** — mọi embed PostgREST phải
   chỉ rõ tên FK.
4. **`redirectTo` của OAuth phải là origin trần** (app dùng hash router).
5. **Đừng đổi port dev khỏi 5173** — Google Cloud Console khai redirect URI cố định.
6. **`isLoading` đơn độc trong guard sẽ unmount cả cây route.**
7. **View `public_demand_posts` khai cột TƯỜNG MINH** — thêm cột vào bảng mà quên
   sửa view thì client đọc mãi không thấy, tưởng chưa ghi được.
8. **Seed SQL chống trùng theo `title`** — chạy lại file seed bản mới KHÔNG cập
   nhật dòng cũ. Muốn sửa dữ liệu đã seed thì dùng `backfill_area_codes.sql`.

---

## 6. NỢ KỸ THUẬT đã biết

- **~9 chỗ ghép `err.message` vào UI** (`LoginPage`, `RegisterPage`, `QuanLyPage`,
  `useListingForm`) — vi phạm §7, lộ văn bản Postgres thô.
- **`subscription_plans` có 3 gói nhưng KHÔNG ai đọc được** — RLS bật mà không có
  policy SELECT. `TrialModal` hardcode danh sách ⇒ nguồn chân lý kép.
- **`dist/` đang được track (60 file)** — Vercel tự build từ source, nên nó chỉ là
  rác gây nhiễu `git status` mọi phiên. Nên đưa vào `.gitignore`.
- **`RoomDetailPage.tsx` ~1.080 dòng** · `OccupantsView` 568 · `dbSeeder` 526 —
  vượt/sát ngưỡng 600 của §8.2.
- **`ChuTroDashboardPage` import `listing-queries` của marketplace** — cross-import
  §2.1 còn sót từ T11b.
- **`AreaSelect` chưa hỗ trợ đa chọn** — `PostDemandPage` tự gộp bằng chip.
- **Chiều ngược của BR-027 chưa làm** — phòng rời `Rented` thì tin KHÔNG tự về
  `Active` (cố ý: tránh đường vòng qua kiểm duyệt). Cần chủ dự án chốt.
- **`theme.ts` có `secondary` và `sand` cùng `#C99B65`** — một trong hai thừa, gây
  warning trùng key ở `/styleguide`.
- `secondaryHover: #B08D63` / `secondaryPress: #9A784F` do Antigravity tự đặt —
  chưa ai xác nhận.

---

## 7. Tài khoản demo

Mật khẩu chung `TroNhanh@2026`. Chi tiết: `DEMO_ACCOUNTS.md` (§1 bốn tài khoản
gốc, §1b hai mươi tài khoản làm đầy marketplace).

| Email | Vai trò |
|---|---|
| `seller.a@tronhanh.demo` | Seller — dùng cho mọi luồng SaaS |
| `seller.b@tronhanh.demo` | Seller — tồn tại để chứng minh cô lập RLS |
| `renter.a@tronhanh.demo` | Renter (đang còn ~18 ngày dùng thử SaaS) |
| `admin@tronhanh.demo` | Admin |

App dùng **hash router**: `http://localhost:5173/#/chu-tro/quan-ly-phong`.

---

## 8. Cách làm việc với chủ dự án

- **Trả lời tiếng Việt.**
- Terminal **PowerShell** (không `&&`) — mỗi lệnh một dòng. Dùng **pnpm**.
- **Commit hộ họ** sau mỗi việc đã review. Message tiếng Việt, có mục
  **"Sửa sau review"** nêu rõ cái gì sai và vì sao nguy hiểm.
- **Không stage `dist/`** — kiểm `git diff --cached --name-only | grep ^dist/` = 0.
- **Luôn tự kiểm chứng, đừng tin báo cáo** — xem bảng bài học ở `CONTEXT_HANDOFF.md` §2.
- Chủ dự án đọc kỹ và hay chỉ ra vấn đề kiến trúc thật. Khi họ nói "hình như có
  vấn đề" thì thường là có — đi đọc code trước khi giải thích.
