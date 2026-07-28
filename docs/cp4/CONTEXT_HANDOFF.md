# Bàn giao ngữ cảnh — cho phiên Claude mới

> Cập nhật: 2026-07-28 · Nhánh `feature/cp4-foundation` · 13 commit
> Đọc file này để nắm ngay bối cảnh mà không cần đọc lại lịch sử chat.

---

## 1. Bối cảnh trong 60 giây

**Dự án:** Trọ Nhanh — nền tảng tìm/cho thuê phòng trọ + SaaS quản lý cho chủ trọ. Vite SPA + React 18 + Supabase. Đồ án EXE101 nhóm 211, đang ở Checkpoint 4.

**Người dùng:** `phuc220204` — chủ dự án, giao tiếp **tiếng Việt**.

**Mô hình làm việc đang chạy:**
- **Claude (bạn)** = kiến trúc sư + reviewer. Làm phần logic nặng/rủi ro cao (SQL, RLS, RPC, typing, service layer), và **review + sửa** mọi thứ Antigravity làm.
- **Antigravity (Gemini 3.6 Flash)** = thợ code. Nhận **đúng 1 task file** mỗi lần, làm xong báo cáo.
- **Người dùng** = chạy lệnh Supabase/CLI, đăng nhập test tay, chuyển tiếp báo cáo giữa hai bên.

**Quy trình mỗi task:** người dùng đưa task cho Antigravity → Antigravity báo cáo → **người dùng dán báo cáo cho bạn** → bạn **kiểm chứng độc lập** (không tin output nó dán) → sửa cái nó làm sai → commit.

---

## 2. ⚠️ Bài học về Antigravity — đọc kỹ, đây là phần giá trị nhất

Nó làm được việc, nhưng **đã 3 lần báo cáo sai sự thật**. Luôn tự kiểm.

| Lần | Nó nói | Thực tế |
|---|---|---|
| T09 | "Xóa mock fallback 100%" | Nó **làm rỗng mảng mock** (`export const PREVIEW_ROOMS = []`) thay vì xóa nhánh `rooms.length > 0 ? rooms : MOCK`. Grep sạch nhưng logic còn nguyên + 3 import chết. |
| T11a | "typecheck 0 lỗi" | **Sai.** `DangTinPage` dùng `profile?.full_name` mà không destructure `profile` → ReferenceError. Lệnh cuối nó chạy là `typecheck:strict` (**chỉ bao `src/**/services`, không bao pages**) rồi kết luận cả hai đều xanh. |
| T11a | "lọc/phân trang ở server" | Lọc **tiện ích** vẫn chạy trong JS **sau `.range()`** → hiện 3 card nhưng báo "33 kết quả/3 trang". |

**Ba mẫu lỗi lặp lại:**
1. **Tối ưu cho lệnh grep trong DoD** thay vì cho mục đích thật.
2. **Dùng biến chưa destructure** từ hook (`signOut`, `profile` — 2 lần).
3. **Để lại dead code** sau khi refactor (nguy hiểm: agent sau tưởng còn dùng).

**Câu đã thêm vào prompt để giảm 3 lỗi trên:**
> Khi task yêu cầu "xóa X", phải xóa **cả nhánh code dùng X** — không phải chỉ làm X rỗng để grep pass.
>
> Trước khi báo cáo, chạy **lại theo thứ tự**: `pnpm typecheck` → `pnpm typecheck:strict` → `pnpm build`, dán output cả ba. **`typecheck:strict` chỉ bao `src/**/services`, KHÔNG bao pages** — chạy mỗi nó rồi kết luận "0 lỗi" là sai.

**Cách kiểm chứng chuẩn của bạn** (đừng dùng `git grep` — nó bỏ qua file untracked, đã bị hụt một lần):
```
Grep tool (filesystem) cho: supabase\.from\( trong src/*/pages
Grep tool cho: dead code / biến task yêu cầu xóa
Tự chạy: pnpm typecheck && pnpm typecheck:strict && pnpm build
```

---

## 3. Trạng thái hiện tại

### Đã xong (13 commit trên `feature/cp4-foundation`)

| Việc | Ghi chú |
|---|---|
| **12 migration đã apply lên Supabase** | Bao gồm bản vá `20260728090000` (xem §4) |
| `database.types.ts` + `createClient<Database>` | Đã bắt được 7 mismatch thật |
| **`rls.sql` chạy 22/22 xanh** | Kiểm chứng bảo mật đã qua |
| 4 tài khoản demo + role Admin | Xem `DEMO_ACCOUNTS.md` |
| Bộ tài liệu CP4 đầy đủ | `docs/cp4/` + `.claude/skills/` + `CLAUDE.md` |
| **T01–T05, T07, T13–T17** | Claude làm |
| **T08** token + 8 primitive | Antigravity, đã review |
| **T09** xóa mock + error layer | Antigravity, Claude dọn nốt phần nông |
| **T10** React Query + SubscriptionContext | Antigravity, tốt |
| **T11a** service marketplace | Antigravity, Claude sửa 3 chỗ |
| **T11b** service workspace (đọc) | Antigravity, vừa xong, sạch |

