# T26 — Đánh giá chủ trọ / khu trọ (luồng 4a)

**Luồng:** 4a — "review tin đăng" nghĩa *đánh giá*
**Phụ thuộc:** T16 + T17 (đã xong), **T24** (cần occupancy `Confirmed`), T18 (nút demo)
**Skill:** `tronhanh-ui` + `tronhanh-service`

## Vì sao đây là task khó nhất
Không phải vì UI, mà vì **điều kiện đủ tư cách**. BR-022 + BR-029 + BR-030 đòi: occupancy `link_status='Confirmed'` **và** hợp đồng ≥30 ngày (hoặc ≥1 payment) **và** không phải chủ khu. Logic đã nằm trong `can_review_contract()` — task này chỉ được **hiển thị đúng**, không được nới.

> ## ❌ TUYỆT ĐỐI KHÔNG nới `can_review_contract()` để demo cho dễ
> Cổng 30 ngày *là* toàn bộ giá trị chống gian lận của tính năng, và giám khảo rất có thể hỏi đúng chỗ đó. Dùng `demo_link_me_to_seeded_occupancy()` (T18).

## Việc

### 1. `src/marketplace/services/review-service.ts`
```ts
getMyReviewableContracts(): Promise<ReviewableStay[]>
  // contracts của mình (qua policy "Linked renter reads own contracts")
  // + cờ canReview: gọi rpc can_review_contract HOẶC tự suy từ dữ liệu đọc được
listPropertyReviews(propertyId): Promise<Review[]>
getPropertyPublicProfile(slug): Promise<PropertyPublicProfile | null>
  // ⚠️ đọc từ VIEW property_public_profiles, KHÔNG từ bảng properties
postReview(contractId, rating, content): Promise<string>   // rpc post_review
replyToReview(reviewId, text): Promise<void>               // rpc reply_to_review
confirmOccupancyLink(occupancyId, accept): Promise<void>   // rpc confirm_occupancy_link
```

### 2. `/tai-khoan/phong-cua-toi` — `MyStaysPage.tsx`
- **Yêu cầu liên kết đang chờ** (`link_status='Pending'`): card "Chủ trọ X mời bạn xác nhận là người ở phòng Y" + nút **Xác nhận** / Từ chối → `confirmOccupancyLink`. **Đây là BR-029, phần bắt buộc.**
- **Đang ở:** khu, phòng, hợp đồng, hóa đơn của mình
- **Lịch sử ở trọ:** đợt đã kết thúc
- Mỗi đợt: nút **"Đánh giá khu"**

⚠️ **UX bắt buộc:** người **chưa đủ điều kiện** thì nút **không hiện / disabled** kèm giải thích cụ thể (*"Bạn cần ở đủ 30 ngày hoặc đã thanh toán ít nhất 1 hóa đơn để đánh giá"*). **KHÔNG BAO GIỜ** hiện form rồi báo lỗi sau submit.

### 3. Modal đánh giá
1–5 sao (bắt buộc) + nội dung ≤1000 ký tự (có bộ đếm). Submit → `post_review`.
Lỗi map sẵn: `REVIEW_NOT_ELIGIBLE`, `REVIEW_ALREADY_EXISTS`.
**BR-023:** sửa được trong 7 ngày — sau đó nút Sửa ẩn đi.

### 4. `/khu-tro/:slug` — `PropertyPublicPage.tsx`
Đọc từ **view** `property_public_profiles`: tên khu, quận, `avg_rating`, `review_count`, danh sách review (+ `seller_reply`), và tin đang đăng của khu.

⚠️ **Không đọc bảng `properties`** — nó chứa `bank_account_number`. Đây là điểm rò rỉ dữ liệu nếu làm sai (`07_RISKS.md` #3).

### 5. Badge rating trên card tin đăng
Tin có `property_id` **và** khu bật `is_public_profile_enabled` → hiện `★ 4.5 (12)` link tới `/khu-tro/:slug`. Không thoả → **không hiện gì** (BR-024).

Thay empty state *"Chưa có đánh giá"* ở `/phong/:id` bằng khối review thật.

### 6. `/chu-tro/danh-gia` — `PropertyReviewsPage.tsx` (workspace)
Chủ trọ xem review của khu mình (qua policy `owns_property`) + **phản hồi** (`reply_to_review`, 0..1 lần, ≤1000 ký tự).
Cũng ở đây: toggle **bật trang khu trọ công khai** (`is_public_profile_enabled` + sinh `public_slug`) — BR-024.

### 7. `/quan-tri/kiem-duyet-danh-gia` — `ReviewModerationPage.tsx` (admin)
Review có `report_count > 0` hoặc `status='Reported'` → nút Ẩn (`hide_review`, bắt buộc lý do).

### 8. `/tai-khoan/danh-gia` — `MyReviewsPage.tsx`
Review tôi đã viết + sửa trong 7 ngày.

## Cách test
Click-path đầy đủ ở `06_QA_CHECKLIST.md` §3 luồng 4a. Rút gọn:

1. `seller.a` → thêm người ở, gắn email `renter.a` (T24) → `link_status='Pending'`
2. `renter.a` → `/tai-khoan/phong-cua-toi` → thấy yêu cầu → **Xác nhận** → `Confirmed`
3. Nút "Đánh giá khu" vẫn **disabled** (hợp đồng mới, chưa 30 ngày, chưa payment) — **đúng như thiết kế**
4. `renter.a` → DemoFAB → **"Tôi là người ở demo"** → backdate + payment → giờ nút **enabled**
5. Đánh giá 5 sao + nội dung → submit
6. `seller.a` → `/chu-tro/danh-gia` → thấy review → **bật trang công khai** → phản hồi
7. `/khu-tro/:slug` (kể cả **ẩn danh**) → thấy review + reply + điểm trung bình
8. `/tat-ca-phong` → tin của khu đó có **badge rating**
9. **Tắt** `is_public_profile_enabled` → review **biến mất** khỏi trang công khai và badge mất (BR-024)
10. **Negative bắt buộc:**
    - Account mới toanh → nút không hiện + có giải thích
    - `seller.a` **không** review được khu của mình (BR-030)
    - Đánh giá lần 2 cùng hợp đồng → `REVIEW_ALREADY_EXISTS` (BR-023)
    - Ẩn danh gọi `select * from properties` → **0 row** (kiểm bằng `supabase/tests/rls.sql` TEST 4)

## DoD
- [ ] Renter xác nhận được liên kết (BR-029); chủ trọ **không** tự Confirmed được
- [ ] Người chưa đủ điều kiện: nút ẩn/disabled + giải thích, **không** hiện form
- [ ] Đánh giá → `avg_rating` + `review_count` cập nhật (trigger)
- [ ] Review chỉ public khi khu bật public profile (BR-024)
- [ ] Badge rating chỉ hiện khi có `property_id` **và** khu public
- [ ] Chủ trọ phản hồi được; reply hiện công khai
- [ ] BR-030 và BR-023 đều bị chặn đúng
- [ ] `/khu-tro/:slug` đọc từ **view**, không từ `properties`
- [ ] `data-testid`: `review-star-{n}`, `review-content-input`, `review-submit-btn`, `review-item`, `seller-reply-input`, `rating-badge`, `confirm-link-btn`
- [ ] Mỗi page mới < 400 dòng
- [ ] typecheck + strict = 0
