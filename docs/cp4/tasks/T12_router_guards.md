# T12 — Router: ~20 route mới + guard + shell mới

**Phụ thuộc:** T10 (AuthContext có `roles` — đã xong).
**Chặn:** T21, T22, T25, T26 (mọi screen mới cần route).
**Skill:** `tronhanh-ui`

## Việc

### 1. Thay `ProtectedRoute` bằng `RequireAuth` / `RequireRole`
Cả hai **đã được viết sẵn** ở `src/shared/components/`. Việc còn lại: dùng chúng trong router và xóa `ProtectedRoute.tsx` (giữ re-export 1 commit nếu muốn an toàn).

Nesting giữ đúng idiom `lazy: async () => ({ Component })` hiện có trong `src/routes/index.tsx`:
```
{ lazy: () => ({ Component: RequireAuth }), children: [
    /chu-tro/*, /tai-khoan/*, /tin-nhan, /tin-nhan/:conversationId,
    { lazy: () => ({ Component: RequireAdminOrModerator }), children: [ /quan-tri/* ] }
]}
```

### 2. Thêm ~20 route (bảng đầy đủ ở `04_FRONTEND_ARCH.md` §8)
Task này chỉ tạo **page scaffold rỗng** (một `EmptyState` + tiêu đề). Nội dung thật là việc của T21–T27.

Nhóm: `/tin-nhu-cau` · `/tin-nhu-cau/:id` · `/dang-tin-nhu-cau` · `/khu-tro/:slug` · `/tin-nhan` · `/tai-khoan/*` (4 trang) · `/chu-tro/dang-tin/:id` · `/chu-tro/tim-nguoi-thue` · `/chu-tro/danh-gia` · `/chu-tro/hoa-don` · `/quan-tri/*` (5 trang).

Redirect thêm: `/danh-gia` → `/tai-khoan/danh-gia`, `/admin` → `/quan-tri`.

### 3. Hai shell mới
- **`src/admin/`** — shell thứ 4 + `AdminShell.tsx` (sidebar 5 mục). Được **miễn luật cross-import một cách tường minh**; service của nó chỉ gọi RPC moderator.
- **`src/shared/pages/`** — `InboxPage.tsx`, `AccountPage.tsx`. **Một inbox duy nhất** ở `/tin-nhan`: Seller và Renter là *cùng một account* (role additive), hai inbox sẽ xé một thread thành 2 URL.
- **`RenterShell.tsx`** trong `shared/components/` — chrome nhẹ cho `/tai-khoan/*` (PublicNavbar + sidebar 4 mục), để khu vực renter không mặc shell của chủ trọ.

### 4. Chuyển `QuanLyPage.tsx` → `src/marketplace/pages/QuanLyPage/`
Nó chạy **100% trên `rental_listings`** — bảng marketplace. A_PRD §3.1 xếp "Zone Tin đăng" là Marketplace (miễn phí, không gating), chỉ *render bên trong* `LandlordShell`.

> **Shell đi theo dữ liệu, không đi theo khung giao diện.**

Đồng thời split (file 1.058 dòng): `QuanLyPage/{index.tsx, MyListingsTable.tsx, ListingRowActions.tsx}`.

### 5. Cập nhật `B_AGENT_RULES` / `CLAUDE.md`
`/CLAUDE.md` §2 đã có `src/admin/`. Nếu bạn thêm shell nào khác, ghi vào đó **tường minh** — để luật bị nới có chủ ý, không bị xói mòn ngầm.

## ⚠️ Ghi to trong PR description
**Guard client CHỈ là UX.** Biên bảo mật thật là `is_moderator()` trong `moderate_listing()` + policy SELECT moderator-scoped. Người tự gõ `/quan-tri/kiem-duyet-tin` sẽ thấy **queue rỗng** (RLS trả 0 row) và nhận `FORBIDDEN` khi bấm bất cứ gì. **Không bao giờ** authorize dựa trên flag client đọc được.

## Cách test
1. Mọi route cũ vẫn resolve (đi qua từng cái)
2. Chưa đăng nhập → vào `/chu-tro/quan-ly-phong` → về `/dang-nhap?redirect=%2Fchu-tro%2Fquan-ly-phong`; đăng nhập → **quay lại đúng trang đó**
3. Login `renter.a` → tự gõ `/quan-tri` → **màn 403 tiếng Việt**, KHÔNG redirect về login
4. Login `admin` → `/quan-tri` → vào được
5. `grep -rn "ProtectedRoute" src` → 0 (hoặc chỉ còn re-export)

## DoD
- [ ] `?redirect=` hoạt động cả 2 chiều
- [ ] `/quan-tri` với user thường = 403, với Admin = vào được
- [ ] Mọi route cũ còn hoạt động
- [ ] `QuanLyPage` đã ở `marketplace/pages/`, đã split, mỗi file < 400 dòng
- [ ] Có `AdminShell` + `RenterShell`
- [ ] typecheck + strict = 0
