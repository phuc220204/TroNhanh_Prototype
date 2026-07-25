# T08 — Hợp nhất token + 8 UI primitive

**Phụ thuộc:** không.
**Chặn:** T09 (cần `EmptyState`) và mọi screen mới ở Phase 2.
**Skill:** `tronhanh-ui`

## Mục tiêu
Không phải "dọn cho đẹp". Không có bước này, **12 page mới mỗi cái tự mọc một block style 200 dòng** và 3 tháng sau lại có 4 bộ token.

## Phần A — Hợp nhất token (zero thay đổi hình ảnh)

Điểm chốt đã xác minh: **không gì consume các giá trị xung đột.**

1. ✅ `src/shared/theme.ts` đã được mở rộng (`error`, `warning`, `success`, `deposited`, `radius`, `space`) — **đã làm ở phần bàn giao**.
2. **Xóa toàn bộ block `--tn-*` trong `src/styles/theme.css`.** Đã verify: reference `--tn-` duy nhất trong component là `--tn-brand-logo-color` (`BrandLogo.tsx:46`, `LandlordShell.tsx:166`) — biến truyền **local** kèm fallback inline, **không định nghĩa trong theme.css**. Nên cả 24 khai báo là dead. **Xóa, đừng "hòa giải giá trị"** — không có gì để hòa giải.
3. **`StyleGuidePage.tsx`: xóa `C` local (dòng ~20-35), import từ `../../shared/theme`.** Styleguide khi đó *chứng minh* token thay vì mâu thuẫn với nó (nó đang document màu primary `#8A6A45` mà app không dùng).
4. **Giữ** block `--primary`/oklch của shadcn trong `theme.css` và giữ `tailwind.css` + 2 vite plugin — `vite.config.ts` ghi rõ template Make cần chúng, và chúng vô hại.

> `/styleguide` là **bài test hồi quy nhìn thấy được**: nếu nó còn đúng sau bước 3, merge token sạch.

## Phần B — 8 primitive trong `src/shared/components/common/`

Tất cả: typed, inline style, token từ `shared/theme`, có `data-testid` prop.

| Component | API tối thiểu |
|---|---|
| `Button.tsx` | `variant: "primary" \| "ghost" \| "danger"`, `size: "sm" \| "md"`, `disabled`, `loading`, `fullWidth` |
| `Badge.tsx` | `status` + `kind: "room" \| "listing" \| "invoice" \| "contract"` → **lấy màu/nhãn từ `statusMaps.ts`**, không tự map |
| `Card.tsx` | `padding?`, `hoverable?`, `onClick?` |
| `Table.tsx` | `columns: {key,label,width}[]`, `rows`, `renderCell`, `emptyState?` |
| `EmptyState.tsx` | `title`, `description?`, `action?`, `icon?` |
| `Pagination.tsx` | `page`, `pageSize`, `total`, `onChange` |
| `Toast.tsx` | `message`, `variant: "success" \| "error"`, tự ẩn sau 2.5s |
| `Skeleton.tsx` | `variant: "card" \| "row" \| "text"`, `count?` |

Nhập cùng `AppSelect` / `FormField` / `ModalShell` đã có. Mỗi file < 120 dòng.

## Cách test
1. `pnpm typecheck` + `pnpm typecheck:strict` = 0
2. `grep -rn "\-\-tn\-" src` → chỉ còn `--tn-brand-logo-color`
3. Mở `/styleguide` → **giao diện giống hệt trước**, và grep file đó không còn hex literal
4. Chụp trước/sau 5 route: `/`, `/tat-ca-phong`, `/phong/:id`, `/chu-tro`, `/styleguide` → giống nhau
5. Render thử cả 8 primitive trên `/styleguide` (thêm một `StyleSection` mới)

## DoD
- [ ] `grep -rn "\-\-tn\-primary" src` = 0
- [ ] `StyleGuidePage` không còn `C` local, không còn hex literal
- [ ] 8 primitive tồn tại, mỗi file < 120 dòng, đều dùng token
- [ ] `Badge` lấy nhãn/màu từ `statusMaps`, không hardcode
- [ ] 5 route trông giống trước
- [ ] typecheck + strict = 0
