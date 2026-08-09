# Build Plan CP4 — 31 task

> Mỗi task = **1 phiên agent ≈ 1 PR**. File task ở `tasks/T<xx>_*.md`, tự chứa.
> `⇄` = chạy song song được với sibling cùng nhóm.
> DoD chung của mọi task: xem `/CLAUDE.md` §12.

**Trạng thái:** T01–T18 **đã hoàn thành** (Claude Code). T19–T31 giao cho Agent tiếp theo.
Xem `HANDOFF_REPORT.md` để biết chính xác cái gì đã xong.

---

## Phase 0 — Hardening ✅ HOÀN THÀNH

Chặn tất cả phần dưới. Lý do làm trước: repo không có type-check nào, và 3 lệnh ghi đang vi phạm CHECK constraint.

| # | Task | Trạng thái |
|---|---|---|
| **T01** ⇄ | Sửa bug chặn luồng: `profiles.eq("id")`→`user_id` ×2 · `Inactive`→`Hidden` · bỏ `Repairing` · `justifyinit` · `config.ts` fail-soft · `rooms.code`→`room_code` · `rooms.description` | ✅ |
| **T02** ⇄ | Xóa dead code: 48 file `shared/components/ui/**` + `HomeFilter.tsx` + `mockListings.ts` + `default_shadcn_theme.css` + `figmaAssetResolver` + ~30 dependency; `react`/`react-dom` → `dependencies` | ✅ 51 file |
| **T03** | `tsconfig.json` Nấc A + `tsconfig.strict.json` Nấc D + scripts | ✅ 0 lỗi |
| **T04** | Supabase CLI init/link + `db:types` + `Database` generic + `types/db.ts` | ⚠️ **cần chạy CLI** |
| **T05** ⇄ | Migration `0100` status/lifecycle + `0200` indexes | ✅ file viết xong |
| **T06** ⇄ | Migration `0300` metadata → cột + backfill; client ngừng ghi marker | ⚠️ SQL xong, client chưa |
| **T07** ⇄ | Migration `0400` roles + `platform_settings` + `moderation_logs` + 7 definer helper | ✅ |
| **T08** | Hợp nhất token + 8 primitive | ⚠️ token xong, primitive chưa |
| **T09** | Error/logging layer + xóa mọi mock fallback | ⚠️ layer xong, fallback chưa |
| **T10** | React Query + key factory + `SubscriptionContext` + `AuthContext.roles` | ⚠️ một phần |
| **T11a** | Service đọc marketplace + filter/sort/paginate **về server** | ❌ |
| **T11b** ⇄ | Service đọc workspace + dashboard counts | ❌ |
| **T11c** | Service ghi + wrapper RPC | ❌ |
| **T12** | Router: `RequireAuth` + `RequireRole` + `RenterShell` + scaffold `/quan-tri` `/tai-khoan` + chuyển `QuanLyPage` sang marketplace | ⚠️ guard xong, router chưa |

## Phase 1 — Schema tính năng mới ✅ SQL HOÀN THÀNH

T13–T16 song song được sau T07.

| # | Task | Trạng thái |
|---|---|---|
| **T13** ⇄ | Migration `0800` `listing_media` + bucket `listing-images` + 4 storage policy | ✅ |
| **T14** ⇄ | Migration `0600` `demand_posts` +15 cột + backfill `title` | ✅ |
| **T15** ⇄ | Migration `0700` `conversations`/`messages` + trigger unread + Realtime | ✅ |
| **T16** ⇄ | Migration `0500` `reviews` + `occupancies.link_status` + view `property_public_profiles` + trigger rating + `can_review_contract` | ✅ |
| **T17** | Migration `0900`+`0900b` — 14 RPC | ✅ |
| **T18** | Migration `1000` demo helper + seeder v2 | ⚠️ RPC xong, seeder chưa |

## Phase 2 — 5 luồng + 4 extras ❌ CHƯA LÀM (giao Agent tiếp)

