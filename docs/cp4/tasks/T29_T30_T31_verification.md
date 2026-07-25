# T29 · T30 · T31 — Phase 3: Verification

---

## T29 — Playwright E2E

**Phụ thuộc:** Phase 2 xong (hoặc từng phần — spec nào có tính năng thì viết spec đó)

### Setup
```bash
pnpm add -D @playwright/test
npx playwright install chromium
```
`playwright.config.ts`: `baseURL: 'http://localhost:5173'`, `webServer: { command: 'pnpm dev', port: 5173, reuseExistingServer: true }`, `use: { locale: 'vi-VN' }`.
Script: `"test:e2e": "playwright test"`.

### Spec — `tests/e2e/`
| File | Nội dung |
|---|---|
| `auth.spec.ts` | đăng ký → tự đăng nhập → reload giữ session → đăng xuất; `?redirect=` sau khi login |
| `listing.spec.ts` | đăng tin + `setInputFiles` 3 ảnh → hiện ở `/tat-ca-phong` với **ảnh đã upload**; boost xếp trước; SĐT che khi ẩn danh |
| `demand.spec.ts` | đăng RoomWanted + RoommateWanted → card hiện **field thật**; assert **không** có 7 chuỗi hardcode |
| `moderation.spec.ts` | bật Thủ công → đăng tin → không hiện → admin reject không lý do (bị chặn) → reject có lý do → sửa & gửi lại → approve → hiện |
| `workspace.spec.ts` | tạo khu → phòng → người ở + hợp đồng → phòng `Rented` → ghi điện nước (test cả nhập thấp hơn) → hóa đơn → "Đã thu" |
| `review.spec.ts` | demo link → đánh giá → seller reply → hiện ở `/khu-tro/:slug`; negative: account mới không thấy form |
| `messaging.spec.ts` | **2 browser context**: A gửi → B nhận; BR-030 nút ẩn; BR-019 dùng lại thread |

### Luật
- **`data-testid` là selector duy nhất** — codebase zero `className`. Nếu spec thiếu testid, thêm testid vào component (và đó là DoD của task tạo component, không phải của T29).
- ❌ **Không visual-regression snapshot** — 1.950 inline style + `motion` page transition = flake vô tận.
- Account test: dùng 4 account demo (`06_QA_CHECKLIST.md` §1). Không tạo account mới mỗi lần chạy (Supabase rate limit).

### DoD
- [ ] `pnpm test:e2e` chạy được, 7 spec pass
- [ ] Mỗi spec có ít nhất 1 assertion **negative** (điều kiện fail)
- [ ] Không dùng `waitForTimeout` cố định — dùng `expect(...).toBeVisible()`

---

## T30 — RLS test + QA checklist + README

### Việc
1. **Chạy `supabase/tests/rls.sql`** (đã viết, 9 test). Lấy 4 UUID:
```sql
select id, email from auth.users where email like '%@tronhanh.demo';
```
Thay vào file, chạy trong SQL Editor. **Mọi cột `ok_*` phải `true`.**
Nếu có cột `false` → **đó là lỗ bảo mật thật**, sửa policy trước khi làm gì khác.

2. **Test storage bằng tay** (SQL không làm được) — console browser khi đã login:
```js
await supabase.storage.from('listing-images')
  .upload(`<UUID_NGƯỜI_KHÁC>/x/y.webp`, new Blob(['x']))
// → PHẢI trả lỗi
```

3. **README** — thêm mục:
   - 4 account demo + mật khẩu `TroNhanh@2026`
   - Lệnh setup: `pnpm install` → `.env` → `supabase link` → `db push` → `db:types` → `pnpm dev`
   - **Nhắc TẮT email confirmation**
   - SQL snippet bootstrap Admin
   - Link tới `docs/cp4/00_README_CP4.md`

4. Bổ sung `06_QA_CHECKLIST.md` nếu phát hiện bước còn thiếu khi chạy thật.

### DoD
- [ ] Mọi `ok_*` trong `rls.sql` = `true`
- [ ] Test storage cross-folder bị chặn
- [ ] README có đủ 4 account + lệnh setup + 2 việc làm tay
- [ ] Đã đi qua toàn bộ 5 click-path một lượt

---

## T31 — Rà AC + Nấc B + dọn docs

### 1. Rà Acceptance Criteria
Đi qua **toàn bộ** checklist ở `06_QA_CHECKLIST.md` §5. Mọi ô phải tick thật, không tick theo cảm giác.

### 2. Bật Nấc B — `noImplicitAny: true`
```jsonc
// tsconfig.json
"noImplicitAny": true
```
Dự kiến 150–400 lỗi, ~90% sửa một từ (param của event handler, `.map((x) =>`).

⚠️ **Sửa bằng cách thêm type THẬT**, không phải `: any`. Lúc này service layer đã có nên type thật đều có sẵn.

Nếu quá nhiều → làm từng thư mục: bật cho `src/shared` trước, rồi `marketplace`, rồi `workspace`.

### 3. `build` → `build:ci`
```json
"build": "pnpm typecheck && pnpm typecheck:strict && vite build"
```
Vercel gọi `build`, nên sau bước này CI sẽ chặn type error. **Chỉ làm khi Nấc B đã 0 lỗi**, nếu không bạn tự chặn đường deploy của mình.

### 4. Cập nhật docs
- `05_BUILD_PLAN_CP4.md`: đánh dấu task đã xong
- `02_SCHEMA_DECISIONS.md` §13: kiểm danh sách `demo_*` còn đúng
- `/CLAUDE.md` §2: nếu có thêm shell/thư mục mới, ghi vào **tường minh**
- `HANDOFF_REPORT.md`: cập nhật hoặc archive

### 5. Kiểm cuối trước thuyết trình
`06_QA_CHECKLIST.md` §6.

### DoD
- [ ] Mọi AC ở §5 pass
- [ ] `noImplicitAny: true` với 0 lỗi (hoặc ghi rõ thư mục nào chưa bật và vì sao)
- [ ] Không có `: any` mới được thêm để né lỗi
- [ ] `build` = `build:ci`, Vercel deploy vẫn xanh
- [ ] Docs khớp trạng thái code
- [ ] Video demo 30–60s cho luồng điện nước → VietQR
