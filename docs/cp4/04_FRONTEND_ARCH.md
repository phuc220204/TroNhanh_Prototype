# Frontend Architecture — CP4

---

## 1. TypeScript — 4 nấc, CP4 nhận Nấc A + Nấc D

Repo **không có `tsconfig.json`** và **`typescript` chưa được cài**. ~11k dòng `.tsx` chưa từng được type-check (esbuild chỉ strip type).

> **Không cố `strict: true` ngay.** Sẽ ra hàng trăm lỗi và task đầu tiên biến thành cuộc dọn dẹp vô hạn.

### Nấc A — `tsconfig.json` (adopt ngay, phải về 0 lỗi)
```jsonc
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx", "module": "ESNext", "moduleResolution": "bundler",
    "types": ["vite/client"],
    "noEmit": true, "isolatedModules": true, "skipLibCheck": true,
    "allowJs": false,
    "resolveJsonModule": true, "forceConsistentCasingInFileNames": true,
    "baseUrl": ".", "paths": { "@/*": ["./src/*"] },

    "strict": false,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src", "vite.config.ts"]
}
```

**Nấc A đã đáng giá ngay dù `strict:false`**, vì nó bắt được:
1. **CSS property vô nghĩa trong `style={{}}`** — đúng là `justifyinit` ở `ProtectedRoute.tsx:22`, trên 1.950 style object chưa từng được check.
2. Props component sai.
3. Sau khi có `Database` generic (§2): **tên bảng sai, tên cột sai, status string bất hợp pháp** — tức chính xác 3 bug đang hỏng demo.

### Nấc B → D (không chặn CP4)
| Nấc | Flag | Khi nào | Vì sao thứ tự đó |
|---|---|---|---|
| B | `noImplicitAny: true` | **sau** khi có service layer | Để cách sửa là "thêm type thật", không phải "thêm `: any`". Dự kiến 150–400 lỗi, ~90% sửa 1 từ. |
| C | `strictNullChecks: true` | **sau** khi mọi page đọc qua `src/*/services/` | Với generated types, mọi `data` là `T[] | null`. Làm sau thì nullability co lại còn ~40 hàm service thay vì rải khắp 9 page. **Đây là flag sẽ ra "hàng trăm lỗi" nếu làm trước.** |
| D | `strict: true` cho **code mới** | **CP4, cùng Nấc A** | `tsconfig.strict.json` extends base, `include` chỉ `src/**/services`, `src/shared/types`, `src/shared/query`. Đây là cơ chế giữ code mới sạch mà không phải chờ dọn legacy. |

### Scripts (`package.json`)
```json
"typecheck":        "tsc -p tsconfig.json --noEmit",
"typecheck:strict": "tsc -p tsconfig.strict.json --noEmit",
"build":            "vite build",
"build:ci":         "pnpm typecheck && pnpm typecheck:strict && vite build",
"db:types":         "supabase gen types typescript --linked --schema public > src/shared/types/database.types.ts"
```
Giữ `tsc` **ngoài `build`** trong lúc migrate để luôn deploy được (Vercel gọi `build`). Chuyển `build` → `build:ci` khi Nấc B xong.

---

## 2. Generated Supabase types

1. Init + link CLI (xem `02_SCHEMA_DECISIONS.md` §0). `db:types` dùng `--linked` để không hardcode project-ref.
2. Output `src/shared/types/database.types.ts` — **generated, không sửa tay** (có header cảnh báo).
3. `src/shared/types/db.ts` — alias tiện dụng, để 40 file không phải import file generated khổng lồ:
```ts
import type { Database } from "./database.types";
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Insert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type Update<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
export type RentalListingRow = Tables<"rental_listings">;
// ...
```
4. `supabaseClient.ts` → `createClient<Database>(...)`.

> Một dòng generic đó là thứ biến `.eq("id", user.id)` trên `profiles` thành lỗi biên dịch và `status: "Inactive"` thành lỗi type — vì cột generated có literal union suy ra từ CHECK constraint.

5. **Chạy lại `db:types` là bước cuối của MỌI task có SQL.** Type lệch DB là failure mode tái diễn nhất.

