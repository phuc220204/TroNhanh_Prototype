# CP4 — Bắt đầu từ đây

> Bộ tài liệu để giao **Agent Code** hoàn thiện Trọ Nhanh từ prototype thành sản phẩm **test được end-to-end như một dự án thương mại**.
> Nhóm 211 · EXE101 · Checkpoint 4.

---

## Đọc theo thứ tự nào

| Bạn là | Đọc |
|---|---|
| **Người giao việc** (đưa task cho agent) | File này → `05_BUILD_PLAN_CP4.md` → chọn task trong `tasks/` |
| **Agent Code** (đang làm 1 task) | `/CLAUDE.md` (tự nạp) → `tasks/T<xx>_*.md` của bạn → chỉ đọc doc mà task đó trỏ tới |
| **Người review / thuyết trình** | `01_PRD_CP4.md` → `06_QA_CHECKLIST.md` → `07_RISKS.md` |
| **Người sửa schema** | `02_SCHEMA_DECISIONS.md` + `03_RPC_CONTRACTS.md` + skill `tronhanh-schema` |

## Bản đồ tài liệu

```
/CLAUDE.md                    LUẬT. Nạp tự động. Đọc trước mọi thứ.
docs/
  A_PRD_TroNhanh_MVP.md       PRD nền CP3 — GIỮ NGUYÊN, vẫn hiệu lực
  B_AGENT_RULES.md            luật CP3 — đã được hợp nhất & mở rộng vào /CLAUDE.md
  C_BUILD_PLAN.md             plan CP3 — đã xong phần lớn, giữ làm lịch sử
  02_Technical_..._v2.md      đặc tả kỹ thuật (nguồn enum/BR)
  03_..._SRS_v2.md            SRS
  cp4/
    00_README_CP4.md          ← bạn đang ở đây
    01_PRD_CP4.md             LÀM GÌ: 5 luồng bắt buộc + 4 extras + AC
    02_SCHEMA_DECISIONS.md    DB: 9 migration, RLS, quyết định + deviation
    03_RPC_CONTRACTS.md       14 RPC: signature + assert quyền bên trong
    04_FRONTEND_ARCH.md       service layer, React Query, ~20 route mới, guard, styling
    05_BUILD_PLAN_CP4.md      LÀM THEO THỨ TỰ NÀO: 31 task, phụ thuộc, đường tới hạn
    06_QA_CHECKLIST.md        KIỂM THẾ NÀO: 4 account demo, click-path 5 luồng, RLS test
    07_RISKS.md               12 rủi ro + cách xử lý
    tasks/T01..T31_*.md       31 task, mỗi file = 1 phiên agent ≈ 1 PR
.claude/skills/
  tronhanh-schema/            viết migration + RLS đúng luật
  tronhanh-service/           viết service/hook đúng ranh giới shell
  tronhanh-ui/                dựng screen mới đúng design system
  tronhanh-qa/                tự kiểm DoD + AC trước khi báo xong
```

## Vấn đề CP4 giải quyết

Prototype hiện tại **đã chạy thật** phần lõi CP3: auth, RLS, đăng tin, boost, quản lý khu/phòng, ghi điện nước → hóa đơn → VietQR. Nhưng 5 luồng CP4 yêu cầu test được thì:

| Luồng | Trạng thái đầu CP4 |
|---|---|
| 1. Đăng tin cho thuê | ✅ Chạy — nhưng **không có upload ảnh thật** (URL Unsplash băm từ UUID) |
| 2. Đăng tin tìm phòng | ❌ Không có form. Bảng thiếu 15 cột. Card **hardcode** mọi field |
| 3. Đăng tin ở ghép | ❌ Cùng vấn đề |
| 4. Review — 3 nghĩa: đánh giá chủ trọ · kiểm duyệt tin · chủ trọ duyệt tin nhu cầu | ❌ Cả 3 đều chưa có |
| 5. Quản lý khu & nhà trọ | ⚠️ Chạy nhưng **3 lệnh ghi vi phạm CHECK constraint**; không thêm được người ở |

Cộng thêm 2 lỗ hổng nền: **không có `tsconfig.json`, `typescript` chưa cài** (zero type-check trên ~11k dòng) và **Supabase CLI chưa init** (migration đầu paste tay).

## 3 luật mới, đọc kỹ trước khi viết dòng SQL đầu tiên

Đây là 3 thứ sẽ tốn nhiều nhất nếu bỏ qua. Chi tiết ở `/CLAUDE.md` §3.1, §3.2, §8.2.

1. **Policy không được inline `exists()` vào bảng caller đọc không được** → phải bọc `security definer`. Sai thì list rỗng **không có lỗi**, chỉ có bí ẩn.
2. **Không bao giờ public SELECT lên `properties`** → RLS là row-level, `bank_account_number` sẽ public. Dùng view allow-list cột.
3. **Split-on-touch** → chỉ tái cấu trúc vùng phải sửa; >600 dòng sau khi sửa thì split là DoD.

## Quy tắc giao việc

- Đưa agent **đúng 1 file task**, không đưa cả folder.
- Agent tự đọc `/CLAUDE.md` + các doc mà file task trỏ tới. Không cần paste PRD.
- Yêu cầu agent **tự kiểm DoD** trước khi báo xong (skill `tronhanh-qa`).
- Xong DoD → merge → mới sang task sau. `⇄` trong plan = chạy song song được.

## Đường tới hạn (critical path)

```
T02 → T03 → T04 → T10 → T11a/b → T11c → T17 → T24 → T26
```

**Nếu thiếu thời gian:** cắt `T27` (`/chu-tro/hoa-don`) và `T31` (Nấc B typecheck).
**KHÔNG cắt** `T21` (kiểm duyệt) và `T26` (review) — đắt nhất nhưng cũng là 2 thứ ấn tượng nhất khi demo.

## 2 việc phải làm tay trên Supabase Dashboard (không có trong task nào)

1. **TẮT email confirmation** (Auth → Providers → Email). Nếu không, mọi account demo fail ở bước register → login.
2. **Tạo Admin đầu tiên** bằng SQL snippet (xem `06_QA_CHECKLIST.md`). Cố ý không có đường tự động — một hàm `claim_admin` client-callable là backdoor sẽ sống sót vào production.