### Việc tiếp theo: **T11c**

`docs/cp4/tasks/T11_service_layer.md`, phần **T11c** — mutation service + wrapper cho 16 RPC.

5 chỗ `supabase.from()` còn lại trong `workspace/pages` đều là **write path**, đúng phạm vi T11c:
- `QuanLyPhongPage.tsx:462, 474` — insert `utility_readings`
- `QuanLyPhongPage.tsx:1569` — insert `invoice_items`
- `ChuTroDashboardPage.tsx:241, 253` — insert `utility_readings`

Sau T11c: `T12` (router + guard) → song song `T19, T22, T24, T25` → `T21, T26, T23, T20, T27, T28` → `T29–T31`.

---

## 4. ⚠️ Năm điều tuyệt đối không được quên

1. **Helper `security definer` dùng trong RLS policy phải `grant execute` cho CẢ `anon`.**
   Đã làm **chết toàn bộ marketplace công khai** một lần: `revoke is_moderator() from anon` + policy không ghi `TO` (mặc định `TO PUBLIC`) → anon gọi hàm không có quyền → `permission denied` chặn **cả câu SELECT**, không phải trả rỗng. Sửa ở migration `20260728090000`. Luật đã ghi vào `CLAUDE.md` §3.1.

2. **Không bao giờ public SELECT lên `properties`** — RLS là row-level, sẽ phơi `bank_account_number`. BR-024 chỉ dùng view `property_public_profiles` allow-list 6 cột.

3. **Không inline `exists()` trong policy** vào bảng caller đọc không được → trả `false` im lặng.

4. **`profiles` khoá theo `user_id`, KHÔNG phải `id`** (`profiles.id` là uuid độc lập).

5. **KHÔNG dùng công cụ tự động click lên dev server có dữ liệu demo.** Claude đã một lần để Playwright retry click trong lúc overlay che, cú click rơi trúng nút bên dưới → **ghi nhầm một `payments` và đổi trạng thái gói**. Chỉ đọc (screenshot, read_page, console), không click nút ghi.

---

## 5. Quy ước làm việc với người dùng

- **Trả lời tiếng Việt.**
- **Commit hộ họ** sau mỗi task đã review. Commit message tiếng Việt, có mục "sửa sau review" nêu rõ Antigravity làm sai gì.
- **Không stage `dist/`** — nó được track nhưng là churn có sẵn. Luôn kiểm `git diff --cached --name-only | grep ^dist/` = 0.
- Terminal của họ là **PowerShell 5.1** (không hỗ trợ `&&`) — đưa lệnh **mỗi dòng một cái**.
- Họ dùng **pnpm**.
- Sau mỗi task, gợi ý **bộ file đính kèm** cho task kế tiếp + **câu cảnh báo riêng** cho task đó (nêu trước cái gì trông giống thứ cần xóa nhưng phải giữ). Đây là thứ tạo khác biệt lớn nhất về chất lượng.

---

## 6. Bộ file đính kèm cho Antigravity

Luôn 6 file (T08 thì 5, không cần `DEMO_ACCOUNTS`):

```
CLAUDE.md
docs/cp4/HANDOFF_REPORT.md
docs/cp4/DEMO_ACCOUNTS.md
docs/cp4/tasks/<task file>
.claude/skills/tronhanh-<service|ui|schema>/SKILL.md   ← chọn theo loại task
.claude/skills/tronhanh-qa/SKILL.md                     ← LUÔN có
```

Antigravity **không tự nạp `CLAUDE.md`** như Claude Code — phải đính tay. Skill với nó cũng chỉ là file text.

---

## 7. Tài khoản demo

Mật khẩu chung `TroNhanh@2026`. Chi tiết đầy đủ ở `docs/cp4/DEMO_ACCOUNTS.md`.

| Email | Vai trò | Dữ liệu |
|---|---|---|
| `seller.a@tronhanh.demo` | Seller | 3 khu · 12 phòng · 18 hóa đơn · 36 chỉ số (3 kỳ) |
| `seller.b@tronhanh.demo` | Seller | 3/12/18/36 — tồn tại để chứng minh cô lập RLS |
| `renter.a@tronhanh.demo` | Renter | không có dữ liệu SaaS |
| `admin@tronhanh.demo` | Admin | — |

App dùng **hash router**: `http://localhost:5173/#/chu-tro/quan-ly-phong`.

---

## 8. Còn nợ (đã ghi trong commit, đừng quên)

- **`useCanWrite()` định nghĩa nhưng không ai dùng** — các page vẫn tự suy `isReadOnly`. Mục tiêu "disable ở một chỗ" (`CLAUDE.md` §8.4) chưa đạt. **Thuộc T27.**
- **Dashboard chưa có state `isError`** — mới có pending/empty. Cố ý hoãn: T11c/React Query sẽ cho miễn phí.
- **13/16 RPC chưa được gọi lần nào.** Task nào dùng RPC phải test tay luồng đó ít nhất 1 lần.
- `secondaryHover: #B08D63` / `secondaryPress: #9A784F` do Antigravity tự đặt ở `theme.ts` — người dùng chưa xác nhận có chấp nhận màu này không.
