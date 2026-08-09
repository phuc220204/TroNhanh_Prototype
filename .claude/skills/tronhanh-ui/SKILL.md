---
name: tronhanh-ui
description: Dựng screen và component mới cho Trọ Nhanh đúng design system (inline style + token từ shared/theme). Dùng khi task cần thêm page, form, modal, table, card, hoặc sửa giao diện. Trigger khi thấy "page mới", "screen", "component", "form", "modal", "UI", "giao diện", "style", "responsive".
---

# Dựng UI cho Trọ Nhanh

## Đọc trước
`docs/cp4/04_FRONTEND_ARCH.md` §7–11 · `/CLAUDE.md` §8

## Luật #1 — Inline style + token, KHÔNG Tailwind

Codebase có ~1.950 inline style object và **zero `className`**. Đây là quyết định đã chốt, không phải nợ kỹ thuật.

```tsx
import { C, font, radius, space } from "../../shared/theme";

<div style={{
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: radius.lg,
  padding: space[4],
  fontFamily: font,
}}>
```

- ✅ Token từ `src/shared/theme.ts` — **nguồn chân lý duy nhất**
- ❌ Không hex literal mới · ❌ không `className` · ❌ không Tailwind · ❌ không thêm biến `--tn-*`
- Màu theo trạng thái: lấy từ `src/shared/utils/statusMaps.ts` (`ROOM_STATUS_META`, `LISTING_META`, `INVOICE_STATUS_META`, `CONTRACT_STATUS_META`) — **không tự map**
- Custom CSS property trong style object cần cast `as React.CSSProperties`

## Luật #2 — Dùng lại component có sẵn, đừng dựng lại

`src/shared/components/common/`: `AppSelect` (dropdown portal) · `FormField` (`Field`) · `ModalShell` · `DemoBanner`
`src/shared/components/`: `BrandLogo` · `ImageWithFallback` · `StyleSection` · `RequireAuth` · `RequireRole` · `MissingEnvScreen`

Cần `Button` / `Badge` / `Card` / `Table` / `EmptyState` / `Pagination` / `Toast` / `Skeleton` mà chưa có → **tạo trong `shared/components/common/`**, không tạo local trong page. Component bị copy-paste lần thứ 2 → chuyển vào `common/`.

## Luật #3 — Split-on-touch

Repo có nhiều file 1.000–2.200 dòng. **Không big-bang refactor.**

- Chỉ tái cấu trúc **vùng bạn phải sửa**
- File > **600 dòng** sau khi sửa → **split là DoD của task này**
- Page **mới** phải < **400 dòng**
- Split thành `pages/TenPage/index.tsx` + 1 file / view

## Luật #4 — Responsive
Dùng `useBreakpoint()` (mobile <768 ≤ tablet <1024 ≤ desktop). **Không viết media query mới.**

## Luật #5 — `data-testid` là DoD, không phải hygiene
Zero `className` ⇒ testid là selector ổn định **duy nhất** cho E2E. Thêm cho mọi element có ý nghĩa nghiệp vụ:
`listing-card` · `listing-card-price` · `demand-post-card` · `moderation-approve-btn` · `review-submit-btn` · `utility-current-input` · `invoice-total` · `vietqr-image`

## Luật #6 — Ba state, không hai
```tsx
if (isPending) return <Skeleton />;
if (isError)   return <ErrorState message={error.message} onRetry={refetch} />;
if (!data?.length) return <EmptyState title="Chưa có dữ liệu" />;
```
❌ **Không bao giờ** fallback sang mock khi DB rỗng (PRD AC#1).

## Luật #7 — Copy tiếng Việt
- Thuật ngữ: **"Người ở"** (Occupancy), **"Người thuê"** (Renter), **"Khu trọ"** (Property), **"Phòng"** (Room). **CẤM từ "Tenant"** ở mọi nơi kể cả UI copy.
- Lỗi: tiếng Việt thân thiện, qua `toUserMessage(e)`. Không lộ stack/SQL.
- Việc chưa làm: ghi rõ version — `[Bản đồ — V1]`, **không** `alert("[Demo]")`.
- Thanh toán giả lập: **bắt buộc** ghi **"(giả lập)"** (AS-002).
- Trạng thái phòng ẩn: **"Đang ẩn / bảo trì"** (không có "Đang sửa" — `Repairing` không tồn tại).

## Luật #8 — Gating READ_ONLY (BR-015)
Dùng `useCanWrite()` — **một chỗ**, không check per-button. READ_ONLY = xem được, nút tạo/sửa/xóa disabled + CTA "Gia hạn để tiếp tục", **không mất dữ liệu**.

## Luật #9 — Guard
- `RequireAuth` cho trang cần đăng nhập · `RequireRole anyOf={[...]}` cho `/quan-tri/*`
- **Không** dùng `ProtectedRoute` (đã thay)
- Guard client **chỉ là UX** — biên thật ở RLS + RPC

## Route mới
kebab-case tiếng Việt, theo convention: `/tin-nhu-cau`, `/dang-tin-nhu-cau`, `/khu-tro/:slug`, `/tin-nhan`, `/tai-khoan/*`, `/chu-tro/*`, `/quan-tri/*`. Bảng đầy đủ ở `04_FRONTEND_ARCH.md` §8.

## Trước khi báo xong
- [ ] Không hex literal mới, không `className`
- [ ] Token từ `shared/theme`; màu trạng thái từ `statusMaps`
- [ ] Page mới < 400 dòng; file đã sửa không vượt 600 dòng
- [ ] Có `data-testid` cho element nghiệp vụ
- [ ] 3 state phân biệt rõ; không mock fallback
- [ ] Kiểm ở 375 / 768 / 1280
- [ ] Không `[Demo]` alert mới; thanh toán ghi "(giả lập)"
- [ ] `pnpm typecheck` 0 lỗi