### `react`/`react-dom`
Đang là `peerDependencies` + `peerDependenciesMeta.optional: true`. → Chuyển vào `dependencies` (`18.3.1` exact), xóa cả 2 block peer. Đây là app private, không phải library; `optional: true` nghĩa là **`pnpm install --frozen-lockfile` trên CI/Vercel không đảm bảo cài React**, và `@types/react` không resolve được với package thiếu. Đổi luôn `"name": "@figma/my-make-file"` → `"tro-nhanh"`.

---

## 3. Thứ tự sửa bug so với typing

**Sửa 5 bug bằng tay TRƯỚC khi cài TypeScript.** Chúng là 5 dòng đang hỏng demo cho mọi user; chặn chúng sau một cuộc migrate toolchain là sai thứ tự.

| Thứ tự | Việc | Vì sao ở đây |
|---|---|---|
| 1 | 5 bug (T01) | user-visible, không cần tooling |
| 2 | xóa dead code + dep (T02) | nếu không, tsc phải check 57 file shadcn chưa từng được check |
| 3 | tsconfig Nấc A + D (T03) | |
| 4 | generated types + `Database` generic (T04) | bắt **phần còn lại** của cùng lớp bug |
| 5 | error layer, xóa mock fallback, service layer, React Query | cần 3–4 |

`config.ts` fail-soft: ngừng throw ở module load. Export `configError: string | null` cạnh `config`; `App.tsx` render `MissingEnvScreen` tiếng Việt khi có. Một error throw lúc module-evaluate trong graph route lazy-load cho ra **màn hình trắng**; một flag trả về cho ra thông báo đọc được.

---

## 4. Service layer — theo shell, 1 điểm nối được phép

Hạ tầng dùng chung ở `src/shared/services/`; **repository theo domain nằm trong shell sở hữu table đó** — vì đó là thứ **cưỡng chế bằng cơ chế** luật ranh giới: một page marketplace *không thể* chạm bảng workspace nếu hàm duy nhất chạm `properties` nằm trong `src/workspace/services/`.

### Luật của tầng service
- Là hàm `async` thuần, **không bao giờ import React** → unit-test được và dùng lại được từ seeder.
- Sở hữu toàn bộ `try/catch`, dịch lỗi qua `toUserMessage`.
- Trả **domain shape**, không trả row thô.
- Hook bọc service (§5), không phải ngược lại.

```
src/shared/services/
  supabase-error.ts       toUserMessage(e): string · logError(scope, e) ← chỗ DUY NHẤT được console.*
                          class AppError { code; message }
  auth-service.ts         signUp · signIn · signOut
                          getMyProfile()   ← LUÔN .eq("user_id", …), không phải "id"
                          getMyRoles()
  media-service.ts        compressImage(f, maxPx?, q?) · uploadListingImages(sellerId, listingId, files)
                          deleteListingImage(path) · publicUrl(path)
  messaging-service.ts    startConversation · listMyConversations · listMessages · sendMessage
                          markConversationRead · subscribeToConversation (Realtime)
  subscription-service.ts getMySubscription · activateTrial · setDemoStatus
  vacancy-service.ts      ⚠ ĐIỂM NỐI DUY NHẤT ĐƯỢC PHÉP (header file phải ghi rõ)
                          getMyVacantRoomSummaries(): { roomId, district, price, area, propertyName }[]
                          KHÔNG trả dữ liệu vận hành. Dùng cho /chu-tro/tim-nguoi-thue.

src/marketplace/services/
  listing-queries.ts      searchListings(f): Paged<ListingCard> · getListingById · getFeaturedListings
                          incrementViewCount
  listing-mutations.ts    createListing (rpc 1) · updateListing (rpc 2) · setListingStatus
                          softDeleteListing · boostListing · listMyListings
  demand-post-service.ts  createDemandPost · updateDemandPost · listActiveDemandPosts
                          listMyDemandPosts · getDemandPostById · setDemandPostStatus
  review-service.ts       listPropertyReviews · getPropertyPublicProfile · getMyReviewableContracts
                          postReview (rpc 8) · replyToReview (rpc 9)
  listing-mappers.ts      ← NHÀ MỚI của getListingImage / mapAmenityToKey / mapTypeToKey
                          toListingCard(row) · listingImageUrls(row)

src/workspace/services/
  property-service.ts     listMyProperties · getProperty · createProperty · updateProperty
                          updatePropertyBilling · softDeleteProperty · setPublicProfile
  room-service.ts         listRooms · createRoom · updateRoom · setRoomStatus · softDeleteRoom · listVacantRooms
  occupancy-service.ts    listOccupancies · createOccupancyWithContract (rpc 4) · endOccupancy · linkRenterAccount
  contract-service.ts     listContracts · getActiveContractByRoom · terminateContract · renewContract
  billing-service.ts      getLatestReading · recordUtilityReading (rpc 6) · createInvoiceWithItems (rpc 5)
                          listInvoices · getInvoiceWithItems · recordPayment (rpc 7) · buildVietQrUrl
  dashboard-service.ts    getDashboardSummary

src/admin/services/
  moderation-service.ts   listPendingListings · moderateListing (rpc 3) · listReportedReviews · hideReview
  admin-user-service.ts   listUsers · grantRole / revokeRole (rpc 11)
  admin-settings-service.ts getSettings · setSetting (rpc 12)
```

