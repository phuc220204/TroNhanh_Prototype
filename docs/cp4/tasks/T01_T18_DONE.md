# T01–T18 — ĐÃ HOÀN THÀNH (ghi lại để tra cứu)

> Phần này do Claude Code làm trong phiên bàn giao. **Không cần làm lại.**
> Chi tiết đầy đủ + cạm bẫy: `../HANDOFF_REPORT.md`

---

## Đã xong hoàn toàn

| # | Việc | Bằng chứng |
|---|---|---|
| **T01** | Sửa **7** bug chặn luồng (nhiều hơn 5 dự kiến) | `pnpm typecheck` 0 lỗi |
| **T02** | Xóa **51 file** + ~30 dependency | `pnpm build` xanh, trang chủ render đúng |
| **T03** | `tsconfig.json` Nấc A + `tsconfig.strict.json` Nấc D + scripts | `typecheck` & `typecheck:strict` đều 0 |
| **T05** | Migration `0100_status_lifecycle` + `0200_indexes` | file tồn tại |
| **T07** | Migration `0400_roles_moderation` — `user_roles`, 5 definer helper, `platform_settings`, `moderation_logs` | file tồn tại |
| **T13** | Migration `0800_listing_media` + bucket + 4 storage policy | file tồn tại |
| **T14** | Migration `0600_demand_posts` +15 cột + backfill `title` | file tồn tại |
| **T15** | Migration `0700_messaging` + trigger unread + Realtime | file tồn tại |
| **T16** | Migration `0500_reviews` + `can_review_contract` + view public + trigger rating | file tồn tại |
| **T17** | Migration `0900` + `0900b` — **16 RPC** | file tồn tại |

## Xong một phần — phần còn lại có task riêng

| # | Đã làm | Còn thiếu → task |
|---|---|---|
| **T04** | scripts `db:push`/`db:types` | chạy CLI + `Database` generic → **`T04b`** |
| **T06** | migration `0300` + backfill | client ngừng ghi marker → nằm trong **`T20`** |
| **T08** | `theme.ts` mở rộng (`error`/`warning`/`success`/`radius`/`space`) | xóa `--tn-*`, StyleGuide, 8 primitive → **`T08`** |
| **T09** | `supabase-error.ts` (27 error code + `withErrorHandling`) | xóa 4 mock fallback → **`T09`** |
| **T10** | `query/keys.ts`, `query/queryClient.ts`, `AuthContext` + `roles` | provider, `SubscriptionContext`, xóa CustomEvent → **`T10`** |
| **T12** | `RequireAuth.tsx`, `RequireRole.tsx`, `MissingEnvScreen.tsx` | router + ~20 route + 2 shell → **`T12`** |
| **T18** | `1000_demo_helpers` (2 hàm demo) | seeder v2 + nút DemoFAB → nằm trong **`T26`** |

## File mới đã tạo

**SQL** (`supabase/`)
```
migrations/20260725100100_status_lifecycle.sql
migrations/20260725100200_indexes.sql
migrations/20260725100300_listing_metadata.sql
migrations/20260725100400_roles_moderation.sql
migrations/20260725100500_reviews.sql
migrations/20260725100600_demand_posts.sql
migrations/20260725100700_messaging.sql
migrations/20260725100800_listing_media.sql
migrations/20260725100900_rpcs_core.sql
migrations/20260725101000_rpcs_features.sql
migrations/20260725101100_demo_helpers.sql
tests/rls.sql
```

**TypeScript** (`src/`)
```
shared/services/supabase-error.ts     ← nơi DUY NHẤT được console.*
shared/services/vacancy-service.ts    ← điểm nối duy nhất được phép + scoreDemandMatch
shared/query/keys.ts                  ← key factory, đừng tự viết key string
shared/query/queryClient.ts
shared/components/RequireAuth.tsx
shared/components/RequireRole.tsx
shared/components/MissingEnvScreen.tsx
```

**Config**
```
tsconfig.json · tsconfig.strict.json · .claude/launch.json
package.json (viết lại) · vite.config.ts (bỏ figmaAssetResolver)
```

**Tài liệu**
```
/CLAUDE.md
docs/cp4/00_README_CP4.md → 07_RISKS.md
docs/cp4/HANDOFF_REPORT.md
.claude/skills/tronhanh-{schema,service,ui,qa}/SKILL.md
```

## File đã sửa
`src/App.tsx` · `src/main.tsx` · `src/shared/config.ts` · `src/shared/theme.ts` · `src/shared/contexts/AuthContext.tsx` · `src/shared/components/LandlordShell.tsx` · `src/shared/components/ProtectedRoute.tsx` · `src/marketplace/pages/DangTinPage.tsx` · `src/workspace/pages/QuanLyPage.tsx` · `src/workspace/pages/QuanLyPhongPage.tsx` · `src/workspace/pages/ChuTroDashboardPage.tsx` · `src/styles/tailwind.css`

## File đã xóa (51)
`src/shared/components/ui/**` (48) · `src/shared/components/HomeFilter.tsx` · `src/shared/data/mockListings.ts` · `default_shadcn_theme.css`
→ đều git-tracked, `git checkout <path>` lấy lại được.

---

## ⚠️ Chưa verify được (giới hạn môi trường)
- Migration **chưa apply** — chưa chạy qua Postgres thật
- **16 RPC chưa được gọi lần nào**
- `rls.sql` chưa chạy (cần 4 UUID thật)
- Sandbox không có mạng ra ngoài → xác nhận được **app render + build**, không xác nhận được luồng dữ liệu

**Việc đầu tiên của bạn:** `supabase db push` và đọc lỗi kỹ.
