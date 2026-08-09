---
name: tronhanh-service
description: Viết service layer, React Query hook, và truy cập dữ liệu cho Trọ Nhanh đúng ranh giới shell. Dùng khi task cần fetch/mutate dữ liệu Supabase, thêm hàm service, hoặc viết hook. Trigger khi thấy "service", "hook", "fetch", "query", "mutation", "React Query", "supabase.from", "useQuery".
---

# Viết service & hook cho Trọ Nhanh

## Đọc trước
`docs/cp4/04_FRONTEND_ARCH.md` §4–6 · `/CLAUDE.md` §2, §6, §7, §8

## ⚠️ Luật #1 — Ranh giới shell, cưỡng chế bằng vị trí file

**Không page nào được gọi `supabase.from()` trực tiếp.** Mọi truy cập DB đi qua service đặt trong shell **sở hữu** bảng đó:

| Bảng | Chỉ được truy cập từ |
|---|---|
| `properties` `rooms` `occupancies` `contracts` `utility_readings` `invoices` `invoice_items` `payments` | `src/workspace/services/` |
| `rental_listings` `listing_amenities` `listing_media` `demand_posts` `reviews` | `src/marketplace/services/` |
| `profiles` `user_roles` `conversations` `messages` `user_subscriptions` `platform_settings` | `src/shared/services/` |
| `moderation_logs` + RPC moderator | `src/admin/services/` |

Đây là lý do một page marketplace **không thể** chạm bảng workspace: hàm duy nhất chạm `properties` nằm ở shell khác.

**Điểm nối duy nhất được phép:** `src/shared/services/vacancy-service.ts` → `getMyVacantRoomSummaries()`, trả **đúng** `{ roomId, propertyName, district, price, area }`. **Không thêm field, không thêm hàm vào file đó.** Cần crossing khác → làm server-side trong RPC.

## Luật #2 — Khuôn của một service

```ts
import { supabase } from "../../shared/supabaseClient";
import { withErrorHandling } from "../../shared/services/supabase-error";

export async function searchListings(f: ListingFilters): Promise<Paged<ListingCard>> {
  return withErrorHandling("listing-queries.searchListings", async () => {
    const { data, error, count } = await supabase.from("rental_listings")...;
    if (error) throw error;
    return { items: (data ?? []).map(toListingCard), total: count ?? 0 };
  });
}
```

- **Không bao giờ `import React`** trong service → unit-test được, dùng lại được từ seeder.
- Luôn bọc `withErrorHandling` — nó lo `try/catch`, log, và dịch lỗi sang tiếng Việt.
- Trả **domain shape**, không trả row thô. Mapper riêng (`listing-mappers.ts`).
- Tên file `kebab-case`. Tên hàm bắt đầu bằng động từ.

## Luật #3 — Filter/sort/paginate ở SERVER, không ở client

Code cũ `select("*")` rồi filter trong memory. **Không lặp lại.**

```ts
let q = supabase.from("rental_listings")
  .select("*, listing_amenities(amenity)", { count: "exact" })
  .eq("status", "Active").is("deleted_at", null);

if (f.districts?.length) q = q.in("district", f.districts);
if (f.priceMin != null)  q = q.gte("price", f.priceMin);
if (f.keyword)           q = q.ilike("title", `%${f.keyword}%`);

// BR-005: boost còn hạn xếp trước — LUÔN theo thứ tự này
q = q.order("boost_expire_at", { ascending: false, nullsFirst: false })
     .order("created_at", { ascending: false })
     .range(from, to);
```

Dashboard đếm số: `select("*", { count: "exact", head: true })` — **không** tải row về rồi `.length`.

Parse label khoảng giá/diện tích bằng `src/shared/utils/catalog-bounds.ts`, không tự parse ở từng page.

## Luật #4 — Ghi đa bảng phải qua RPC

```ts
const { data, error } = await supabase.rpc("create_occupancy_with_contract", {
  p_room_id: roomId, p_occupant: occupant, p_contract: contract,
});
```

**Không** chuỗi `await` tuần tự cho nhiều bảng. Xem `docs/cp4/03_RPC_CONTRACTS.md` để biết 14 RPC có sẵn.
Không truyền `owner_id`/`seller_id`/`status`/`total_amount` — RPC tự derive.

## Luật #5 — React Query

- Key **luôn** lấy từ `src/shared/query/keys.ts` (`qk.listings.search(f)`). **Không tự viết key string** — hai file cùng fetch một thứ với 2 key khác nhau = cache không bao giờ invalidate, và bug đó im lặng.
- Hook là wrapper mỏng, đặt ở `src/<shell>/hooks/`:

```ts
export function useListingSearch(f: ListingFilters) {
  return useQuery({ queryKey: qk.listings.search(f), queryFn: () => searchListings(f) });
}
```

- Sau mutation: `queryClient.invalidateQueries({ queryKey: qk.listings.all })`.
- **Phân biệt 3 state:** `isPending` (skeleton) / `isError` (thông báo lỗi + nút thử lại) / `data.length === 0` (`EmptyState`).

## ⚠️ Luật #6 — DB rỗng KHÔNG được fallback sang mock

PRD AC#1. DB rỗng → `EmptyState`, **không** trả mock data. Nếu thấy pattern `dbRooms.length > 0 ? dbRooms : MOCK`, xóa nó.

## Bẫy đã biết
- **`profiles` khoá theo `user_id`, KHÔNG phải `id`.** `profiles.id` là uuid độc lập. Đây là bug T01 #1.
- `rooms` có `room_code`, **không** có `code`.
- `rental_listings.status` không có `Inactive`; `rooms.status` không có `Repairing`.

## Không dùng console
`console.*` chỉ được phép trong `supabase-error.ts`. Cần log → `logError(scope, e)`.

## Trước khi báo xong
- [ ] Không page nào gọi `supabase.from()` trực tiếp
- [ ] Service không import React
- [ ] Mọi service bọc `withErrorHandling`
- [ ] Filter/sort/paginate ở server, không ở memory
- [ ] Query key lấy từ `keys.ts`
- [ ] Ghi đa bảng qua RPC
- [ ] Không mock fallback; DB rỗng → EmptyState
- [ ] `pnpm typecheck` và `pnpm typecheck:strict` đều 0 lỗi