### `searchListings` — chỗ bug "filter ở client" chết
Hiện mọi page danh sách `select("*")` toàn bộ row Active rồi filter trong memory. Thay bằng:
`.eq('status','Active').is('deleted_at',null)` · `.in('district', …)` · `.gte/.lte('price', …)` · `.ilike('title','%kw%')` · amenities qua `listing_amenities!inner(amenity)` + `.in()` · `.order('boost_expire_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})` (**BR-005**) · `.range(from,to)` với `{ count: 'exact' }`.

Label khoảng giá / diện tích từ `catalog.ts` được parse thành số bằng **`src/shared/utils/catalog-bounds.ts`** để cả 3 trang danh sách đồng ý với nhau thay vì mỗi trang tự parse.

### Một quyết định ranh giới phải làm tường minh
`/chu-tro/tin-dang` (`QuanLyPage.tsx`) đang ở `src/workspace/pages/` nhưng chạy **100% trên `rental_listings`** — bảng marketplace. A_PRD §3.1 và spec §1.7 đều xếp "Zone Tin đăng" là **Marketplace** (miễn phí, không gating), chỉ *render bên trong* `LandlordShell`.

> **Chuyển `QuanLyPage.tsx` → `src/marketplace/pages/`.** Shell đi theo dữ liệu, không đi theo khung giao diện.

---

## 5. React Query — cài `@tanstack/react-query@^5`

Chưa được cài (đã xác minh trong `package.json`). Lý do **riêng cho codebase này**, không phải sở thích chung:

- 9 page đang tự viết `useEffect` + `loading` + `error` + "refetch sau mutation". CP4 thêm ~12 screen nữa (inbox, queue, demand list, review, match) → 20 bản copy của cùng 30 dòng.
- **Nó giết bug mock-fallback về mặt cấu trúc:** `isPending` / `isError` / `data.length === 0` thành 3 state riêng biệt — đúng cái mà fallback ở `HomePage.tsx:1219`, `QuanLyPhongPage.tsx:1898`, `ChuTroDashboardPage.tsx:643,653` đang che. Sửa mà không có RQ = viết tay một máy trạng thái 3 nhánh 9 lần.
- Inbox cần background refetch + invalidate khi có realtime event → `invalidateQueries`, thay vì một event bus tự chế (mà bạn đang xóa đúng một cái, §6).
- A_PRD §1.2 cho phép tường minh.

**Setup:**
- `src/shared/query/queryClient.ts` — `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`, `gcTime: 5 phút`.
- `src/shared/query/keys.ts` — **một key factory duy nhất** (`qk.listings.search(f)`, `qk.listings.detail(id)`, `qk.rooms.byProperty(pid)`, `qk.conversations.all`, …) để không task nào phải đoán key string.
- Provider trong `App.tsx`, **ngoài** `AuthProvider`.
- Hook theo shell (`src/marketplace/hooks/useListingSearch.ts`, `src/workspace/hooks/useRooms.ts`), chỉ là wrapper mỏng.

---

## 6. Xóa hack `window.dispatchEvent("tronhanh_sub_status")`

`LandlordShell.tsx:346` broadcast trạng thái gói bằng `CustomEvent`. Thay bằng `src/shared/contexts/SubscriptionContext.tsx`:

```ts
interface SubscriptionContextValue {
  status: SubscriptionStatus;        // NONE | TRIAL | ACTIVE | READ_ONLY
  trialDaysLeft: number;
  plan: SubscriptionPlan | null;
  limits: { maxProperties: number; maxRooms: number };
  isReadOnly: boolean;               // status === 'READ_ONLY'
  canWrite: boolean;                 // TRIAL | ACTIVE
  isLoading: boolean;
  refresh: () => void;               // = invalidateQueries(qk.subscription(userId))
  setDemoStatus: (s: SubscriptionStatus) => Promise<void>;   // rpc 13
}
```

