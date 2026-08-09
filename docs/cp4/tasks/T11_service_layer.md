# T11a / T11b / T11c — Service layer

**Phụ thuộc:** T04b (generated types), T10 (React Query provider).
**Chặn:** MỌI task Phase 2. Làm cái này trước tiên.
**Skill:** `tronhanh-service`

> Chia 3 PR: **T11a** đọc marketplace · **T11b** đọc workspace (song song được với T11a) · **T11c** ghi + RPC.

## Vì sao
Hiện 9 page tự gọi `supabase.from()` trong `useEffect`, `select("*")` toàn bộ row rồi filter trong memory. CP4 thêm ~12 screen nữa. Không có tầng này thì luật ranh giới shell (`/CLAUDE.md` §2) **không có gì cưỡng chế**.

## Luật cưỡng chế bằng vị trí file
Bảng chỉ được truy cập từ shell sở hữu nó — xem `/CLAUDE.md` §2.1. Một page marketplace **không thể** chạm `properties` nếu hàm duy nhất chạm nó nằm ở `src/workspace/services/`.

**Điểm nối duy nhất được phép:** `shared/services/vacancy-service.ts` (đã có). **Đừng thêm hàm hay field vào file đó.**

---

## T11a — `src/marketplace/services/`

Signature đầy đủ ở `04_FRONTEND_ARCH.md` §4. Tạo:
- `listing-queries.ts` — `searchListings` · `getListingById` · `getFeaturedListings` · `incrementViewCount`
- `listing-mappers.ts` — **nhà mới của `getListingImage`, `mapAmenityToKey`, `mapTypeToKey`** (hiện đang export từ `AllListingsPage.tsx` — một page! — và bị HomePage/SearchResults import). Thêm `toListingCard(row)` và `listingImageUrls(row)` (ưu tiên `listing_media`, fallback Unsplash deterministic cho row cũ).
- `shared/utils/catalog-bounds.ts` — parse label `PRICE_RANGES`/`AREA_RANGES` thành số, **để cả 3 trang danh sách đồng ý với nhau** thay vì mỗi trang tự parse.

**Chỗ bug "filter ở client" chết:**
```ts
let q = supabase.from("rental_listings")
  .select("*, listing_amenities(amenity), listing_media(storage_path, sort_order)", { count: "exact" })
  .eq("status", "Active").is("deleted_at", null);

if (f.districts?.length)   q = q.in("district", f.districts);
if (f.priceMin != null)    q = q.gte("price", f.priceMin);
if (f.priceMax != null)    q = q.lte("price", f.priceMax);
if (f.keyword)             q = q.ilike("title", `%${f.keyword}%`);
// BR-005 — LUÔN theo đúng thứ tự này
q = q.order("boost_expire_at", { ascending: false, nullsFirst: false })
     .order("created_at", { ascending: false })
     .range(from, to);
```
Amenities filter: `listing_amenities!inner(amenity)` + `.in("listing_amenities.amenity", f.amenities)`.

Rồi chuyển `AllListingsPage`, `SearchResultsPage`, `HomePage`, `RoomDetailPage` sang dùng hook (`marketplace/hooks/useListingSearch.ts`, …). **Không sửa cấu trúc các page này** — chỉ đổi tầng data (split-on-touch).

**DoD T11a:** không page nào `select("*")`-rồi-filter · boost xếp trước verify được với ≥25 row seed · trang 2 hoạt động · **không page nào import từ page khác**.

---

## T11b — `src/workspace/services/` (song song với T11a)

`property-service.ts` · `room-service.ts` · `contract-service.ts` · `billing-service.ts` (read paths) · `dashboard-service.ts`

Dashboard đếm số bằng `select("*", { count: "exact", head: true })` — **không** tải row về rồi `.length`.

Giữ BR-012: "Phòng trống" luôn hiện, "Tổng phòng"/"Đang thuê" **mặc định ẩn**.

**DoD T11b:** KPI từ `count: exact, head: true` · BR-012 giữ nguyên · `QuanLyPhongPage` + `ChuTroDashboardPage` read path đi qua service.

---

## T11c — Mutation + RPC wrapper

`marketplace/services/listing-mutations.ts` · `workspace/services/{occupancy,billing}-service.ts` (write paths)

Bọc 16 RPC đã có (xem `03_RPC_CONTRACTS.md`). Ví dụ:
```ts
export async function createListing(input: ListingFormInput): Promise<string> {
  return withErrorHandling("listing-mutations.createListing", async () => {
    const { data, error } = await supabase.rpc("create_listing_with_details", {
      p_listing: buildListingPayload(input),   // KHÔNG chứa seller_id / status
      p_amenities: input.amenities,
      p_media: input.media,
      p_submit: true,
    });
    if (error) throw error;
    return data as string;
  });
}
```

⚠️ **Không truyền `seller_id`, `owner_id`, `status`, `total_amount`, `previous_reading`, `unit_price`** — RPC đã derive server-side. Thêm param cho chúng = mở lỗ bảo mật.

Rồi rewire write path của `DangTinPage` và `QuanLyPhongPage`.

**DoD T11c:** tạo tin / hóa đơn / payment là **một** lời gọi RPC · inject một `raise exception` giữa RPC → verify không để lại trạng thái lệch ở bảng nào.

---

## Cách test (cả 3)
```bash
pnpm typecheck && pnpm typecheck:strict
grep -rn "supabase\.from(" src/marketplace/pages src/workspace/pages   # phải rỗng
grep -rn "queryKey: \[" src | grep -v "qk\."                          # phải rỗng
```
Rồi đi luồng 1 và luồng 5 trong `06_QA_CHECKLIST.md` §3.
