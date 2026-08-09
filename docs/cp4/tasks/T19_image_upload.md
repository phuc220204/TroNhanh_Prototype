# T19 — Upload ảnh thật lên Supabase Storage

**Luồng:** 1 (đăng tin cho thuê) + extra 1
**Phụ thuộc:** T13 (migration `0800` — đã xong), T11c (service ghi)
**Skill:** `tronhanh-service` + `tronhanh-ui`

## Vì sao
Repo hiện có **ZERO lời gọi `storage.`**. Ảnh tin đăng là URL Unsplash **băm từ UUID** của listing (`getListingImage`, `AllListingsPage.tsx:86-93`). Luồng "đăng tin cho thuê" **không thể test thật** nếu ảnh không phải ảnh user chọn.

Thêm nữa: `DangTinPage.tsx:1369` dùng `URL.createObjectURL` → blob URL **chết sau reload**, nên ngay cả trong session hiện tại ảnh cũng không bền.

## Việc

### 1. `src/shared/services/media-service.ts`
```ts
compressImage(file: File, maxPx = 1600, quality = 0.82): Promise<Blob>
  // canvas → toBlob('image/webp', quality), giữ tỉ lệ, cạnh dài ≤ maxPx
uploadListingImages(sellerId: string, listingId: string, files: File[]): Promise<UploadedMedia[]>
  // path: `${sellerId}/${listingId}/${crypto.randomUUID()}.webp`
deleteListingImage(path: string): Promise<void>
publicUrl(path: string): string
  // supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl
```

⚠️ **`sellerId` PHẢI là segment đầu của path** — đó là thứ duy nhất khiến storage policy chặn được user A upload vào thư mục user B. Đừng đổi thứ tự.

⚠️ **Lưu `storage_path` vào DB, KHÔNG lưu URL.** Derive URL lúc render, để đổi bucket/CDN không thành migration dữ liệu.

### 2. Split `DangTinPage.tsx` (1.625 dòng — split-on-touch bắt buộc)
```
pages/DangTinPage/
  index.tsx            < 400 dòng — stepper shell
  useListingForm.ts    Formik + Yup + submit
  Step1Basic.tsx
  Step2Amenities.tsx
  Step3Photos.tsx      ← phần chính của task này
  Step4Costs.tsx
  BoostBlock.tsx
```

### 3. `Step3Photos.tsx`
- Chọn nhiều file, preview ngay (dùng `URL.createObjectURL` **chỉ cho preview**, revoke khi unmount)
- Progress từng ảnh trong lúc upload
- **Xóa** ảnh · **đổi thứ tự** (kéo hoặc nút ↑↓ — nút đơn giản hơn, đủ dùng)
- Ràng buộc **≥3 ảnh** ở Yup (đã có sẵn `DangTinPage.tsx:522`). **KHÔNG** đặt trong RPC — seeder và row cũ sẽ vỡ.
- Thứ tự = `sort_order`, ảnh đầu là ảnh bìa

### 4. Thứ tự upload
Listing chưa có `id` trước khi submit. Hai lựa chọn — **chọn (a)**:
- **(a)** Sinh `listingId = crypto.randomUUID()` ở client trước, upload ảnh vào `{sellerId}/{listingId}/`, rồi truyền `id` đó + `p_media` vào `create_listing_with_details`. **Cần sửa RPC nhận `p_listing->>'id'`** (thêm 1 dòng, `coalesce(..., gen_random_uuid())`).
- (b) Tạo listing `Draft` trước rồi upload rồi update — 2 round-trip, phức tạp hơn.

### 5. Render `listing_media` ở mọi nơi
`listing-mappers.ts` → `listingImageUrls(row)`:
```ts
// ưu tiên listing_media theo sort_order; row cũ không có media → fallback Unsplash deterministic
```
Áp vào: `HomePage`, `AllListingsPage`, `SearchResultsPage`, `RoomDetailPage` (gallery + lightbox).

**Giữ `getListingImage` làm FALLBACK, không phải nguồn chính.**

## Cách test
1. Login `seller.a` → `/chu-tro/dang-tin` → bước 3 **upload 4 ảnh thật** → thấy progress → xóa 1 → đổi thứ tự
2. Submit → `/tat-ca-phong`: card hiện **ảnh vừa upload**, không phải ảnh stock
3. **Hard reload (Ctrl+Shift+R)** → ảnh vẫn còn (chứng minh không phải blob URL)
4. `/phong/:id` → gallery đúng 3 ảnh, đúng thứ tự đã đặt
5. Kiểm bảng `listing_media` có 3 row, `storage_path` đúng format `{seller_id}/{listing_id}/*.webp`
6. **Test bảo mật** — console browser khi đã login:
```js
await supabase.storage.from('listing-images').upload(`<UUID_KHÁC>/x/y.webp`, new Blob(['x']))
// → PHẢI trả lỗi
```
7. Mở một tin **cũ** (chưa có media) → vẫn hiện ảnh fallback, không vỡ layout

## DoD
- [ ] Ảnh upload thật, tồn tại sau hard reload
- [ ] `storage_path` lưu trong DB (không phải URL), format có `seller_id` ở segment đầu
- [ ] Xóa / đổi thứ tự hoạt động
- [ ] Upload vào thư mục người khác **bị chặn**
- [ ] Row cũ không có media vẫn render fallback
- [ ] `grep -rn "createObjectURL" src` chỉ còn ở preview (có revoke)
- [ ] `DangTinPage/` mỗi file < 400 dòng
- [ ] `data-testid`: `photo-upload-input`, `photo-item`, `photo-remove-btn`
- [ ] typecheck + strict = 0