Provider trong `App.tsx` **bên trong** `AuthProvider`, backed bởi query `['subscription', userId]` → "broadcast một thay đổi" thành `invalidateQueries`, và mọi consumer re-render qua React thay vì qua global event.

Xóa: state `subStatus` local ở `LandlordShell.tsx:337`, `updateSubStatus`, `dispatchEvent` ở `:345`, và mọi `addEventListener("tronhanh_sub_status")`.

Thêm `useCanWrite()` cho việc disable nút theo BR-015 — **một chỗ**, không check per-button.

### `AuthContext` mở rộng
Thêm `roles: Role[]` + `hasRole(r)`. Fetch `profiles` và `user_roles` bằng `Promise.all` trong `fetchProfile` hiện có (2 bảng không có FK với nhau nên là 2 query).

**Sửa luôn:** `onAuthStateChange` hiện set `isLoading(true)` ở **mọi** auth event kể cả token refresh → spinner của ProtectedRoute nháy mỗi giờ. Chỉ set loading ở `INITIAL_SESSION` / `SIGNED_IN` / `SIGNED_OUT`.

---

## 7. Split-on-touch — luật refactor monolith

Page hiện tại: `QuanLyPhongPage` 2.224 · `DangTinPage` 1.625 · `HomePage` 1.296 · `RoomDetailPage` 1.264 · `ChuTroDashboardPage` 1.103 · `QuanLyPage` 1.058 · `AllListingsPage` 926 · `SearchResultsPage` 847 · `LandlordShell` 853.

> **Không big-bang split.** Task chỉ được tái cấu trúc **vùng nó phải sửa**.
> Gate: (i) file >**600 dòng** sau khi sửa → split là **DoD của task đó**; (ii) page **mới** phải <**400 dòng**; (iii) component bị copy-paste lần thứ 2 → chuyển vào `shared/components/common/` hoặc `src/<shell>/components/`.

**CP4 do đó BẮT BUỘC split** (vì các file này bị sửa nhiều):
| File | Split thành | Do task |
|---|---|---|
| `QuanLyPhongPage.tsx` (2.224) | `QuanLyPhongPage/{index, RoomsView, OccupantsView, PaymentsView, SettingsView, RoomDrawer, UtilityReadingForm, InvoicePreview}.tsx` | T24, T27 |
| `DangTinPage.tsx` (1.625) | `DangTinPage/{index, useListingForm.ts, Step1Basic, Step2Amenities, Step3Photos, Step4Costs, BoostBlock}.tsx` | T19, T20 |
| `QuanLyPage.tsx` (1.058) | `QuanLyPage/{index, MyListingsTable, ListingRowActions}.tsx` (+ đổi shell) | T20, T21 |
| `LandlordShell.tsx` (853) | tách `SubscriptionBanner`, `TrialModal`, `SidebarNav` | T10 |

**Để yên về cấu trúc** (chỉ đổi tầng data sang service): `HomePage`, `RoomDetailPage`, `AllListingsPage`, `SearchResultsPage`, `PublicNavbar`, `StyleGuidePage`.
Nhưng **tách `ListingCard` và `DemandPostCard`** (hiện ở `HomePage.tsx:250`) ra `src/marketplace/components/` — 4 page cũ + 2 page mới đều cần.

---

## 8. Route mới (~20) — kebab-case tiếng Việt

