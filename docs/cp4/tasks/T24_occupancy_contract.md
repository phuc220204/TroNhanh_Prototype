# T24 — Occupancy + Hợp đồng (luồng 5 + extra 4)

**Luồng:** 5 (quản lý khu & nhà trọ) + extra 4
**Phụ thuộc:** T17 (RPC — đã xong), T11b/T11c
**Chặn:** T26 (review cần occupancy `Confirmed` mới test được)
**Skill:** `tronhanh-service` + `tronhanh-ui`

## Vì sao
`OccupantsView` (`QuanLyPhongPage.tsx:1705`) hiện **chỉ đọc**. Không thêm được người ở, không tạo được hợp đồng, không có transition phòng → `Rented`. Row `occupancies`/`contracts` **chỉ tồn tại qua seeder**.

Hệ quả dây chuyền: không có người ở ⇒ không có hợp đồng ⇒ luồng điện nước/hóa đơn chỉ chạy trên data seeder, và **review verified-only bất khả thi**.

## Việc

### 1. `src/workspace/services/occupancy-service.ts`
```ts
listOccupancies(roomId): Promise<Occupancy[]>
createOccupancyWithContract(roomId, occupant, contract): Promise<{occupancyId, contractId}>
  // → rpc("create_occupancy_with_contract", { p_room_id, p_occupant, p_contract })
endOccupancy(id, endDate): Promise<void>
linkRenterAccount(occupancyId, email): Promise<void>   // set user_id + link_status='Pending'
```

⚠️ **Không truyền `owner_id`** — RPC derive từ `auth.uid()`.

### 2. Split `QuanLyPhongPage.tsx` (2.224 dòng — split-on-touch BẮT BUỘC)
```
pages/QuanLyPhongPage/
  index.tsx              < 400 dòng
  RoomsView.tsx
  OccupantsView.tsx      ← phần chính của task này
  PaymentsView.tsx
  SettingsView.tsx
  RoomDrawer.tsx
  UtilityReadingForm.tsx
  InvoicePreview.tsx
```

### 3. `OccupantsView` ghi được
Form "Thêm người ở":
- `full_name`* · `phone_number` · `occupant_count` · `start_date`*
- Hợp đồng: `start_date`* · `end_date`* · `rent_price`* (prefill từ `room.price`) · `deposit`
- Tuỳ chọn: **gắn tài khoản Renter** bằng email → `user_id` + `link_status = 'Pending'`

Submit → **một** lời gọi RPC → atomic:
```
occupancies → contracts → rooms.status='Rented' → (BR-027) rental_listings.status='Rented'
```

### 4. ⚠️ BR-029 — cổng chống review gian lận
`link_status` **KHÔNG BAO GIỜ** được set `'Confirmed'` bởi chủ trọ. RPC đã set `'Pending'`. Renter phải tự xác nhận qua `confirm_occupancy_link()` (UI ở T26, trang `/tai-khoan/phong-cua-toi`).

UI phải nói rõ: *"Đã gửi yêu cầu xác nhận tới <email>. Người ở cần xác nhận để hoàn tất liên kết."*

Nếu bạn "tiện tay" set `Confirmed` luôn cho nhanh, bạn phá toàn bộ giá trị chống gian lận của review.

### 5. BR-006 — chặn hợp đồng chồng thời gian
RPC đã raise `ROOM_HAS_ACTIVE_CONTRACT`. UI phải hiển thị message **tiếng Việt** từ `toUserMessage(e)`: *"Phòng này đã có hợp đồng còn hiệu lực trong khoảng thời gian đó."*

### 6. Kết thúc đợt ở
Nút "Kết thúc hợp đồng" → set `contracts.status='Terminated'`, `occupancies.is_active=false` + `end_date`, `rooms.status='Available'`. **Cần RPC mới** `terminate_contract(p_contract_id, p_end_date)` — viết theo khuôn ở skill `tronhanh-schema`, assert `owner_id = v_uid`.

## Cách test
1. Login `seller.a` → `/chu-tro/quan-ly-phong` → phòng `Available` → drawer → tab Người ở → thêm người ở + hợp đồng
2. Phòng chuyển **Đang thuê**; nếu phòng có tin đăng liên kết → tin chuyển **Đã cho thuê** (BR-027)
3. Thử tạo hợp đồng Active **thứ 2 chồng thời gian** → lỗi tiếng Việt (BR-006)
4. Gắn email `renter.a` → `occupancies.link_status = 'Pending'` (kiểm DB), **không phải** `Confirmed`
5. **Test atomic:** tạm `raise exception` giữa RPC (sau insert occupancies, trước contracts) → kiểm **không** có row `occupancies` mồ côi
6. Kết thúc hợp đồng → phòng về `Available`
7. Login `seller.b` → không thấy occupancy nào của A (RLS)

## DoD
- [ ] Thêm người ở + hợp đồng → phòng `Rented` + tin liên kết `Rented`, trong **một** transaction
- [ ] Hợp đồng chồng thời gian bị chặn kèm message tiếng Việt
- [ ] `link_status = 'Pending'`, **không bao giờ** auto `Confirmed`
- [ ] Ngắt giữa RPC không để lại row mồ côi
- [ ] Kết thúc hợp đồng → phòng về `Available`
- [ ] `QuanLyPhongPage/` mỗi file < 400 dòng
- [ ] `data-testid`: `add-occupant-btn`, `occupant-name-input`, `contract-rent-input`, `occupancy-submit-btn`
- [ ] typecheck + strict = 0