| # | Task | Luồng | Phụ thuộc |
|---|---|---|---|
| **T19** | **Upload ảnh thật** — `media-service.ts` (compress→upload→`listing_media`), split `DangTinPage` thành `steps/*`, render `listing_media` ở Home/All/Search/Detail, bỏ `URL.createObjectURL` | extra 1 + luồng 1 | T13 |
| **T20** | **Sửa tin đăng** `/dang-tin-cho-thue/:id` — stepper edit mode, media add/remove/reorder, BR-003 re-duyệt, thay 2 `[Demo]` alert | extra 3 | T19 |
| **T21** ⇄ | **Kiểm duyệt** — `AdminShell` + `/quan-tri/kiem-duyet-tin` + badge Rejected + lý do + "Sửa & gửi lại" + toggle auto-approve | luồng 4b | T17, T12 |
| **T22** ⇄ | **Demand post thật** — `/dang-tin-nhu-cau` (2 lựa chọn), `/tin-nhu-cau` + `:id`, `/tai-khoan/tin-nhu-cau`, **xóa mọi field hardcode** trong `DemandPostCard` | luồng 2+3 | T14 |
| **T23** | **Chủ trọ ↔ demand matching** — `/chu-tro/tim-nguoi-thue`, dùng `vacancy-service` + `scoreDemandMatch` | luồng 4c | T22, T25 |
| **T24** ⇄ | **Occupancy + Hợp đồng** — `OccupantsView` ghi được, RPC #4, BR-027 sync tin | extra 4 + luồng 5 | T17 |
| **T25** ⇄ | **Nhắn tin** — `/tin-nhan` inbox + thread + unread + Realtime, wire CTA ở `/phong/:id` và demand card | extra 2 | T15 |
| **T26** | **Review** — `/tai-khoan/phong-cua-toi`, modal đánh giá, `/khu-tro/:slug`, badge rating, `/chu-tro/danh-gia` reply, `/quan-tri/kiem-duyet-danh-gia` | luồng 4a | T16, T17, T24, T18 |
| **T27** | **Polish quản lý khu/phòng** — form cấu hình bank+đơn giá, `/chu-tro/hoa-don`, audit READ_ONLY qua `useCanWrite()` | luồng 5 | T11b, T10 |
| **T28** ⇄ | Dẹp mọi `[Demo]` alert còn lại; "Lưu nháp" → `Draft` thật; map toggle → `[Bản đồ — V1]` | — | T20 |

## Phase 3 — Verification 🟡 ĐANG LÀM (cập nhật 2026-08-08)

| # | Task | Trạng thái |
|---|---|---|
| **T29** | Playwright + `playwright.config.ts` + 7 spec (30 test) ở `tests/e2e/` | ✅ **đã viết, CHƯA CHẠY** — cố ý: T32 phần 2 phải xong trước, xem ghi chú dưới |
| **T30-1** | Chạy `supabase/tests/rls.sql` trong SQL Editor | ❌ chủ dự án — cần dữ liệu `seller.a` trước |
| **T30-2** | Test storage cross-folder qua console | ❌ chủ dự án |
| **T30-3** | README: 4 account demo · lệnh setup · tắt email confirmation · SQL bootstrap Admin | ✅ |
| **T31-1** | Rà toàn bộ AC ở `06_QA_CHECKLIST.md` §5 | ❌ chủ dự án |
| **T31-2** | Bật Nấc B `noImplicitAny` | ✅ — **chỉ 7 lỗi**, không phải 150–400 |
| **T31-3** | `build` = `build:ci` (chặn type error ở Vercel) | ✅ |
| **T31-4** | Dọn docs (`05_BUILD_PLAN`, `02_SCHEMA_DECISIONS` §13, `04_FRONTEND_ARCH`) | ✅ |
| **T31-5** | Video demo 30–60s luồng điện nước → VietQR | ❌ chủ dự án |

> ⚠️ **T32 phần 2 phải chạy TRƯỚC `pnpm test:e2e`.** Bộ E2E tạo khu trọ, phòng,
> tin đăng và tin nhắn. Chạy nó trước khi đi hết `09_T32_CHECKLIST_DB_TRONG.md`
> là mất vĩnh viễn cơ hội kiểm "trải nghiệm người dùng đầu tiên trên hệ thống
> trống" — trạng thái đó không dựng lại được sau khi đã có dữ liệu.

> `data-testid` là DoD của **từng task Phase 2**, không dồn về T29. Thực tế T29
> vẫn phải bổ sung testid cho form đăng nhập / đăng ký / tin nhu cầu / ghi chỉ số
> và menu tài khoản — chúng chưa từng có.

---

## Phụ thuộc & song song

```
GĐ0 (T01→T12) ✅ → GĐ1 (T13→T18) ✅ → GĐ2 (T19→T28) → GĐ3 (T29→T31)
```

**Song song:** `T21 ‖ T22 ‖ T24 ‖ T25` (đều chỉ cần T17 + guard, đã xong)
**Chuỗi:** `T19 → T20 → T28` · `T22 → T23` · `T24 → T26`

**Đường tới hạn còn lại:** `T24 → T26` (review cần occupancy Confirmed để test được).

**Khuyến nghị thứ tự cho Agent tiếp theo:**
1. `T11a` + `T11b` + `T11c` (service layer — mọi task Phase 2 đều cần)
2. `T12` (router + scaffold — mọi route mới cần)
3. Rồi song song: `T19`, `T22`, `T24`, `T25`
4. `T21`, `T26`, `T23`, `T20`, `T27`, `T28`
5. `T29`–`T31`

---

## Nếu thiếu thời gian

**Tối thiểu vẫn mạch lạc:** T19 (ảnh), T22 (demand post), T24 (occupancy), T25 (nhắn tin).
**Cắt:** `/chu-tro/hoa-don` trong T27; bật Nấc B trong T31.
**KHÔNG cắt:** T21 (kiểm duyệt) và T26 (review) — 2/3 nghĩa của luồng 4, và là 2 thứ ấn tượng nhất khi demo.