| Path | Page file | Shell | Guard |
|---|---|---|---|
| `/tin-nhu-cau` | `marketplace/pages/DemandPostsPage.tsx` | marketplace | public |
| `/tin-nhu-cau/:id` | `marketplace/pages/DemandPostDetailPage.tsx` | marketplace | public |
| `/dang-tin-nhu-cau` | `marketplace/pages/DangTinNhuCauPage.tsx` (`?kind=tim-phong\|o-ghep`) | marketplace | RequireAuth |
| `/dang-tin-nhu-cau/:id` | cùng file, edit mode | marketplace | RequireAuth |
| `/khu-tro/:slug` | `marketplace/pages/PropertyPublicPage.tsx` | marketplace | public |
| `/tin-nhan` · `/tin-nhan/:conversationId` | `shared/pages/InboxPage.tsx` | **shared** | RequireAuth |
| `/tai-khoan` | `shared/pages/AccountPage.tsx` | shared (`RenterShell`) | RequireAuth |
| `/tai-khoan/tin-nhu-cau` | `marketplace/pages/MyDemandPostsPage.tsx` | marketplace | RequireAuth |
| `/tai-khoan/phong-cua-toi` | `marketplace/pages/MyStaysPage.tsx` | marketplace | RequireAuth |
| `/tai-khoan/danh-gia` | `marketplace/pages/MyReviewsPage.tsx` | marketplace | RequireAuth |
| `/chu-tro/dang-tin/:id` | `DangTinPage` edit mode | marketplace | RequireAuth |
| `/chu-tro/tim-nguoi-thue` | `marketplace/pages/DemandMatchPage.tsx` | marketplace (dùng `vacancy-service`) | RequireAuth |
| `/chu-tro/danh-gia` | `workspace/pages/PropertyReviewsPage.tsx` | workspace | RequireAuth |
| `/chu-tro/hoa-don` | `workspace/pages/HoaDonPage.tsx` | workspace | RequireAuth + canWrite |
| `/quan-tri` | `admin/pages/AdminDashboardPage.tsx` | **admin** | RequireRole Admin |
| `/quan-tri/kiem-duyet-tin` | `admin/pages/ModerationQueuePage.tsx` | admin | RequireRole Admin\|Moderator |
| `/quan-tri/kiem-duyet-danh-gia` | `admin/pages/ReviewModerationPage.tsx` | admin | RequireRole Admin\|Moderator |
| `/quan-tri/nguoi-dung` | `admin/pages/UsersPage.tsx` | admin | RequireRole Admin |
| `/quan-tri/cai-dat` | `admin/pages/SettingsPage.tsx` | admin | RequireRole Admin |

Redirect thêm vào block back-compat hiện có: `/danh-gia` → `/tai-khoan/danh-gia`, `/admin` → `/quan-tri`.

### 3 bổ sung cấu trúc (B_AGENT_RULES §2 cũ chỉ có 4 nhóm)
- **`src/admin/`** — shell thứ 4. Admin hợp lý khi nhìn cả 2 domain; **miễn luật cross-import một cách tường minh** tốt hơn là để luật bị xói mòn ngầm. Service của nó chỉ gọi RPC moderator / policy moderator-scoped.
- **`src/shared/pages/`** — screen Shared Kernel (Inbox, Account). Seller và Renter là **cùng một account** (role additive) ⇒ phải có **một** inbox ở `/tin-nhan`; hai inbox sẽ xé một thread thành 2 URL.
- **`RenterShell.tsx`** trong `shared/components/` — chrome nhẹ cho `/tai-khoan/*` (PublicNavbar + sidebar 4 mục), để khu vực renter không phải mặc shell của chủ trọ.

---

## 9. Guard

`ProtectedRoute.tsx` chỉ check `user != null`. Tách thành 2:

- **`shared/components/RequireAuth.tsx`** — thay `ProtectedRoute` (giữ re-export 1 commit). Thêm bảo toàn `?redirect=` (spec §1.9): `<Navigate to={"/dang-nhap?redirect=" + encodeURIComponent(location.pathname + location.search)} replace />`. Sửa luôn `justifyinit`.
- **`shared/components/RequireRole.tsx`** — `<RequireRole anyOf={["Admin","Moderator"]} />`, đọc `useAuth().roles`. Render **màn 403 tiếng Việt**, *không* redirect — redirect làm một Moderator thật tưởng mình bị đăng xuất.

Nesting giữ nguyên idiom `lazy: async () => ({ Component })` hiện có:
```
{ lazy: () => ({ Component: RequireAuth }), children: [
    …/chu-tro/*, /tai-khoan/*, /tin-nhan…,
    { lazy: () => ({ Component: RequireRoleAdminOrModerator }), children: [ …/quan-tri/* ] }
]}
```

> **Ghi to trong task brief: guard client CHỈ là UX.** Biên thật là `is_moderator()` trong `moderate_listing()` + các policy SELECT moderator-scoped. Người tự gõ `/quan-tri/kiem-duyet-tin` sẽ thấy **queue rỗng** (RLS trả 0 row) và nhận `FORBIDDEN` khi bấm bất cứ gì. **Không bao giờ** authorize dựa trên flag client đọc được kiểu `profiles.is_seller`.

