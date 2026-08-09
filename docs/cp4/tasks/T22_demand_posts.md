# T22 — Demand post THẬT (luồng 2 + luồng 3)

**Luồng:** 2 (đăng tin tìm phòng) + 3 (đăng tin ở ghép)
**Phụ thuộc:** T14 (migration `0600` — đã xong), T11a, T12
**Skill:** `tronhanh-ui` + `tronhanh-service`

## Vì sao — đọc kỹ phần này
Bảng `demand_posts` trước CP4 chỉ có 6 cột. Nhưng `DemandPostCard` (`HomePage.tsx:250`) render `name`, `initials`, `title`, `roomType`, `moveIn`, `amenities`, `needed`, `requirements` — và mapper ở **`HomePage.tsx:1184-1207` HARDCODE toàn bộ**:

```
initials: "ND"                          name: "Khách tìm trọ"
roomType: "Phòng trọ / Căn hộ"          moveIn: "Dọn vào trong tháng"
amenities: ["Wifi","WC riêng","Tự do"]  needed: "Cần 1 người"
requirements: ["Sạch sẽ","Gọn gàng","Vui vẻ"]
```

Và `selectRenterPostType` (`HomePage.tsx:1223`) mở modal `[Demand Posts — đang phát triển]` **thay vì form**.

Migration `0600` đã thêm 15 cột cho đúng những field đó. Task này làm cho chúng **thật**.

> ## ⚠️ ĐIỀU KIỆN FAIL
> Nếu sau task này card **còn hiện bất kỳ chuỗi nào** dưới đây → task CHƯA XONG:
> `"Khách tìm trọ"` · `"ND"` · `"Cần 1 người"` · `"Phòng trọ / Căn hộ"` · `"Dọn vào trong tháng"` · `"Sạch sẽ, Gọn gàng, Vui vẻ"` · `"Wifi, WC riêng, Tự do"`
>
> ```bash
> grep -rn '"Khách tìm trọ"\|"ND"\|"Cần 1 người"\|"Dọn vào trong tháng"' src   # phải = 0
> ```

## Việc

### 1. `src/marketplace/services/demand-post-service.ts`
`createDemandPost` · `updateDemandPost` · `listActiveDemandPosts(f)` · `listMyDemandPosts()` · `getDemandPostById(id)` · `setDemandPostStatus(id, s)`

Query phải **join `profiles`** để lấy `full_name` → `name` và initials:
```ts
.select("*, profiles!demand_posts_renter_id_fkey(full_name)")
```
(nếu FK name khác, kiểm bằng `supabase gen types` output). Initials = 2 chữ đầu của các từ trong `full_name`.

Order: `created_at desc`, filter `status='Active'`, `deleted_at is null`. Dùng index `idx_demand_browse`.

### 2. `marketplace/pages/DangTinNhuCauPage.tsx` — một luồng, 2 lựa chọn
A_PRD §5.6. Route `/dang-tin-nhu-cau`, đọc `?kind=tim-phong|o-ghep`. Nếu không có `kind` → hiện màn chọn 2 nút lớn: **"Tìm phòng"** / **"Tìm người ở ghép"**.

Form đổi shape theo `kind`:

**Chung:** `title`* · `description` · `desired_districts[]`* (từ `REGIONS`) · `price_min`* · `price_max`* · `contact_name` · `contact_phone`

**RoomWanted:** `property_type` (từ `PROPERTY_TYPES`) · `min_area` · `desired_amenities[]` (từ `AMENITIES`) · `move_in_date` · `occupant_count`

**RoommateWanted:** `current_address` · `district` · `share_price` · `needed_count`* · `gender_requirement` (`Any`/`Male`/`Female`) · `requirements[]`

Validate Yup: `price_max >= price_min`; `needed_count` bắt buộc khi RoommateWanted (khớp CHECK `demand_roommate_shape`).

Route `/dang-tin-nhu-cau/:id` = cùng file, edit mode.

### 3. Sửa `DemandPostCard` — xóa mọi hardcode
Tách ra `src/marketplace/components/DemandPostCard.tsx` (4 page cần nó). Đọc **cột thật**:
- RoomWanted: `title`, `desired_districts`, `price_min–price_max`, `property_type`, `move_in_date` (format "Dọn vào tháng M/YYYY"), `desired_amenities`
- RoommateWanted: `title`, `district`, `share_price`, `needed_count` + `gender_requirement` → **"Cần N người · Nữ"**, `requirements`
- `name`/`initials` từ join `profiles`

Xóa `selectRenterPostType` modal (`HomePage.tsx:1223`) → navigate tới `/dang-tin-nhu-cau`.

### 4. Ba trang mới
- `/tin-nhu-cau` — `DemandPostsPage.tsx`: danh sách + filter `kind` / khu vực / khoảng giá + phân trang
- `/tin-nhu-cau/:id` — `DemandPostDetailPage.tsx`: đầy đủ field + CTA **"Nhắn tin"** (T25 wire vào)
- `/tai-khoan/tin-nhu-cau` — `MyDemandPostsPage.tsx`: Sửa / Ẩn / Xóa

### 5. Nhắc lại A_PRD §9
**"Ở ghép" KHÔNG phải một `property_type`** → không được xuất hiện trong bộ lọc loại hình ở `/tat-ca-phong` hay `/tim-phong`.

## Cách test
Xem `06_QA_CHECKLIST.md` §3 luồng 2 và luồng 3 (click-path đầy đủ).

Thêm: login `renter.b` (account khác) → không sửa/xóa được tin của `renter.a` (RLS).

## DoD
- [ ] Đăng RoomWanted → card hiện **tiêu đề/khu vực/tháng dọn vào/tiện ích CỦA TÔI** + tên & initials từ `profiles`
- [ ] Đăng RoommateWanted → card hiện nhãn "ở ghép" + "Cần N người · <giới tính>" từ cột thật
- [ ] `grep` 7 chuỗi hardcode ở trên = **0**
- [ ] Modal `[Demand Posts — đang phát triển]` đã bị xóa
- [ ] `/tin-nhu-cau` filter theo `kind` đúng
- [ ] "Ở ghép" **không** có trong filter loại hình của trang cho thuê
- [ ] `/tai-khoan/tin-nhu-cau` sửa/ẩn/xóa được; account khác không sửa được
- [ ] `data-testid`: `demand-post-card`, `demand-kind-badge`, `demand-submit-btn`
- [ ] Mỗi page mới < 400 dòng
- [ ] typecheck + strict = 0
