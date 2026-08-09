# T04b — Generated Supabase types + `Database` generic

**Phụ thuộc:** đã chạy `supabase db push` thành công.
**Chặn:** T11a, T11b, T11c và mọi task Phase 2.

## Mục tiêu
Biến mọi query từ `any` thành typed. Đây là thứ khiến `.eq("id", user.id)` trên `profiles` và `status: "Inactive"` thành **lỗi biên dịch** thay vì bug im lặng.

## Việc
1. Chạy `pnpm db:types` → sinh `src/shared/types/database.types.ts`. Thêm header comment: *generated, không sửa tay*.
2. Tạo `src/shared/types/db.ts`:
```ts
import type { Database } from "./database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type RentalListingRow = Tables<"rental_listings">;
export type ListingMediaRow  = Tables<"listing_media">;
export type DemandPostRow    = Tables<"demand_posts">;
export type ReviewRow        = Tables<"reviews">;
export type PropertyRow      = Tables<"properties">;
export type RoomRow          = Tables<"rooms">;
export type OccupancyRow     = Tables<"occupancies">;
export type ContractRow      = Tables<"contracts">;
export type InvoiceRow       = Tables<"invoices">;
export type ConversationRow  = Tables<"conversations">;
export type MessageRow       = Tables<"messages">;
/** ⚠️ profiles.id là uuid ĐỘC LẬP. Auth id nằm ở profiles.user_id. */
export type ProfileRow       = Tables<"profiles">;
```
3. `src/shared/supabaseClient.ts` → `createClient<Database>(config.supabase.url, config.supabase.anonKey, { auth: { persistSession: true, autoRefreshToken: true } })`.
4. Chạy `pnpm typecheck`. **Sẽ ra lỗi mới** — đó là điều tốt, type mới làm lộ bug cũ. Sửa chúng, **đừng nới `tsconfig`**.
5. Thêm `database.types.ts` vào `.gitignore`? **KHÔNG** — commit nó, để người khác không phải có CLI mới build được.

## Cách test
```bash
pnpm db:types && pnpm typecheck
```
Rồi thử cố tình viết sai để xác nhận generic đang hoạt động:
```ts
await supabase.from("rental_listings").update({ status: "Inactive" }).eq("id", x);
// ↑ PHẢI là lỗi biên dịch
await supabase.from("profiles").select("*").eq("nonexistent_col", 1);
// ↑ PHẢI là lỗi biên dịch
```

## DoD
- [ ] `pnpm db:types` chạy được, file được commit
- [ ] `supabaseClient` dùng `createClient<Database>`
- [ ] `types/db.ts` tồn tại với alias
- [ ] 2 đoạn code sai ở trên đều **không** biên dịch được
- [ ] `pnpm typecheck` = 0, `pnpm typecheck:strict` = 0