---

## 10. Styling — giữ inline style, KHÔNG chuyển Tailwind

**Quyết định: giữ inline style, import token từ `src/shared/theme.ts`, không rewrite 11k dòng.**

Lý do:
1. 1.950 style object **đang render đúng và nhất quán**; migrate Tailwind là rewrite 100% với zero lợi ích user thấy được, trong đúng cửa sổ demo-critical.
2. Thứ duy nhất biện minh cho Tailwind — lớp shadcn — **đang bị xóa** vì không ai import.
3. Inline style là lý do app này có **zero bug về CSS specificity**, đáng giá hơn sự ngắn gọn của utility class.
4. `useBreakpoint()` đã lo responsive trong JS, không có khoảng trống media-query cần lấp.

### Hợp nhất 3 bộ token — cơ học, ~1 giờ, **zero thay đổi hình ảnh**
Điểm chốt đã xác minh: **không gì consume các giá trị xung đột.**

1. **`src/shared/theme.ts` LÀ nguồn chân lý.** Nó là thứ đang render; đổi giá trị của nó sẽ đổi giao diện — không ai yêu cầu điều đó. Mở rộng thêm token chỉ tồn tại ở `theme.css`: `error: "#B5503C"`, `warning: "#C8861A"`, `deposited: "#C8861A"`, cộng `radius = {sm:8, md:12, lg:14}` và `space = {1:4,2:8,3:12,4:16,6:24,8:32}`. Chuyển comment "single source of truth" về đây.
2. **Xóa toàn bộ block `--tn-*` trong `src/styles/theme.css`.** Đã xác minh: reference `--tn-` duy nhất trong component là `--tn-brand-logo-color` (`BrandLogo.tsx:46`, `LandlordShell.tsx:166`) — một biến CSS truyền **local** kèm fallback inline, và **không được định nghĩa trong theme.css**. Nên cả 24 khai báo `--tn-*` là dead. **Xóa thắng "hòa giải giá trị"** — không có gì để hòa giải.
3. **`StyleGuidePage.tsx`: xóa `C` local, import từ `../../shared/theme`.** Styleguide khi đó *chứng minh* token thay vì mâu thuẫn với nó. Đây cũng là **bài test hồi quy nhìn thấy được** cho bước 1 — styleguide còn đúng thì merge token sạch.
4. **Xóa `default_shadcn_theme.css`** ở gốc repo (đã xác minh không được reference — `styles/index.css` chỉ import `fonts/tailwind/theme/globals`). **Giữ** block `--primary`/`--background`/oklch của shadcn trong `theme.css` và giữ `tailwind.css` + 2 vite plugin — `vite.config.ts` ghi rõ template Make cần chúng, và chúng vô hại.

### Đòn bẩy thật không phải token mà là primitive
Dựng ~8 component nhỏ, typed, inline-styled trong `src/shared/components/common/`: **`Button`, `Badge`** (lấy màu từ `statusMaps`), **`Card`, `Table`, `EmptyState`, `Pagination`, `Toast`, `Skeleton`** — nhập cùng `AppSelect`/`FormField`/`ModalShell` đã có. Mọi screen CP4 mới compose từ chúng.

> Không có bước này, 12 page mới mỗi cái tự mọc một block style 200 dòng và bạn lại có 4 bộ token sau 3 tháng.

### Luật cho code mới
Import `{ C, font, radius, space }` từ `src/shared/theme.ts`. ❌ Không hex literal mới · ❌ không `className` · ❌ không `--tn-*` mới.

*Lưu ý TypeScript:* custom CSS property trong style object cần cast `as React.CSSProperties` — `LandlordShell.tsx:166` đã có sẵn, nên Nấc A không flag.

---

## 11. `data-testid`

Codebase có **zero `className`** ⇒ `data-testid` là selector ổn định **duy nhất** cho Playwright.

> Thêm testid cho element mà E2E spec chạm vào là **DoD của chính task tạo ra element đó**, không phải việc dọn dẹp bù ở T29. Đây là dependency thật, không phải hygiene.

Convention: `data-testid="listing-card"`, `"listing-card-price"`, `"demand-post-card"`, `"moderation-approve-btn"`, `"review-submit-btn"`, `"utility-current-input"`, `"invoice-total"`, `"vietqr-image"`.
