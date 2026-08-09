# T09 — Xóa mọi mock fallback + áp error layer

**Phụ thuộc:** T08 (cần `EmptyState`, `Skeleton`), T04b.
**Skill:** `tronhanh-service`

## Vì sao
PRD AC#1: *"Thao tác của user ghi/đọc dữ liệu thật, không mock cứng trong code."* Hiện có **4 chỗ vi phạm** — chúng khiến DB rỗng trông như DB có data, nên bug "không đọc được dữ liệu" bị che hoàn toàn.

## Bốn chỗ phải xóa

| File | Dòng | Hiện tại |
|---|---|---|
| `marketplace/pages/HomePage.tsx` | 1219-1221 | `dbRooms.length > 0 ? dbRooms : FEATURED_ROOMS` (+ 2 dòng tương tự cho demand post) |
| `workspace/pages/QuanLyPhongPage.tsx` | ~1898 | load `INIT_PROPERTIES` khi user chưa có property thật |
| `workspace/pages/ChuTroDashboardPage.tsx` | 643, 653 | fallback `PROPERTIES` / `PREVIEW_ROOMS` từ `mockLandlord.ts` |

Thay bằng 3 state phân biệt rõ:
```tsx
if (isPending)      return <Skeleton variant="card" count={4} />;
if (isError)        return <ErrorState message={toUserMessage(error)} onRetry={refetch} />;
if (!data?.length)  return <EmptyState title="Chưa có tin đăng nào" description="..." action={...} />;
```

**Quan trọng:** `EmptyState` cho chủ trọ chưa có khu phải có CTA *"Tạo khu trọ đầu tiên"* — nếu không, xóa mock biến trang thành màn trắng và trải nghiệm còn tệ hơn trước.

## Xóa file mock không còn dùng
Sau khi 4 chỗ trên sạch: `shared/data/mockLandlord.ts` và `shared/data/mockProperties.ts` có thể còn được dùng cho **type** (`Room`, `Property`, `Occupant`, `Contract`, `Bill`). Nếu vậy:
- Chuyển các `interface` sang `src/workspace/types/room.ts`
- Xóa phần data (`INIT_PROPERTIES`, `PROPERTIES`, `PREVIEW_ROOMS`)

`dbSeeder.ts` **giữ lại** — đó là cách seed data thật, không phải mock trong component.

## Áp error layer
Mọi `catch` trong page → `toUserMessage(e)` từ `shared/services/supabase-error.ts`. Xóa ~40 `console.error` còn lại.

```bash
grep -rn "console\." src --include=*.ts --include=*.tsx | grep -v "supabase-error.ts"
# phải rỗng
```

## Cách test
1. Login bằng một account **hoàn toàn mới** (chưa seed gì) → `/` hiện `EmptyState`, **không** hiện 4 phòng giả
2. `/chu-tro` hiện `EmptyState` + CTA "Tạo khu trọ đầu tiên", không hiện 3 khu giả
3. Ngắt mạng → mọi trang hiện thông báo lỗi **tiếng Việt**, không phải màn trắng hay chữ tiếng Anh
4. `grep -rn "FEATURED_ROOMS\|INIT_PROPERTIES\|ROOM_WANTED_POSTS\|PREVIEW_ROOMS" src` → chỉ còn file định nghĩa (hoặc 0)

## DoD
- [ ] 4 fallback đã xóa
- [ ] Account mới thấy `EmptyState` kèm CTA có nghĩa, không thấy data giả
- [ ] `grep console.` chỉ ra `supabase-error.ts`
- [ ] 3 state (`isPending`/`isError`/rỗng) phân biệt rõ ở mọi trang đã sửa
- [ ] typecheck + strict = 0
