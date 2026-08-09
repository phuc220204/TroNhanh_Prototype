# T21 — Kiểm duyệt tin đăng (luồng 4b)

**Luồng:** 4b — "review tin đăng" nghĩa *kiểm duyệt*
**Phụ thuộc:** T17 (RPC `moderate_listing` — đã xong), T12 (route `/quan-tri/*` + `RequireRole`)
**Skill:** `tronhanh-ui` + `tronhanh-service`

## Việc

### 1. `src/admin/services/`
```
moderation-service.ts     listPendingListings(f) · moderateListing(id, action, reason)
                          listReportedReviews() · hideReview(id, reason)
admin-user-service.ts     listUsers(f) · grantRole(userId, role) · revokeRole(userId, role)
admin-settings-service.ts getSettings() · setSetting(key, value)
```

⚠️ `src/admin/services/` **chỉ được gọi RPC moderator** + policy moderator-scoped. Không viết query thô vào bảng nghiệp vụ (`/CLAUDE.md` §2.3).

### 2. `/quan-tri/kiem-duyet-tin` — `ModerationQueuePage.tsx`
- Filter theo `status`: Chờ duyệt / Bị từ chối / Đang hiển thị / Tất cả
- Mỗi row: ảnh bìa, tiêu đề, giá, khu vực, seller, thời gian đăng
- Xem chi tiết (drawer hoặc mở `/phong/:id` tab mới)
- Nút **Duyệt** / **Từ chối**
- **Từ chối phải nhập lý do** — form không cho submit khi rỗng (FR-064). RPC cũng raise `REASON_REQUIRED`; **cả hai lớp đều cần**.
- Sau action: `invalidateQueries(qk.admin.moderationQueue(...))`

### 3. `/quan-tri/cai-dat` — `SettingsPage.tsx`
Toggle **"Chế độ kiểm duyệt: Tự động / Thủ công"** → `setSetting("auto_approve_listings", true|false)`.

Giải thích ngay dưới toggle: *"Tự động: tin hiển thị ngay sau khi đăng. Thủ công: tin phải được duyệt trước khi hiển thị."*

Cũng ở đây: `listing_ttl_days`, `boost_config` (chỉ đọc là đủ cho CP4).

### 4. `/quan-tri` — `AdminDashboardPage.tsx`
KPI: số tin chờ duyệt · số review bị báo cáo · tổng user · tin Active. Dùng `count: exact, head: true`.

### 5. `/quan-tri/nguoi-dung` — `UsersPage.tsx`
List user + role, nút cấp/thu `Seller`/`Moderator`.
⚠️ **`Admin` không grant được qua UI** — RPC chỉ nhận `Seller`/`Moderator`. Admin đầu tiên tạo bằng SQL snippet. Ghi rõ điều này trên UI để không ai đi tìm nút.

### 6. Phía Seller — `/chu-tro/tin-dang`
- Badge trạng thái dùng `LISTING_META` từ `statusMaps.ts` (đã có đủ 7 trạng thái BR-001)
- Tin `Rejected` → hiện **lý do từ chối** + nút **"Sửa & gửi lại"** → `/chu-tro/dang-tin/:id` (T20)
- Tin `PendingApproval` → badge "Chờ duyệt" + dòng giải thích
- **Luôn hiện badge trạng thái ở CẢ hai chế độ** (tự động và thủ công) — để vòng đời tin nhìn thấy được, không bị che

### 7. `AdminShell.tsx`
Trong `src/admin/components/`. Sidebar 5 mục. Tông màu khác nhẹ so với `LandlordShell` để nhận biết đang ở khu quản trị.

## ⚠️ Hai điều không được làm
1. **Đừng thêm policy UPDATE cho moderator** trên `rental_listings`. Nó cố ý không có — mọi transition buộc đi qua `moderate_listing()` ⇒ audit trail không thể bỏ sót. Thêm policy = phá cơ chế audit.
2. **Guard client chỉ là UX.** Biên thật là `is_moderator()` trong RPC + policy SELECT moderator-scoped.

## Cách test
Click-path đầy đủ ở `06_QA_CHECKLIST.md` §3 luồng 4b. Rút gọn:

1. `admin` → `/quan-tri/cai-dat` → chuyển sang **Thủ công**
2. `seller.a` → đăng 1 tin → **không** hiện ở `/tat-ca-phong`; `/chu-tro/tin-dang` hiện "Chờ duyệt"
3. `admin` → `/quan-tri/kiem-duyet-tin` → thử **Từ chối với lý do rỗng → bị chặn**
4. Từ chối có lý do → seller thấy "Bị từ chối" + lý do + nút "Sửa & gửi lại"
5. Sửa & gửi lại → về `PendingApproval` → Duyệt → **giờ hiện ở `/tat-ca-phong`**
6. Kiểm `moderation_logs`: có **2 row** (Reject + Approve), `moderator_id` = admin
7. Kiểm tin vừa duyệt có `approved_at` và `expire_at = now() + 60 ngày` (BR-026)
8. **Negative:** `renter.a` tự gõ `/quan-tri/kiem-duyet-tin` → **màn 403**; nếu bằng cách nào đó vào được thì queue **rỗng** (RLS)
9. Chuyển lại **Tự động** → đăng tin → `Active` ngay, **và vẫn có 1 row `moderation_logs`** với `moderator_id = null, reason = 'auto (demo)'`

## DoD
- [ ] Duyệt → tin hiện ở `/tat-ca-phong`; Từ chối → seller thấy lý do
- [ ] Từ chối không lý do bị chặn ở **cả** UI và RPC
- [ ] Mọi action ghi `moderation_logs`
- [ ] Auto-approve mode vẫn ghi audit row với `moderator_id = null`
- [ ] `approved_at` + `expire_at` +60 ngày khi duyệt (BR-026)
- [ ] User thường → 403; queue rỗng nếu lách vào
- [ ] Badge trạng thái hiện ở cả 2 chế độ
- [ ] `data-testid`: `moderation-row`, `moderation-approve-btn`, `moderation-reject-btn`, `moderation-reason-input`, `auto-approve-toggle`
- [ ] Mỗi page mới < 400 dòng
- [ ] typecheck + strict = 0
