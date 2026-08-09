# ĐẶC TẢ KỸ THUẬT DỰ ÁN — TRỌ NHANH
## Technical Project Specification — v2

Trọ Nhanh là nền tảng Web/Mobile tìm thuê và quản lý phòng trọ, căn hộ dịch vụ — gồm hai trụ cột **Marketplace** (tìm & đăng tin) và **SaaS quản lý vận hành** cho chủ trọ. Tài liệu này là **nguồn chân lý** của dự án: đặc tả toàn bộ chức năng, dữ liệu, luồng nghiệp vụ, phân quyền và lộ trình. Khi tài liệu khác mâu thuẫn với tài liệu này, theo tài liệu này. Mỗi lựa chọn thiết kế đi kèm lý do và trade-off.

---

## 0. THUẬT NGỮ NHANH (đọc trước cho đỡ rối)

| Thuật ngữ | Giải thích ngắn gọn |
|---|---|
| **Marketplace** | Phần "chợ" đăng tin – tìm kiếm – liên hệ giữa người thuê và người cho thuê. Miễn phí cho người thuê. |
| **SaaS / Workspace** | Bộ phần mềm quản lý vận hành phía chủ trọ (khu, phòng, người ở, hợp đồng, hóa đơn, thuế, báo cáo). Trả phí theo gói. |
| **Domain (bounded context)** | Một *vùng nghiệp vụ* có ranh giới rõ, dữ liệu và quy tắc riêng, hạn chế phụ thuộc chéo. Hệ thống có 2 domain + 1 shared kernel. |
| **Shared Kernel** | Nhóm năng lực **dùng chung** cho cả 2 domain (Auth, Profile, Media, Notification, Messaging). |
| **Gating** | Cơ chế *cổng kiểm soát quyền* — quyết định user được vào dùng tính năng nào dựa trên trạng thái gói (đã mua chưa, còn hạn không). |
| **TRIAL (dùng thử)** | Trạng thái cho chủ trọ dùng Workspace **miễn phí có thời hạn** (mặc định 1 tháng) trước khi mua. |
| **Actor / Role** | *Vai trò* của một tài khoản đăng nhập (Guest/Renter/Seller/Admin/Moderator). Role **cộng dồn**, không loại trừ (mục 1.8). |
| **Entity** | Một *bảng dữ liệu* (vd Room, Contract). "Hệ thống lưu cái gì". Entity KHÁC với Role. |
| **Property (Khu trọ)** | Một khu/tòa nhà chứa nhiều phòng — cấp 1 của SaaS. |
| **Room (Phòng)** | Một phòng cụ thể bên trong Property — cấp 2 của SaaS. |
| **Occupancy (Người ở)** | *Bản ghi* "ai đang ở phòng nào" do chủ trọ quản lý. Có thể gắn tài khoản Renter (`userId`) hoặc chưa gắn (chỉ tên + SĐT). Là **entity, không phải role**. |
| **Renter** | *Tài khoản* người đi thuê. Người đang ở nếu có tài khoản chính là một Renter được gắn vào phòng. |
| **Verified review** | Đánh giá *chỉ người ở đã xác thực* (gắn `Contract` + liên kết đã xác nhận) mới được viết — chống review giả. |
| **Soft delete (xóa mềm)** | Đánh dấu đã xóa (ẩn khỏi danh sách) nhưng giữ trong DB để khôi phục/đối chiếu. |
| **Read-only (chỉ đọc)** | Vẫn xem/xuất được dữ liệu nhưng không tạo/sửa/xóa. |
| **Boost (đẩy tin)** | Trả phí để tin đăng được ưu tiên hiển thị. |
| **Zone** | Vùng chức năng bên trong một shell, phân theo điều kiện truy cập (mục 1.6): zone Tin đăng (free) và zone SaaS (gating). |

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Hai trụ cột của hệ thống

Trọ Nhanh là nền tảng Web/Mobile gồm **hai trụ cột** chạy trên cùng một hệ thống tài khoản và dữ liệu:

**Trụ cột A — Marketplace (đăng tin & tìm kiếm):**
Kết nối nhu cầu thuê và cho thuê bất động sản lưu trú (phòng trọ, căn hộ dịch vụ, căn hộ chung cư). Gồm: tin cho thuê do Seller đăng (`RentalListing`), tin tìm phòng và tin tìm người ở ghép do Renter đăng, cùng tìm kiếm/lọc, yêu thích, **đánh giá khu trọ (verified)**, kiểm duyệt và báo cáo vi phạm. Người dùng liên hệ với người đăng qua **hai kênh: nhắn tin trong app và gọi điện**.

**Trụ cột B — SaaS quản lý vận hành (cho Seller):**
Công cụ quản lý tài sản cho thuê theo cấu trúc hai cấp **Property (khu) → Room (phòng)**. Seller quản lý người ở (`Occupancy`), hợp đồng (`Contract` — lưu scan, không ký điện tử), hóa đơn/chi phí (`Invoice/InvoiceItem`), chỉ số điện nước (`UtilityReading`), ghi nhận thu (`Payment`), nhắc hạn (`Notification`), báo cáo vận hành (Dashboard) và **hỗ trợ thuế (Tax Support)**. Truy cập theo gói SaaS (`UserSubscription`).

Hai trụ cột liên kết qua hành động **"Tạo tin đăng từ phòng trống"** và cơ chế **gắn tin đăng vào khu** (`RentalListing.propertyId`). Room và RentalListing là hai entity độc lập về vòng đời, nhưng có **quy tắc đồng bộ chống tin ảo** (BR-027): phòng đã có người thuê thì tin gắn với phòng đó không được tiếp tục hiển thị như phòng trống.

### 1.2 Cơ chế thanh toán (nền tảng KHÔNG giữ tiền)

Nền tảng **không cầm, không trung chuyển tiền thuê** giữa người ở và chủ trọ (tránh nghĩa vụ pháp lý của trung gian thanh toán — AS-002). Hai dòng tiền tách bạch bằng **hai entity khác nhau**:

- **Tiền thuê (Renter/người ở → chủ trọ), ngoài nền tảng:** mỗi **Property** lưu thông tin nhận tiền riêng (ngân hàng, STK, tên chủ TK → sinh **VietQR**). Hóa đơn xuất kèm STK + VietQR (QR nhúng **số tiền** và **nội dung chuyển khoản = mã hóa đơn** để chủ trọ đối chiếu tay dễ). Người ở chuyển khoản thẳng hoặc trả tiền mặt; chủ trọ bấm "Đã thu" → ghi bản ghi `Payment` (`Cash`/`BankTransfer`). App chỉ **ghi nhận**, không đối soát ngân hàng (để dành tương lai).
- **Phí nền tảng (Seller → Trọ Nhanh), qua payment gateway:** boost và gói SaaS đi qua VNPay/cổng nội địa, ghi vào entity `PlatformTransaction` (trạng thái `Pending/Success/Failed`, có `idempotencyKey` chống tính phí trùng, kích hoạt quyền lợi **chỉ tại webhook** — mục 4.9).

> **Lý do tách 2 entity:** hai nghiệp vụ khác hẳn nhau — một bên là *ghi chép tay* của chủ trọ (không có gateway, không có trạng thái chờ), một bên là *giao dịch điện tử* (có Pending/Failed, webhook, idempotency). Gộp chung một bảng `Payment` với FK nullable chéo nhau dễ sinh bản ghi "mồ côi" và validation rối.

### 1.3 Ranh giới hệ thống (System Boundary)

**Trong phạm vi:** 19 module ở Mục 3; web responsive + mobile app (giai đoạn sau); backend API; database; lưu trữ file (ảnh tin, scan hợp đồng, file hóa đơn/template thuế); nhắn tin trong app; đánh giá khu trọ; hỗ trợ tính thuế cho thuê cơ bản; hiển thị STK/QR và ghi nhận thanh toán.

**Ngoài phạm vi:** ký hợp đồng điện tử; đặt lịch xem phòng có cấu trúc; cầm/thu hộ tiền thuê và đối soát ngân hàng tự động; eKYC; dịch vụ môi giới; kê khai/nộp thuế chính thức thay người dùng; **tích hợp Zalo** (không nút, không deep link — AS-001).

### 1.4 Hệ thống ngoài cần tích hợp (External Systems)

| Hệ thống ngoài | Mục đích | Ghi chú |
|---|---|---|
| SMS / Email gateway | OTP; nhắc hạn HĐ/thanh toán/gia hạn gói; báo tin nhắn mới | Bắt buộc cho Notification |
| Map service | Hiển thị vị trí phòng, tính khoảng cách tiện ích | Geocoding địa chỉ khi đăng tin (AS-018) |
| Payment gateway (VNPay/cổng nội địa) | Thu **phí nền tảng** (boost + gói SaaS) từ Seller, qua `PlatformTransaction` + webhook | KHÔNG xử lý tiền thuê (AS-002) |
| Object/Cloud storage | Ảnh tin, scan hợp đồng, file hóa đơn & template thuế | DB chỉ lưu URL; file riêng tư phân quyền |

### 1.5 Cơ chế liên hệ giữa người dùng

Đúng **hai kênh**: **Nhắn tin** (in-app, không lộ SĐT — kênh khuyến khích) và **Gọi điện** (hiển thị `contactPhone`, chỉ hiện đầy đủ khi đã đăng nhập — BR-014). **Không tích hợp Zalo**; người dùng tự lấy SĐT hiển thị để dùng Zalo bên ngoài nếu muốn. Không được tạo hội thoại với tin của **chính mình** (self-contact, BR-030).

### 1.6 Kiến trúc 2 Domain + Shared Kernel; frontend 2 shell + 2 zone

Để hai nhóm Dev phát triển song song mà ít giẫm chân, hệ thống tách rõ thành **2 bounded context** và **1 shared kernel**. Đây là tách **logic** (cùng 1 codebase backend, cùng 1 database) — KHÔNG phải tách 2 service/2 DB riêng.

> **Lý do không tách hẳn 2 service + 2 DB:** nhiều flow đi xuyên 2 domain trong một thao tác (vd tạo `Contract` → đổi `RoomStatus` → sinh `Notification`). Nếu 2 DB riêng, các thao tác này mất tính `transaction` (đảm bảo "thành công hết hoặc rollback hết"), phải xử lý bằng saga/event — phức tạp gấp nhiều lần, quá sức cho team nhỏ. Tách logic giữ được transaction đơn giản mà vẫn có ranh giới sạch để **sẵn sàng tách service sau này**.

**Domain A — Marketplace** (hướng người thuê, public): tin cho thuê + tin nhu cầu (Module 3, 4); tìm kiếm & lọc (12); yêu thích (11); đánh giá khu trọ (19); kiểm duyệt & báo cáo (13 phần tin, 14).

**Domain B — Property Management / SaaS** (hướng chủ trọ, có gating): khu & phòng (5, 6); người ở & hợp đồng (7, 8); hóa đơn/điện nước/thu tiền (9); gói SaaS (15); dashboard vận hành (16); hỗ trợ thuế (18).

**Shared Kernel** (dùng chung): Auth & User (1); Profile (2); Notification & Reminder (10); Messaging (17); Media (xuyên suốt).

**Nguyên tắc phụ thuộc:** Marketplace và SaaS **được phép gọi xuống** Shared Kernel, nhưng **không gọi chéo trực tiếp** vào table của nhau — giao tiếp qua *interface* nội bộ. Các điểm nối hợp lệ giữa 2 domain (một chiều, qua interface): (a) "Tạo tin từ phòng trống" (SaaS → Marketplace); (b) đồng bộ trạng thái tin khi Room đổi trạng thái (SaaS → Marketplace, BR-027); (c) Marketplace đọc dữ liệu Review/avgRating gắn Property; (d) ReviewService đọc Contract/Occupancy để xác minh quyền review.

**Frontend — tách 2 shell, shell Workspace chia 2 zone:**

| Shell | Phạm vi route | Người dùng | Nhóm Dev |
|---|---|---|---|
| **Public/Renter shell** | `/`, `/tim-phong`, `/phong/{id}`, `/khu-tro/{slug}`, `/tai-khoan/*` | Guest, Renter | Nhóm A |
| **Management Workspace shell** | `/chu-tro/*` | Seller | Nhóm B |

Bên trong shell Workspace:

| Zone | Màn hình | Điều kiện vào | Gating? |
|---|---|---|---|
| **Zone Tin đăng** (Marketplace) | B4 Quản lý tin, B5 Đăng tin cho thuê | Role Seller | **KHÔNG** — Marketplace luôn miễn phí |
| **Zone Quản lý vận hành** (SaaS) | B1–B3, B6–B16 | Role Seller + `workspaceStatus ∈ {TRIAL, ACTIVE}` | Có; `READ_ONLY` chỉ đọc; `NONE` thấy màn mời dùng thử |

Sidebar Workspace hiển thị đúng 2 nhóm ("Tin đăng — miễn phí" / "Quản lý vận hành — SaaS") để chủ trọ luôn thấy rõ cái gì free, cái gì thuộc gói — vừa minh bạch vừa là điểm chạm upsell tự nhiên.

Hai shell **chung component library, chung API client, chung 1 web app** (route-prefix khác nhau) — chưa tách subdomain để khỏi tốn 2 build/deploy. Ranh giới thiết kế sao cho **về sau tách `app.tronhanh.vn` chỉ là đổi routing**, không phải viết lại.

### 1.7 Mô hình Gating SaaS — 4 trạng thái & luồng truy cập Workspace

Hệ thống tách bạch **hai khái niệm** để mô hình freemium rõ ràng:

- **Năng lực Seller trên Marketplace** (đăng tin cho thuê, boost, nhắn tin): **miễn phí**, tự kích hoạt (mục 1.8).
- **Workspace quản lý vận hành** (Property/Room/Occupancy/Contract/Invoice…): nằm **sau cổng gating**, vào bằng `TRIAL` hoặc `ACTIVE`.

**Bốn trạng thái Workspace** (suy từ `UserSubscription`; chưa có bản ghi = NONE):

| Trạng thái | Điều kiện | Quyền trong Workspace |
|---|---|---|
| **NONE** | Chưa từng kích hoạt gói/TRIAL | Zone Tin đăng dùng bình thường; zone SaaS chỉ thấy màn mời dùng thử (B1) |
| **TRIAL** | Bấm dùng thử (mỗi Seller 1 lần) | Dùng gần như đầy đủ; hạn mức lấy từ **plan Trial** (mặc định `maxProperties=1`, `maxRooms=5`, `trialDays=30` — Admin cấu hình được) |
| **ACTIVE** | Đã mua, còn hạn | Đầy đủ theo `maxProperties/maxRooms` của gói |
| **READ_ONLY** | Hết hạn TRIAL/ACTIVE | Chỉ xem/xuất; **không** tạo/sửa/xóa (BR-015); **dữ liệu giữ nguyên** |

> **Lý do có TRIAL:** hạ rào cản để chủ trọ trải nghiệm trọn luồng "ghi điện nước → hóa đơn kèm VietQR" trước khi trả tiền. Hết TRIAL không mua → READ_ONLY, **không xóa dữ liệu** (mất dữ liệu vận hành của chủ trọ là tối kỵ).

**Luồng truy cập Workspace (golden path):**
1. Account mặc định là **Renter** → dùng Marketplace.
2. Bấm "Quản lý khu trọ"/"Dashboard chủ trọ" lần đầu → kích hoạt năng lực **Seller** (mục 1.8) → vào Workspace, zone SaaS ở `NONE` → màn B1 có **hai lối rõ ràng**: *"Đăng tin cho thuê (miễn phí)"* và *"Dùng thử bộ quản lý (TRIAL)"* — không ép người chỉ muốn đăng tin phải đi qua màn chào bán.
3. Chọn dùng thử → tạo `UserSubscription` status=`Trial` → **onboarding wizard 3 bước**: (a) tạo Property + thông tin nhận tiền (→ VietQR); (b) thêm Room; (c) (tùy chọn) Occupancy + Contract → Dashboard.
4. Mua/gia hạn gói → luồng thanh toán phí nền tảng (mục 4.9) → `ACTIVE`.
5. Gần hết hạn → Notification nhắc (BR-017). Hết hạn → job tự chuyển `READ_ONLY`; **Marketplace & Messaging KHÔNG bị ảnh hưởng**.
- **Ngoại lệ:** chạm `maxProperties/maxRooms` → chặn tạo mới, gợi ý gia hạn với gói lớn hơn. **Over-limit** (gia hạn gói nhỏ hơn dữ liệu hiện có): giữ nguyên dữ liệu, chỉ **chặn tạo mới** cho tới khi về dưới hạn mức — nhất quán tinh thần "không bao giờ xóa dữ liệu" (BR-015).

**Quan trọng:** gating chỉ khóa **quyền ghi** của các module SaaS. Marketplace (đăng tin, boost, nhắn tin, gọi) **luôn miễn phí và không bị gating**.

### 1.8 Mô hình Role: cộng dồn theo hành vi — không có "đăng nhập theo vai trò"

**Nguyên tắc lõi:** role là **cộng dồn (additive)**, không phải **chuyển đổi (switching)**. Quan hệ `User` ↔ `Role` là n-n; quyền hiệu lực của một phiên = **hợp (union)** quyền của mọi role tài khoản đang có. Vì mọi permission đều là dạng *allow* (không tồn tại permission *deny*), union không bao giờ sinh mâu thuẫn — thêm role chỉ mở thêm quyền.

> **Lý do chọn additive thay vì bắt chọn vai trò lúc đăng ký:** ranh giới Renter/Seller ngoài đời rất mờ (chủ trọ vẫn đi tìm phòng; người thuê có thể đăng tin hộ). Bắt chọn sớm tăng friction đăng ký và đẻ ra luồng "chuyển đổi tài khoản" phức tạp. **Trade-off:** UI phải tự gánh việc phân ngữ cảnh (giải ở 1.6 bằng 2 shell + 2 zone); đổi lại backend RBAC đơn giản và mỗi người chỉ cần một tài khoản.

**1.8.1 Vòng đời role:**

| Bước | Sự kiện | roles sau sự kiện | Ghi chú |
|---|---|---|---|
| 1 | Đăng ký (SĐT + OTP) | `[Renter]` | Mặc định mọi tài khoản |
| 2 | Đăng tin tìm phòng / ở ghép | `[Renter]` — không đổi | Năng lực Renter |
| 3 | **Trigger kích hoạt Seller** (một trong hai): (a) tạo `RentalListing` **đầu tiên, kể cả Draft**; (b) mở Workspace lần đầu | `[Renter, Seller]` | Idempotent. Gán role + tạo listing nằm **cùng transaction** — bất biến: *tồn tại listing có `sellerId = user` ⟹ user có role Seller* |
| 4 | Bấm "Dùng thử"/mua gói | roles không đổi; đổi `workspaceStatus` | Gating là tầng riêng, không phải role |
| 5 | (Hiếm) Admin gán/gỡ role thủ công | Theo thao tác Admin | Đường phụ; đường chính là tự kích hoạt |

**1.8.2 Hệ thống "biết vai trò" qua 2 tầng dữ liệu độc lập:**

| Tầng | Lưu ở đâu | Trả lời | Cách kiểm tra |
|---|---|---|---|
| `roles[]` | Claims trong JWT access token | "Được vào shell/nhóm endpoint nào?" | Middleware decode token — không query DB |
| `workspaceStatus` | Suy từ `UserSubscription` trong DB | "Trong Workspace được ghi hay chỉ đọc?" | Query DB (cache ngắn được) trên mỗi request vào endpoint SaaS |

> **Không nhét `workspaceStatus` vào JWT:** trạng thái gói đổi theo thời gian trong khi claims "đóng băng" đến khi token hết hạn — nhét vào sẽ có 15–30 phút hệ thống mở/khóa sai. Gating là quyết định tiền bạc, phải luôn tươi. Roles gần như bất biến → để trong token cho stateless.

**Xử lý token cũ sau khi thêm role:** sau action kích hoạt Seller thành công, **frontend gọi ngay `POST /auth/refresh`** để nhận access token mới có claims `[Renter, Seller]`, rồi mới điều hướng. (Trade-off đã cân: BE trả token trong response nghiệp vụ = trộn concern; middleware query role mỗi request = phá stateless.)

**`GET /me` là nguồn chân lý phía client:** trả `{ user, profile, roles[], workspaceStatus }`; frontend gọi sau đăng nhập/refresh để render navigation (hiện "Dashboard chủ trọ" không, zone SaaS khóa/mở). Không suy diễn từ localStorage.

**1.8.3 Route guard (frontend — chỉ là UX, backend luôn kiểm tra lại):**
1. `/chu-tro/*` chưa đăng nhập → `/dang-nhap?redirect=…`.
2. `/chu-tro` (entry) đăng nhập nhưng chưa có Seller → **không chặn**: đây chính là điểm kích hoạt (trigger b).
3. Route con zone SaaS → đọc `workspaceStatus`: `NONE` → B1; `READ_ONLY` → chế độ chỉ đọc. Backend trả 403 mã `WORKSPACE_READ_ONLY` khi ghi bị chặn; FE bắt mã này hiện modal mời gia hạn **không mất dữ liệu form đang nhập**.

**Quy ước redirect toàn hệ thống:** mọi tình huống Guest bị yêu cầu đăng nhập (nhắn tin, lưu tin, xem SĐT, đăng tin) đều mang `?redirect=` — đăng nhập/đăng ký xong quay về đúng ngữ cảnh (mở lại modal liên hệ, giữ form đang nhập).

---

## 2. DANH SÁCH ACTOR VÀ QUYỀN HẠN

> Chỉ có **5 actor (role)**. "Người ở trọ" KHÔNG phải role — có tài khoản thì là **Renter** được gắn vào phòng; chưa có thì là bản ghi **Occupancy** do chủ trọ quản lý.

| Actor | Mô tả | Quyền chính |
|---|---|---|
| **Guest** | Khách chưa đăng nhập | Xem tin public, tìm kiếm/lọc, xem chi tiết, xem đánh giá khu, xem SĐT che một phần (BR-014), đăng ký/đăng nhập |
| **Renter** | Người dùng đã đăng nhập (mặc định mọi tài khoản) | Quyền Guest + nhắn tin/gọi người đăng, lưu tin yêu thích, đăng/quản lý tin tìm phòng & ở ghép, nhận gợi ý phòng, báo cáo vi phạm. Nếu được gắn vào phòng (liên kết **đã xác nhận** — BR-029) → "Phòng của tôi" (V1, chỉ xem HĐ/hóa đơn) + viết đánh giá khu đã ở (V1) |
| **Seller** | Người đăng & quản lý tin cho thuê — Chủ BĐS hoặc người được ủy quyền (cò trọ). Nền tảng không môi giới | Đăng & quản lý `RentalListing`; boost; nhắn tin; (qua gating) quản lý Property/Room/Occupancy/Contract/Invoice/UtilityReading/Payment; thông tin nhận tiền theo khu; công cụ thuế; dashboard; gói SaaS của mình |
| **Admin** | Quản trị hệ thống | Quản lý user, tin, danh mục (loại phòng, tiện ích, khu vực, khoảng giá, gói, cấu hình thuế, **từ khóa cấm**, **cấu hình boost**), báo cáo/khiếu nại, kiểm duyệt đánh giá, gói SaaS, dashboard tổng quan |
| **Moderator/Staff** | Nhân viên vận hành | Kiểm duyệt tin, xử lý báo cáo (tin, tin nhắn, đánh giá), khóa hội thoại, hỗ trợ khách. Không quản lý user/danh mục/gói |

Một tài khoản có thể đồng thời là **Renter** và **Seller** (BR-013, cơ chế ở 1.8). Admin/Moderator là tài khoản nội bộ, không kiêm Renter/Seller (separation of duties).

**Renter vs Occupancy (chống nhầm lẫn):**

| | Renter | Occupancy (người ở) |
|---|---|---|
| Là gì | Một **role/tài khoản** đăng nhập | Một **bản ghi dữ liệu** do Seller tạo |
| Ai tạo | Tự đăng ký | Chủ trọ nhập khi gán người vào phòng |
| Cần tài khoản? | Có | Không bắt buộc — có thể chỉ tên + SĐT |
| Thuộc về | Chính người dùng | Seller sở hữu (BR-007) |
| Liên kết | — | `userId` (nullable) + `linkStatus` (Pending/Confirmed/Rejected — BR-029) |

---

## 3. MODULE CHỨC NĂNG CHÍNH (19 MODULE)

> `[SK]` = Shared Kernel, `[MKT]` = Marketplace, `[SaaS]` = Property Management.

### Module 1 — Authentication & User Management `[SK]`
- **Mục đích:** đăng ký, đăng nhập, quản lý phiên và vai trò.
- **Chức năng con:** đăng ký bằng **SĐT** + OTP (email chỉ thêm tùy chọn ở Profile, không dùng để đăng ký); đăng nhập/đăng xuất (đăng xuất **thu hồi refresh token**); refresh token; quên mật khẩu (OTP); **đổi mật khẩu khi đã đăng nhập**; **yêu cầu xóa tài khoản** (right to erasure — soft delete User, ẩn tin, gỡ `userId` khỏi Occupancy nhưng giữ dữ liệu vận hành của Seller khác); khóa/mở khóa (Admin); tự kích hoạt role Seller (1.8) + Admin gán/gỡ thủ công; `GET /me`.
- **Rule:** SĐT duy nhất (BR-016); tài khoản Locked không đăng nhập được, **mọi tin Active của user Locked tự chuyển Hidden** (BR-028); dữ liệu SaaS giữ nguyên.

### Module 2 — Profile Management `[SK]`
- **Chức năng con:** cập nhật tên, avatar, SĐT liên hệ, email (tùy chọn); cài đặt hiển thị dashboard (BR-012). Thông tin nhận tiền đặt theo Property (Module 5), không ở Profile. `contactPhone` chưa đặt → prefill bằng `phoneNumber` tài khoản.

### Module 3 — Rental Listing Management `[MKT]`
- **Chức năng con:** tạo tin nhiều bước (cơ bản; tiện ích & mô tả; ảnh ≥ 3; chi phí; giờ giấc; **[nếu Seller có Property] bước tùy chọn "Tin này thuộc khu trọ nào?"** — gắn `propertyId` để tin nhận badge đánh giá khu); lưu Draft; gửi duyệt; sửa/ẩn/xóa (xóa mềm); **gia hạn** (BR-026); boost (BR-005, cấu hình boost do Admin đặt: `boostPrice`, `boostDays`; chỉ boost tin Active); tạo tin từ Room trống (prefill, gắn sẵn `roomId` + `propertyId`); xem tin của tôi.
- **Rule:** vòng đời BR-001; thời hạn hiển thị & gia hạn BR-026; sửa trường quan trọng phải duyệt lại — **tin ẩn tạm trong lúc chờ duyệt lại, UI cảnh báo trước khi lưu** (BR-003); đồng bộ với Room (BR-027); validation `propertyId`/`roomId` phải thuộc chính `sellerId`.

### Module 4 — Demand Posts — Tin của người tìm thuê `[MKT]`
- **Chức năng con:** tạo/sửa/ẩn/xóa, gia hạn; tin tìm phòng (khu vực, giá, loại hình, diện tích tối thiểu, tiện ích, thời điểm dọn vào); tin ở ghép (vị trí, giá chia sẻ, số người, yêu cầu, ảnh); **báo cáo tin nhu cầu** (qua Module 14).
- **Rule:** hiển thị 30 ngày → tự `Expired`, gia hạn +30 ngày **không cần duyệt lại nếu không sửa** (BR-009); tối đa 2 tin Active mỗi loại (BR-010); qua kiểm duyệt như tin cho thuê (BR-001).

### Module 5 — Property/Khu trọ Management `[SaaS]`
- **Chức năng con:** tạo/sửa/xóa Property; cấu hình nhận tiền (ngân hàng, STK, tên chủ TK → VietQR); bật/tắt hồ sơ khu public (`isPublicProfileEnabled`, opt-in); danh sách Property kèm tổng phòng & phòng trống.
- **Rule:** không xóa Property còn Room Rented/Deposited hoặc Contract Active (BR-011); hạn mức theo gói (BR-015); gating (BR-013). Tắt public/xóa mềm Property → trang khu và badge **ẩn**, review **giữ trong DB** (bật lại thì hiện lại) — BR-024.

### Module 6 — Room Management `[SaaS]`
- **Chức năng con:** thêm/sửa/xóa Room (mã phòng, tầng, diện tích, giá, tiện ích, giờ giấc, ghi chú); đổi trạng thái; lọc; "Tạo tin đăng" cho Room Available (Room đang có tin Active gắn với nó → hiện badge "Có tin đang chạy", **chặn tạo tin thứ hai** từ cùng Room).
- **Rule:** trạng thái BR-002 + đồng bộ với Contract (BR-031) và Listing (BR-027); `roomCode` unique trong Property; xóa Room chỉ khi không có Contract Active.

### Module 7 — Occupancy Management (Quản lý người ở) `[SaaS]`
- **Chức năng con:**
  - Thêm người ở theo **SĐT**: SĐT đã có tài khoản Renter → gợi ý gắn (`userId`, `linkStatus=Pending`) → **Renter nhận Notification `OccupancyLinked` và Chấp nhận/Từ chối** (BR-029); chưa có tài khoản → thêm bằng tên + SĐT (*fallback*, `userId` null), gắn sau khi người đó đăng ký (cũng qua xác nhận).
  - Một Room có thể có **nhiều Occupancy Active đồng thời** (bạn cùng phòng); Contract gắn **một Occupancy đại diện**. Kết thúc ở → set `endDate`, `isActive=false` → vào lịch sử.
  - **"Phòng của tôi" (V1):** Renter có liên kết `Confirmed` **chỉ xem** hợp đồng/hóa đơn của mình + nhận thông báo; có tab **"Lịch sử ở trọ"** (các đợt đã kết thúc) để viết đánh giá khu từng ở. *(Tự nhập điện nước, báo sự cố = V2.)*
- **Rule:** dữ liệu riêng tư của Seller (BR-007); `userId` nullable; liên kết cần xác nhận (BR-029).

### Module 8 — Contract Management `[SaaS]`
- **Chức năng con:** tạo Contract (phòng, Occupancy đại diện, ngày, tiền thuê, cọc); upload scan (tự nguyện); xem/tải (signed URL); nhắc sắp hết hạn (BR-022 nhắc tại `max(startDate, endDate − 30 ngày)`); chấm dứt sớm; yêu cầu xóa scan.
- **Rule:** trạng thái BR-006 (gồm: **mỗi Room ≤ 1 Contract Active; chặn chồng lấn thời gian; job tự chuyển Expired khi qua `endDate`**); KHÔNG ký điện tử; scan phân quyền (BR-008); đồng bộ RoomStatus (BR-031). Contract là bằng chứng mở quyền đánh giá (BR-022 mới).

### Module 9 — Payment/Invoice/Utility Tracking `[SaaS]`
- **Luồng chuẩn:** người ở gửi chỉ số qua kênh ngoài (thủ công — AS-009) → chủ trọ nhập `UtilityReading` → hệ thống tính tiền (điện = (mới − cũ) × đơn giá) → `Invoice` + `InvoiceItem` → xuất (ảnh/PDF) kèm STK + **VietQR nhúng số tiền + mã hóa đơn** → gửi (in-app nếu người ở linked Confirmed + Notification `InvoiceReceived`; hoặc tải về gửi ngoài) → chủ trọ bấm "Đã thu" → ghi `Payment`.
- **Rule:** trạng thái Invoice BR-004 (trạng thái **suy tự động từ Σ Payment so với `totalAmount`**; đường ra khỏi Overdue: thu đủ → `Paid`, thu một phần → vẫn `Overdue`); unique **`Invoice(contractId, period)`** — cho phép 2 hóa đơn cùng phòng cùng tháng khi đổi người giữa kỳ; unique **`UtilityReading(roomId, type, period)`** + field `invoiceId` đánh dấu đã lên hóa đơn nào; quá hạn → job Overdue + Notification. Nền tảng không xử lý dòng tiền (AS-002).

### Module 10 — Notification & Reminder `[SK]`
- **Chức năng con:** báo duyệt/từ chối tin; báo tin nhắn mới; **báo được gắn vào phòng (`OccupancyLinked`)**; **báo tin tự chuyển Rented (`ListingAutoRented`)**; **báo có hóa đơn (`InvoiceReceived`)**; nhắc Contract sắp hết hạn; nhắc Invoice đến hạn/quá hạn; nhắc gia hạn gói (6/2/1 tháng — BR-017); nhắc TRIAL sắp hết; báo kết quả xử lý đánh giá; báo tin đã lưu đổi trạng thái; đánh dấu đã đọc.

### Module 11 — Favorite/Saved Posts `[MKT]`
- **Chức năng con:** lưu/bỏ lưu `RentalListing`; danh sách đã lưu; báo khi tin đã lưu đổi trạng thái (qua Module 10).

### Module 12 — Search & Filter `[MKT]`
- **Chức năng con:** tìm theo từ khóa/khu vực; lọc giá, loại hình, diện tích, tiện ích, giờ giấc; sắp xếp; phân trang; gợi ý phòng theo nhu cầu Renter; lọc/sắp xếp theo điểm đánh giá khu.
- **Rule:** chỉ trả tin Active; boost xếp trước (BR-005). **Lọc theo điểm đánh giá chỉ áp cho tin có review, kèm toggle "gồm tin chưa có đánh giá" (mặc định BẬT)**; sort theo điểm đẩy tin chưa có điểm xuống cuối thay vì loại bỏ.

### Module 13 — Admin Management `[MKT]/[SK]`
- **Chức năng con:** quản lý user; hàng đợi duyệt tin (3 loại); hàng đợi kiểm duyệt đánh giá; danh mục (loại phòng, Amenity, khu vực, khoảng giá, `SubscriptionPlan` + plan Trial, `TaxSetting`, **danh sách từ khóa cấm `BannedKeyword`**, **cấu hình boost**); dashboard hệ thống.
- **Rule:** mọi hành động duyệt/từ chối/khóa ghi lý do (audit).

### Module 14 — Report/Complaint Management `[MKT]`
- **Chức năng con:** báo cáo **tin cho thuê / tin nhu cầu / tin nhắn / đánh giá**; hàng đợi xử lý; hành động (giữ/ẩn/từ chối, **khóa hội thoại**, khóa user, ẩn review); phản hồi người báo cáo.
- **Rule:** tin ≥ 3 report chưa xử lý tự chuyển PendingApproval và tạm ẩn (BR-018).

### Module 15 — SaaS Subscription Management `[SaaS]`
- **Chức năng con:** xem bảng gói; kích hoạt TRIAL (1 lần/Seller); mua gói (~600.000đ/3 năm — tham khảo); gia hạn ưu đãi (**đổi gói khi gia hạn được; V1 không nâng gói giữa kỳ**); xem hạn; nhắc hạn; Admin CRUD `SubscriptionPlan`, xem/hủy (`Cancelled` — chỉ Admin thao tác khi xử lý khiếu nại/hoàn tiền) `UserSubscription`.
- **Rule:** BR-015 (gồm over-limit ở 1.7); thanh toán qua `PlatformTransaction` + webhook (4.9).

### Module 16 — Dashboard & Analytics `[SaaS]`
- **Chức năng con (Seller):** số phòng trống (luôn hiện); tỷ lệ lấp đầy; **doanh thu thu được theo kỳ, tổng số phòng, số khách đang ở — cả ba theo toggle, mặc định TẮT** (BR-012); phòng sắp hết hạn HĐ; phòng chưa thanh toán.
- **Chức năng con (Admin):** tổng user/tin/doanh thu phí nền tảng theo thời gian.
- **Chức năng con (hệ thống):** ghi `ContactEvent` (nhắn tin/gọi) phục vụ thống kê tương tác tin.
- **Rule:** dashboard Seller riêng tư tuyệt đối (BR-007).

### Module 17 — Messaging/Chat (in-app) `[SK]`
- **Phạm vi:** UI từ MVP; nghiệp vụ đầy đủ V1; realtime polling → WebSocket (AS-011).
- **Chức năng con:** hội thoại 1-1 gắn một tin (cho thuê hoặc nhu cầu); gửi/nhận text; đã đọc; danh sách hội thoại; chặn; báo cáo tin nhắn.
- **Rule:** chỉ user đăng nhập (BR-019); không tạo hội thoại với tin Expired/Rented/Hidden; **không tạo hội thoại với tin của chính mình** (BR-030); chặn theo phạm vi **Conversation** (block user toàn cục = V2); mỗi cặp (người khởi tạo, tin) chỉ có một Conversation — mở lại hội thoại cũ.

### Module 18 — Tax Support `[SaaS]`
- **Chức năng con:** chọn kỳ; tổng hợp doanh thu — **căn cứ: tổng `Payment` đã ghi nhận trong năm (cash basis)**, MVP cho nhập tay; tính GTGT & TNCN ước tính theo `TaxSetting`; xuất template tờ khai (PDF, private); lưu `TaxDeclaration`.
- **Rule:** chỉ tham khảo, luôn disclaimer; thuế suất/ngưỡng cấu hình, **cần kiểm chứng theo quy định thuế từ kỳ 2026** (BR-021).

### Module 19 — Review/Đánh giá khu trọ `[MKT]`
- **Mục đích:** người ở thật đánh giá **Property** để người thuê yên tâm trước khi cọc.
- **Phạm vi:** V1 (phụ thuộc Occupancy linked Confirmed + Contract).
- **Chức năng con:** viết đánh giá (sao 1–5 + nội dung ≤ 1.000 ký tự); mỗi đợt ở (`contractId`) một review, sửa trong **7 ngày**; hiển thị badge điểm trên tin của khu + trang khu public `/khu-tro/{slug}`; báo cáo/ẩn review (Module 14); Seller xem đánh giá khu mình (phản hồi = V2).
- **Rule (BR-022/023/024 bản mới):** verified-only; **cấm chủ khu tự review khu mình**; điều kiện mở: Contract tồn tại ≥ 30 ngày HOẶC đã có ≥ 1 Payment; viết & lưu được bất kể khu bật public hay chưa — **chỉ hiển thị khi khu bật public**.

---

## 4. FLOW NGHIỆP VỤ CHI TIẾT

### 4.1 Guest tìm kiếm & xem chi tiết tin
1. Trang chủ → tìm theo khu vực/từ khóa → lọc → kết quả (boost trước, BR-005).
2. Chi tiết tin: gallery, chi phí, tiện ích, giờ giấc, thời điểm đăng/cập nhật, badge điểm khu (nếu tin gắn Property), khối liên hệ (SĐT che một phần + mời đăng nhập kèm `?redirect=`), nút Báo cáo tin.
- **Ngoại lệ:** không có kết quả → gợi ý nới bộ lọc.

### 4.2 Renter liên hệ & nhắn tin với người đăng
1. Đăng nhập → "Nhắn tin" (in-app) hoặc "Gọi" (hiện SĐT đầy đủ).
2. Kiểm tra: tin không Expired/Rented/Hidden (BR-019); **không phải tin của chính mình** (BR-030) → tạo/mở `Conversation` → gửi `Message` → Notification → polling → đã đọc. Ghi `ContactEvent`.
3. Chặn/báo cáo tin nhắn (BR-020).

### 4.3 Seller đăng tin cho thuê (gồm kích hoạt Seller lần đầu)
1. Từ header public "Đăng tin → Tin cho thuê" → `/dang-tin-cho-thue` (zone Tin đăng, miễn phí). User chưa có role Seller vẫn vào được — chính hành động tạo listing đầu tiên sẽ kích hoạt Seller.
2. Form nhiều bước: (1) cơ bản → (2) tiện ích & mô tả → (3) ảnh ≥ 3 → (4) chi phí → (5) giờ giấc → (6) *[chỉ hiện khi Seller có Property]* chọn khu trọ (tùy chọn, gắn `propertyId`).
3. Lưu bản ghi đầu tiên (kể cả Draft) → backend gán role Seller **cùng transaction** → FE gọi `POST /auth/refresh` → tiếp tục.
4. Gửi → validate + lọc `BannedKeyword` → `PendingApproval` → Moderator duyệt → `Active` (đặt `expireAt = approvedAt + 60 ngày`, BR-026) / `Rejected` (kèm lý do) → Notification.
5. (Tùy chọn) boost → luồng 4.9 → `boostExpireAt = now + boostDays`.
6. Sau khi gửi từ luồng "tạo tin từ phòng" → quay về B4 (Quản lý tin).

### 4.4 Chủ trọ mở Workspace lần đầu & dùng thử
1. Bấm "Quản lý khu trọ"/"Dashboard chủ trọ" → kích hoạt Seller (nếu chưa) → B1 với **2 lối**: "Đăng tin (miễn phí)" / "Dùng thử bộ quản lý".
2. Chọn dùng thử → tạo `UserSubscription` (`Trial`, `expireDate = now + trialDays` của plan Trial) → wizard 3 bước → Dashboard.
3. Muốn dùng tiếp → mua gói (4.9) → `ACTIVE`. Hết hạn → job chuyển `READ_ONLY`.
- **Ngoại lệ:** đã dùng TRIAL → chỉ còn lối mua gói; chạm hạn mức → chặn tạo mới + gợi ý gói lớn hơn.

### 4.5 Seller quản lý người ở (Occupancy) — có xác nhận liên kết
1. Chi tiết Room → "+ Thêm người ở" → nhập SĐT → tra tài khoản:
   - **Có tài khoản:** hiện tên → Seller bấm gắn → tạo Occupancy `linkStatus=Pending` → Notification `OccupancyLinked` cho Renter → Renter **Chấp nhận** (`Confirmed` — mở "Phòng của tôi" + quyền review) hoặc **Từ chối** (`Rejected` — Occupancy giữ dạng fallback, `userId` gỡ về null).
   - **Chưa có:** nhập tên + SĐT (fallback, `userId` null); khi người đó đăng ký, Seller gắn sau — cũng qua xác nhận.
2. Bổ sung ngày bắt đầu, số người, ghi chú → Lưu. Một phòng có thể nhiều Occupancy Active (ở ghép).
3. Rời đi → "Kết thúc ở" → set `endDate`, `isActive=false` → lịch sử; nếu Contract gắn Occupancy này kết thúc → gợi ý đổi RoomStatus (BR-031).

### 4.6 Seller ghi điện nước → hóa đơn → ghi nhận thu (luồng cốt lõi)
1. Người ở gửi chỉ số qua kênh ngoài (thủ công).
2. Nhập `UtilityReading` cho từng Room có Contract Active (chặn trùng theo unique roomId+type+period; chỉ số mới ≥ cũ).
3. Tạo `Invoice` (unique theo contractId+period) + `InvoiceItem`; reading dùng cho hóa đơn được đánh dấu `invoiceId`.
4. Xuất PDF/ảnh kèm STK + **VietQR nhúng amount + mã hóa đơn** → gửi in-app (linked Confirmed) hoặc tải về gửi ngoài.
5. Nhận tiền ngoài nền tảng → bấm "Đã thu" (đủ/một phần) → ghi `Payment` → **status Invoice suy tự động** từ ΣPayment: đủ → `Paid`; một phần trước hạn → `PartiallyPaid`; qua `dueDate` chưa đủ → job set `Overdue` (thu tiếp một phần vẫn `Overdue`, thu đủ → `Paid`).

### 4.7 Renter viết đánh giá khu trọ (V1)
1. Entry: "Phòng của tôi" (đang ở) **hoặc tab "Lịch sử ở trọ"** (từng ở) → mục "Đánh giá khu".
2. Điều kiện (BR-022 mới): liên kết `Confirmed`; có Contract tại Property; **không phải chủ khu**; Contract ≥ 30 ngày tuổi hoặc có ≥ 1 Payment; đợt ở này chưa review (BR-023).
3. Chọn sao + nội dung → lưu `Review` (`Visible`) → cập nhật `avgRating`, `reviewCount` của Property.
4. Hiển thị: trang khu public + badge trên tin gắn `propertyId` — **chỉ khi khu đang bật public** (BR-024). Khu chưa bật → review vẫn lưu, chờ chủ bật.
- **Ngoại lệ:** đã review đợt này → chặn; sửa được trong 7 ngày.

### 4.8 Admin/Moderator kiểm duyệt
- **Duyệt tin:** hàng đợi 3 loại tin → duyệt/từ chối (lý do) → Notification. Tin sửa trường quan trọng quay lại hàng đợi (đang ẩn tạm — BR-003).
- **Xử lý báo cáo:** hàng đợi Report (tin / tin nhắn / đánh giá) → giữ/ẩn/khóa hội thoại/khóa user (khóa user → tin tự Hidden, BR-028) → phản hồi + audit.

### 4.9 Thanh toán phí nền tảng (boost & gói SaaS) — MỚI
1. Seller bấm mua (boost hoặc gói) → BE tạo `PlatformTransaction` (`Pending`, kèm `idempotencyKey`) → trả URL thanh toán VNPay.
2. Seller thanh toán trên gateway → gateway gọi **`POST /payments/webhook/vnpay`** (server-to-server) → BE verify chữ ký → set `Success`/`Failed`. **Chỉ webhook mới kích hoạt quyền lợi** (set `boostExpireAt` hoặc tạo/gia hạn `UserSubscription`) — return URL trên trình duyệt chỉ để hiển thị kết quả, vì user có thể đóng tab.
3. Giao dịch treo (`Pending` quá 15 phút không có webhook) → job đánh `Failed`; Seller thấy trạng thái ở màn gói/tin của mình, bấm thử lại (idempotencyKey mới).

---

## 5. BUSINESS RULES

> BR-001 → BR-021 giữ mã cũ (một số được **sửa nội dung**); BR-026 → BR-031 là **rule mới**. Các BR có ảnh hưởng kiến trúc có mục riêng kèm lý do.

| BR | Nội dung |
|---|---|
| **BR-001** | Vòng đời tin: `Draft → PendingApproval → Active → (Expired/Rented/Hidden/Rejected)`; áp dụng cả tin cho thuê và tin nhu cầu thuê. |
| **BR-002** | Trạng thái phòng: `Available ⇄ Deposited ⇄ Rented; Available ⇄ Hidden`; đồng bộ với Contract theo BR-031. |
| **BR-003** *(sửa)* | Sửa nội dung quan trọng của tin (giá, địa chỉ, ảnh) → duyệt lại; **tin ẨN TẠM trong lúc chờ duyệt** (V1 chấp nhận, versioning giữ bản cũ hiển thị = V2); UI cảnh báo trước khi lưu. Gia hạn không sửa nội dung → KHÔNG duyệt lại. |
| **BR-004** *(sửa)* | Trạng thái hóa đơn **suy tự động từ ΣPayment**: `Unpaid → PartiallyPaid → Paid`; qua `dueDate` chưa đủ → `Overdue`; từ `Overdue`: thu đủ → `Paid`, thu một phần → vẫn `Overdue`. |
| **BR-005** | Chỉ hiển thị tin Active; tin boost (`boostExpireAt` còn hạn) xếp trước. Chỉ boost được tin Active. |
| **BR-006** *(sửa)* | Trạng thái hợp đồng: `Draft → Active → (Expired/Terminated)`. **Mỗi Room tối đa 1 Contract Active; chặn chồng lấn khoảng thời gian; job tự chuyển `Expired` khi qua `endDate` (+ Notification).** |
| **BR-007** | Dữ liệu SaaS riêng tư tuyệt đối theo `sellerId`; Renter linked chỉ xem dữ liệu của mình; Admin truy cập ghi audit. |
| **BR-008** | Scan hợp đồng & file riêng tư: private bucket + signed URL ≤ 15 phút; chỉ Seller sở hữu + Renter liên quan (Confirmed). |
| **BR-009** | Tin nhu cầu thuê hiển thị 30 ngày → tự `Expired`; gia hạn +30 ngày (không duyệt lại nếu không sửa). |
| **BR-010** | Mỗi Renter tối đa 2 tin Active mỗi loại (tìm phòng / ở ghép). |
| **BR-011** | Không xóa Property còn Room Rented/Deposited hoặc Contract Active; xóa hợp lệ là xóa mềm. |
| **BR-012** *(sửa)* | Dashboard: "Số phòng trống" luôn hiện; **"Tổng số phòng", "Số khách đang ở" VÀ "Doanh thu" theo toggle, mặc định TẮT**. Lý do: dashboard tuy riêng tư nhưng chủ trọ hay mở nơi công cộng/chia sẻ màn hình — số nhạy cảm để chủ động bật khi cần. |
| **BR-014** | Hai kênh liên hệ: Nhắn tin (in-app, không lộ SĐT) + Gọi (hiện SĐT khi đăng nhập); Guest thấy SĐT che một phần; không Zalo. |
| **BR-016** | `phoneNumber` duy nhất toàn hệ thống, là kênh OTP và định danh đăng ký; email tùy chọn (thêm ở Profile), nếu có cũng duy nhất. |
| **BR-017** | Nhắc gia hạn gói trước `expireDate` 3 mốc: 6/2/1 tháng (kèm `renewalPrice`); nhắc TRIAL sắp hết trước 7 ngày. |
| **BR-018** | Tin ≥ 3 report chưa xử lý → tự chuyển `PendingApproval` (tạm ẩn) để rà soát. |
| **BR-019** | Chỉ user đăng nhập mới nhắn tin; không tạo hội thoại với tin Expired/Rented/Hidden; mỗi cặp (người khởi tạo, tin) một Conversation. |
| **BR-020** | Chặn & báo cáo trong chat; phạm vi chặn V1 = theo Conversation. |
| **BR-021** | Tax Support chỉ tham khảo; **căn cứ doanh thu = ΣPayment ghi nhận trong năm (cash basis)**; thuế suất/ngưỡng cấu hình (`TaxSetting`), cần kiểm chứng theo quy định từ kỳ tính thuế 2026; luôn hiển thị disclaimer. |

### BR-013 — Đa vai trò & tách Marketplace/Workspace
- Một tài khoản đồng thời Renter & Seller; role **cộng dồn theo hành vi** (cơ chế đầy đủ ở mục 1.8). Đăng tin cho thuê miễn phí, tự kích hoạt Seller. Workspace SaaS sau gating (BR-015). Admin/Moderator nội bộ, tách bạch.

### BR-015 — Gating 4 trạng thái & hết hạn gói
- `UserSubscription.status ∈ {Trial, Active, Expired, Cancelled}` map sang `NONE/TRIAL/ACTIVE/READ_ONLY`. Hạn mức TRIAL lấy từ **plan Trial** (Admin cấu hình). Hết hạn → SaaS read-only, **dữ liệu không mất**; Marketplace & Messaging không ảnh hưởng; gia hạn xong mở quyền ghi ngay. Chạm hạn mức hoặc **over-limit** (gia hạn gói nhỏ hơn dữ liệu hiện có) → chỉ **chặn tạo mới**, không đụng dữ liệu. `Cancelled` chỉ do Admin thao tác (khiếu nại/hoàn tiền). V1 không nâng gói giữa kỳ — đổi gói khi gia hạn.

### BR-022 — Verified review (quyền viết đánh giá) *(sửa)*
- Chỉ tài khoản có liên kết Occupancy **`Confirmed`** và **có/từng có `Contract`** tại Property X mới viết được Review cho X.
- **Cấm `authorUserId == property.sellerId`** (chủ khu không tự review khu mình).
- **Điều kiện mở:** Contract đã tồn tại **≥ 30 ngày** HOẶC đã có **≥ 1 `Payment`** ghi nhận trên hợp đồng/phòng đó — nâng chi phí tạo review giả từ "tạo Contract khống là xong" lên "phải duy trì dấu vết vận hành".
- Người ở fallback (`userId` null / chưa Confirmed) không viết được.

### BR-023 — Giới hạn & vòng đời review *(sửa)*
- Mỗi `Contract` một review; **sửa được trong 7 ngày** kể từ khi đăng. `Review.status ∈ {Visible, Hidden, Reported}`. Review bị **≥ 3 report** → tự ẩn chờ kiểm duyệt (đồng bộ ngưỡng BR-018).

### BR-024 — Hiển thị review & hồ sơ khu public *(sửa)*
- Review lưu gắn `propertyId`; **viết & lưu được bất kể khu bật public hay chưa** — nhưng **chỉ HIỂN THỊ** (badge + trang khu) khi `isPublicProfileEnabled = true`. Tắt public hoặc xóa mềm Property → badge và trang khu ẩn, review giữ trong DB.
- Trang khu public chỉ hiển thị tên khu + khu vực + review + điểm + tin đang cho thuê; **tuyệt đối không** lộ dữ liệu vận hành (BR-007, BR-012).

### BR-025 — Giờ giấc & thời điểm tin
- `RentalListing`/`Room` có `accessPolicy` (Free/Restricted) + `accessOpenTime`/`accessCloseTime`; hiển thị ở chi tiết và làm bộ lọc. Trang chi tiết hiển thị `createdAt`/`updatedAt` dạng tương đối.

### BR-026 — Thời hạn hiển thị & gia hạn tin cho thuê *(MỚI)*
- Tin cho thuê hiển thị **60 ngày** kể từ `approvedAt` (`expireAt = approvedAt + 60`); quá hạn → job chuyển `Expired`. Gia hạn +60 ngày, không giới hạn số lần, **về thẳng `Active` không cần duyệt lại** nếu không sửa nội dung (sửa trường quan trọng thì theo BR-003).

### BR-027 — Đồng bộ Room ↔ RentalListing (chống tin ảo) *(MỚI)*
- Với listing có `roomId`: Room chuyển **`Rented`** → hệ thống **tự chuyển listing sang `Rented`** (cùng transaction) + Notification `ListingAutoRented`; Room chuyển **`Deposited`** → Notification gợi ý ẩn tin (1 chạm, không tự động — cọc có thể hủy); Room về `Available` → Seller mở lại tin được.
- **Lý do:** "phòng hết rồi tin vẫn treo" là nỗi đau số 1 sản phẩm tuyên chiến — không thể để chính hệ thống tái tạo nó. Listing không gắn `roomId` (tin tay) không bị ảnh hưởng.

### BR-028 — Khóa tài khoản & tin đăng *(MỚI)*
- `User.status = Locked` → mọi listing/demand post `Active` của user tự chuyển `Hidden`. Mở khóa → tin KHÔNG tự Active lại (Seller tự mở, tránh tin cũ sai lệch bung ra hàng loạt).

### BR-029 — Liên kết Occupancy cần xác nhận (consent) *(MỚI)*
- Gắn `userId` vào Occupancy tạo trạng thái `linkStatus = Pending` + Notification cho Renter → `Confirmed` (mở "Phòng của tôi", quyền xem HĐ/hóa đơn, quyền review) hoặc `Rejected` (gỡ `userId`, Occupancy về fallback). Renter đã Confirmed có quyền **tự gỡ liên kết** bất kỳ lúc nào.
- **Lý do:** không ai bị "gắn vào phòng" mà không biết — vừa đúng tinh thần Luật 91/2025, vừa chặn cửa gian lận gắn tài khoản chim mồi để mở quyền review.

### BR-030 — Cấm tự tương tác *(MỚI)*
- Không tạo `Conversation` với tin của chính mình (self-contact); không review khu của chính mình (đã gộp trong BR-022). Validation ở API.

### BR-031 — Đồng bộ RoomStatus ↔ vòng đời Contract *(MỚI)*
- Tạo Contract `Active` → Room tự chuyển `Rented` (cùng transaction). Contract kết thúc (`Expired`/`Terminated`) và Room không còn Contract Active nào khác → **gợi ý 1 chạm** chuyển Room `Available` (không tự động — chủ có thể đang dọn/sửa phòng). `Deposited` do Seller set tay (nhận cọc ngoài app), bị thay bằng `Rented` khi có Contract Active.

---

## 6. DATABASE ENTITIES (30 entity)

> Mọi entity có `id` (uuid, PK), `createdAt`, `updatedAt`; entity nghiệp vụ có `deletedAt` (soft delete). Enum khớp đúng BR.

| Entity | Mô tả | Field chính | Quan hệ |
|---|---|---|---|
| **User** | Tài khoản | `phoneNumber` (unique), `email` (unique, null), `passwordHash`, `status` (Active/Locked) | n-n Role; 1-1 Profile |
| **Role** | Vai trò | `name` (Renter/Seller/Admin/Moderator) | n-n User |
| **Profile** | Hồ sơ | `userId`, `fullName`, `avatarUrl`, `contactPhone`, `displaySettings` (jsonb) | 1-1 User |
| **RefreshToken** *(MỚI)* | Phiên đăng nhập | `userId`, `tokenHash`, `expiresAt`, `revokedAt` (null) | n-1 User |
| **RentalListing** | Tin cho thuê | `sellerId`, `roomId` (null), `propertyId` (null — gắn qua form chọn khu hoặc tạo từ phòng; validate thuộc cùng seller), `title`, `propertyType` (enum: BoardingRoom/ServicedApartment/Apartment), `address`, `district`, `area`, `price`, `description`, `electricityPrice/waterPrice/servicePrice/deposit`, `accessPolicy` (Free/Restricted), `accessOpenTime`/`accessCloseTime` (null), `contactPhone`, `status`, `rejectReason`, `approvedAt`, `expireAt` (= approvedAt + 60d), `boostExpireAt` | n-1 User/Room(null)/Property(null); n-n Amenity; 1-n Media/Favorite/Report/Conversation/ContactEvent |
| **RoomWantedPost** | Tin tìm phòng | `renterId`, `desiredDistricts` (jsonb), `priceMin/priceMax`, `propertyType`, `minArea`, `desiredAmenities` (jsonb), `moveInDate`, `description`, `status`, `expireAt` | n-1 User; 1-n Conversation/Report |
| **RoommateWantedPost** | Tin ở ghép | `renterId`, `currentAddress`, `district`, `sharePrice`, `neededCount`, `genderRequirement`, `requirements`, `status`, `expireAt` | n-1 User; 1-n Media/Conversation/Report |
| **Property** | Khu trọ + nhận tiền + hồ sơ public | `sellerId`, `name`, `address`, `district`, `floorCount`, `note`, `bankName/bankAccountNumber/bankAccountName` (null), `isPublicProfileEnabled` (default false), `publicSlug` (unique, null), `avgRating` (null), `reviewCount` (default 0) | n-1 User; 1-n Room/Review |
| **Room** | Phòng | `propertyId`, `roomCode` (unique trong property), `floor`, `area`, `price`, `status`, `accessPolicy`, `accessOpenTime/CloseTime`, `note` | n-1 Property; n-n Amenity; 1-n Occupancy/Contract/Invoice/UtilityReading; 0-n RentalListing |
| **Occupancy** | Người ở thực tế | `roomId`, `userId` (null), **`linkStatus` (Pending/Confirmed/Rejected, null khi userId null)**, `fullName`, `phoneNumber`, `startDate`, **`endDate` (null)**, `occupantCount`, `note`, `isActive` | n-1 Room; n-1 User (null) |
| **Contract** | Hợp đồng | `roomId`, `occupancyId` (đại diện), `startDate`, `endDate`, `rentPrice`, `deposit`, `status`, `terminateReason` | n-1 Room/Occupancy; 1-n Media (scan); tối đa 1 Review |
| **Invoice** | Hóa đơn kỳ | `roomId`, `contractId`, `period` (YYYY-MM), `dueDate`, `totalAmount`, `status`; **unique (contractId, period)** | n-1 Room/Contract; 1-n InvoiceItem/Payment/Media |
| **InvoiceItem** | Dòng hóa đơn | `invoiceId`, `type` (Rent/Electricity/Water/Service/Other), `description`, `quantity`, `unitPrice`, `amount` | n-1 Invoice |
| **UtilityReading** | Chỉ số điện nước | `roomId`, `type` (Electricity/Water), `period`, `previousReading`, `currentReading`, `unitPrice`, **`invoiceId` (null — đánh dấu đã lên hóa đơn)**; **unique (roomId, type, period)** | n-1 Room; n-1 Invoice (null) |
| **Payment** *(sửa)* | Ghi nhận thu **tiền thuê** (tay) | `invoiceId` (bắt buộc), `amount`, `method` (Cash/BankTransfer), `paidAt`, `note` | n-1 Invoice |
| **PlatformTransaction** *(MỚI)* | Giao dịch **phí nền tảng** qua gateway | `sellerId`, `type` (Boost/Subscription), `listingId` (null), `userSubscriptionId` (null), `amount`, `status` (Pending/Success/Failed), `gatewayTxnId` (null), `idempotencyKey` (unique), `paidAt` (null) | n-1 User; n-1 RentalListing/UserSubscription (null) |
| **Notification** | Thông báo | `userId`, `type` (ListingApproved/Rejected/NewMessage/ContractExpiring/InvoiceDue/InvoiceOverdue/**InvoiceReceived**/SubscriptionRenewal/TrialEnding/ReviewModerated/**OccupancyLinked**/**ListingAutoRented**/FavoriteChanged/System), `title`, `content`, `isRead`, `refType/refId` | n-1 User |
| **Favorite** | Tin đã lưu | `renterId`, `listingId`; unique (renterId, listingId) | n-1 User/RentalListing |
| **Report** | Báo cáo vi phạm | `reporterId`, `targetType` (RentalListing/RoomWantedPost/RoommateWantedPost/Conversation/Message/Review), `targetId`, `reason`, `description`, `status`, `resolution`, `handledBy` | n-1 User |
| **Conversation** *(sửa)* | Hội thoại | `refType`, `refId`, **`initiatorId`** (người bắt chuyện), **`posterId`** (người đăng tin), `status` (Active/Archived/Blocked), `lastMessageAt`; **unique (initiatorId, refType, refId)** | n-1 User (x2); 1-n Message |
| **Message** | Tin nhắn | `conversationId`, `senderId`, `content`, `isRead`, `readAt` (null) | n-1 Conversation/User |
| **ContactEvent** *(MỚI)* | Tương tác liên hệ | `listingId`, `userId` (null), `type` (Call/Message) | n-1 RentalListing; n-1 User (null) |
| **SubscriptionPlan** | Gói SaaS | `name`, `durationMonths`, `price`, `renewalPrice`, `trialDays` (default 30), `maxProperties`, `maxRooms`, **`isTrialPlan` (boolean — plan Trial định nghĩa hạn mức dùng thử)**, `isActive` | 1-n UserSubscription |
| **UserSubscription** | Gói của Seller | `sellerId`, `planId`, `startDate`, `expireDate`, `status` (Trial/Active/Expired/Cancelled) | n-1 User/SubscriptionPlan; 1-n PlatformTransaction |
| **TaxSetting** | Cấu hình thuế | `year`, `thresholdRevenue`, `vatRate`, `pitRate`, `isActive` | (danh mục Admin) |
| **TaxDeclaration** | Bản tính thuế | `sellerId`, `year`, `totalRevenue` (cash basis), `vatAmount`, `pitAmount`, `generatedFileUrl` (null) | n-1 User |
| **Amenity** | Tiện ích (danh mục) | `name`, `icon`, `type` (Room/Surrounding) | n-n RentalListing/Room |
| **BannedKeyword** *(MỚI)* | Từ khóa cấm | `keyword`, `isActive` | (danh mục Admin) |
| **Media** | File/ảnh | `ownerType` (RentalListing/RoommateWantedPost/Contract/Profile/Invoice/TaxDeclaration), `ownerId` (null khi mới upload), `url`, `mimeType`, `sizeBytes`, `isPrivate` | đa hình; media chưa gắn owner sau 24h bị job dọn |
| **Review** | Đánh giá khu trọ | `propertyId`, `authorUserId`, `contractId` (bằng chứng, unique), `rating` (1–5), `content` (≤1.000), `status` (Visible/Hidden/Reported), `sellerReply` (null, V2) | n-1 Property/User/Contract |

**Index đề xuất:** `RentalListing(status, district, price, propertyType, approvedAt, boostExpireAt, propertyId)`; `Room(propertyId, status)`; `Occupancy(roomId, userId)`; `Invoice(contractId, period unique)`; `UtilityReading(roomId, type, period unique)`; `Notification(userId, isRead)`; `Conversation(initiatorId, refType, refId unique)`; `Message(conversationId, createdAt)`; `Review(propertyId, status)`; `Property(publicSlug unique, isPublicProfileEnabled)`; `PlatformTransaction(idempotencyKey unique)`; `RefreshToken(userId)`.

---

## 7. API ENDPOINTS (REST) — đề xuất

> Prefix `/api/v1`. **Chuẩn response/error/pagination ở mục 7.5** (một chuẩn duy nhất cho toàn dự án).

### 7.1 Shared Kernel — Auth, User, Profile, Notification, Messaging, Media
```
POST /auth/register           POST /auth/verify-otp         POST /auth/login
POST /auth/refresh            POST /auth/logout             (thu hồi refresh token)
POST /auth/forgot-password    POST /auth/reset-password
GET  /me                      (user, profile, roles[], workspaceStatus — nguồn chân lý client)
PUT  /me/password             (đổi mật khẩu khi đã đăng nhập)
POST /me/delete-request       (yêu cầu xóa tài khoản — right to erasure)
GET  /me/profile              PUT /me/profile               PUT /me/display-settings
GET  /notifications           PATCH /notifications/{id}/read   PATCH /notifications/read-all
GET  /conversations           POST /conversations           (chặn self-contact BR-030)
GET  /conversations/{id}/messages    POST /conversations/{id}/messages
PATCH /conversations/{id}/read       POST /conversations/{id}/block   POST /conversations/{id}/report
POST /media/upload            DELETE /media/{id}
```

### 7.2 Marketplace — Listings, Demand Posts, Search, Favorite, Review, Report
```
GET  /listings                GET  /listings/{id}
POST /listings                (tạo đầu tiên → gán role Seller cùng transaction)
PUT  /listings/{id}           PATCH /listings/{id}/status   DELETE /listings/{id} (xóa mềm)
PATCH /listings/{id}/renew    (gia hạn +60d, BR-026)
POST /listings/{id}/boost     (tạo PlatformTransaction → URL thanh toán)
POST /listings/{id}/report    POST /listings/{id}/favorite  DELETE /listings/{id}/favorite
GET  /me/listings             (tin của tôi, mọi trạng thái — FR-017)
GET  /me/favorites
GET  /search/listings         GET  /search/suggest-rooms
GET  /amenities               (danh mục public cho form đăng tin/bộ lọc)
POST /room-wanted-posts       GET /room-wanted-posts        PUT/PATCH/DELETE …/{id}
POST /room-wanted-posts/{id}/report
POST /roommate-wanted-posts   GET /roommate-wanted-posts    PUT/PATCH/DELETE …/{id}
POST /roommate-wanted-posts/{id}/report
# Review — prefix /public tách khỏi nhóm /properties của SaaS để middleware gating
# không chặn nhầm (route công khai vs route Workspace)
GET  /public/khu-tro/{slug}                     (trang khu public + review)
GET  /public/properties/{id}/reviews
POST /reviews                                   (body: propertyId, contractId, rating, content — BR-022)
PUT  /reviews/{id}            POST /reviews/{id}/report
```

### 7.3 Property Management (SaaS) — Property, Room, Occupancy, Contract, Billing, Subscription, Dashboard, Tax
```
# Subscription & thanh toán phí nền tảng
GET  /subscription/plans      GET  /me/subscription
POST /me/subscription/trial   POST /me/subscription/purchase   POST /me/subscription/renew
POST /payments/webhook/vnpay  (server-to-server; nơi DUY NHẤT kích hoạt quyền lợi)
GET  /platform-transactions/{id}                 (tra trạng thái giao dịch)
# Property & Room (chịu gating — chặn ghi nếu READ_ONLY, lỗi mã WORKSPACE_READ_ONLY)
GET/POST /properties          GET/PUT/DELETE /properties/{id}
PATCH /properties/{id}/public
GET/POST /properties/{id}/rooms      GET/PUT/DELETE /rooms/{id}
PATCH /rooms/{id}/status      POST /rooms/{id}/create-listing
# Occupancy & Contract
GET/POST /rooms/{id}/occupancies     PUT/PATCH /occupancies/{id}
GET  /occupancies/lookup?phone=…     (tra tài khoản Renter khi thêm người ở)
GET/POST /rooms/{id}/contracts       GET/PUT/PATCH /contracts/{id}
# Invoice / Utility / Payment
POST /rooms/{id}/utility-readings    GET /rooms/{id}/utility-readings
GET/POST /rooms/{id}/invoices        GET /invoices/{id}    PATCH /invoices/{id}/send
POST /invoices/{id}/payments         (ghi "Đã thu")
# Dashboard & Tax
GET  /dashboard/seller        GET /tax/declarations         POST /tax/calculate
# "Phòng của tôi" (Renter linked Confirmed, chỉ đọc — V1)
GET  /me/occupancies                 (danh sách các đợt ở: đang ở + lịch sử)
PATCH /me/occupancies/{id}/confirm   PATCH /me/occupancies/{id}/reject
PATCH /me/occupancies/{id}/unlink    (tự gỡ liên kết — BR-029)
GET  /me/occupancies/{id}/contracts  GET /me/occupancies/{id}/invoices
```

### 7.4 Admin & Moderation
```
GET  /admin/users             PATCH /admin/users/{id}/lock   PATCH /admin/users/{id}/roles
GET  /admin/moderation/listings       PATCH /admin/listings/{id}/approve|reject
GET  /admin/reports           PATCH /admin/reports/{id}/resolve
GET  /admin/moderation/reviews        PATCH /admin/conversations/{id}/block
GET/POST/PUT /admin/plans     GET/POST/PUT /admin/amenities  /admin/tax-settings
GET/POST/PUT /admin/banned-keywords   PUT /admin/boost-config   (boostPrice, boostDays)
GET  /admin/subscriptions     PATCH /admin/subscriptions/{id}/cancel
GET  /admin/dashboard
```

### 7.5 Chuẩn response — MỘT chuẩn duy nhất (file 04 & 06 trích theo đây)
- **Thành công:** `{ "data": …, "meta": {…} }` — không có cờ `success` (HTTP status đã nói điều đó).
- **Lỗi:** `{ "error": { "code": "ROOM_NOT_FOUND", "message": "…", "details": [] } }`. Mã lỗi nghiệp vụ đáng chú ý: `WORKSPACE_READ_ONLY`, `TRIAL_ALREADY_USED`, `REVIEW_NOT_ELIGIBLE`, `SELF_CONTACT_FORBIDDEN`.
- **Pagination:** `?page=&pageSize=&sort=`; trả `meta: { page, pageSize, total, totalPages }`. Messaging phân trang con trỏ thời gian (`?before=`/`?after=`).
- **Status codes:** 200/201 thành công; 400 request sai cấu trúc; 401 chưa xác thực; 403 không đủ quyền (RBAC/ownership/gating); 404 không tồn tại; 409 xung đột (trùng roomCode, chồng lấn hợp đồng, trùng period); **422 lỗi validation ngữ nghĩa**; 429 rate limit; 500 hệ thống.

---

## 8. PHÂN QUYỀN (RBAC)

| Nhóm endpoint | Guest | Renter | Seller | Moderator | Admin |
|---|---|---|---|---|---|
| Xem tin / tìm kiếm / xem review | ✓ | ✓ | ✓ | ✓ | ✓ |
| Nhắn tin, lưu tin, đăng tin nhu cầu | – | ✓ | ✓ | – | – |
| Viết review (verified) | – | ✓¹ | ✓¹ | – | – |
| Đăng/quản lý tin cho thuê, boost | – | –³ | ✓ | – | – |
| Workspace SaaS (Property…Tax) | – | – | ✓² | – | – |
| Kiểm duyệt tin / report / review, khóa hội thoại | – | – | – | ✓ | ✓ |
| Quản lý user / danh mục / gói / cấu hình | – | – | – | – | ✓ |

¹ Chỉ khi liên kết `Confirmed` + có `Contract` tại Property + không phải chủ khu + đạt điều kiện mở (BR-022). ² Chỉ khi `TRIAL`/`ACTIVE`; `READ_ONLY` chỉ đọc (BR-015). ³ Renter tạo listing đầu tiên → tự nhận role Seller ngay trong request đó (1.8). Mọi truy cập dữ liệu SaaS lọc theo `sellerId` (BR-007); Admin truy cập ghi audit.

**Pipeline kiểm tra endpoint SaaS (thứ tự):** token hợp lệ → role Seller (claims) → ownership `sellerId` (BR-007) → gating `workspaceStatus` (DB).

---

## 9. VALIDATION DỮ LIỆU (điểm chính)

- **SĐT** VN hợp lệ, unique; **email** đúng định dạng nếu có; **mật khẩu** ≥ 8 ký tự.
- **RentalListing:** tiêu đề 10–120 ký tự; giá > 0; ảnh ≥ 3; `accessPolicy=Restricted` bắt buộc `accessOpenTime/CloseTime`; **`propertyId`/`roomId` (nếu có) phải thuộc chính `sellerId`**; nội dung qua lọc `BannedKeyword` khi gửi duyệt.
- **Property:** bật public phải có `name` + `district`; `publicSlug` tự sinh, unique. Nhận tiền: STK chỉ số; `bankAccountName` IN HOA không dấu (VietQR hợp lệ).
- **Room:** `roomCode` unique trong Property; giá ≥ 0; diện tích > 0.
- **Occupancy:** `endDate ≥ startDate` (nếu có); `linkStatus` chỉ có nghĩa khi `userId` khác null.
- **Contract:** `endDate > startDate`; chặn Contract Active thứ hai và chồng lấn thời gian trên cùng Room (409).
- **UtilityReading:** `currentReading ≥ previousReading`; `unitPrice ≥ 0`; unique (roomId, type, period).
- **Invoice:** `period` đúng `YYYY-MM`; tổng = Σ InvoiceItem; unique (contractId, period). VietQR sinh kèm amount + addInfo = mã hóa đơn.
- **Payment:** `amount > 0`; Σ Payment không vượt `totalAmount`.
- **PlatformTransaction:** `idempotencyKey` unique; webhook verify chữ ký gateway; xử lý webhook idempotent (nhận trùng không kích hoạt trùng).
- **Review:** `rating ∈ [1,5]`; `content ≤ 1.000`; `contractId` hợp lệ, thuộc `authorUserId` qua Occupancy Confirmed; không phải chủ khu; đạt điều kiện mở (BR-022); chặn trùng theo `contractId` (BR-023).
- **Conversation:** người khởi tạo ≠ người đăng tin (BR-030); tin ở trạng thái cho phép (BR-019).
- **Subscription:** không TRIAL lần 2; `purchase/renew` kiểm `planId` Active.

---

## 10. DANH SÁCH MÀN HÌNH ĐẦY ĐỦ (sản phẩm hoàn chỉnh)

> Phân theo **2 shell**; shell Workspace chia **2 zone** (mục 1.6). Cột **Giai đoạn**: `MVP` (demo, mock data), `V1` (bản chạy thật đầu tiên), `V2` (mở rộng). Phạm vi MVP chuẩn: **A1–A3, A7, A11 (UI), A14, B3, B4, B5, B6 (mock), B8 (mock), B12 (demo luồng)** — mọi tài liệu khác mô tả MVP theo danh sách này.

### 10.A — PUBLIC / RENTER SHELL — route gốc `/`

**Khu công khai (Guest xem được):**

| # | Màn hình | Route | Mô tả | Giai đoạn |
|---|---|---|---|---|
| A1 | Trang chủ | `/` | Hero tìm kiếm, tin nổi bật (boost), khu vực hot | MVP |
| A2 | Kết quả tìm phòng | `/tim-phong` | Danh sách + bộ lọc (giá, khu vực, loại hình, diện tích, tiện ích, giờ giấc, điểm đánh giá — kèm toggle "gồm tin chưa có đánh giá") + bản đồ | MVP (lọc cơ bản) → V1 |
| A3 | Chi tiết tin cho thuê | `/phong/{id}` | Gallery, chi phí, tiện ích, giờ giấc, thời điểm đăng/cập nhật, badge điểm khu, liên hệ (redirect có `?redirect=`), nút Báo cáo | MVP → V1 (badge) |
| A4 | Trang khu trọ public | `/khu-tro/{slug}` | Tên khu, khu vực + điểm & danh sách đánh giá + tin đang cho thuê của khu | V1 |
| A5 | Danh sách tin nhu cầu | `/tin-tim-phong`, `/tin-o-ghep` | Tin tìm phòng / ở ghép công khai | V1 |
| A6 | Hồ sơ người đăng (public) | `/nguoi-dung/{id}` | Thông tin cơ bản + tin đang đăng (uy tín chủ khu = V2) | V1 |

**Khu Renter (đăng nhập):**

| # | Màn hình | Route | Mô tả | Giai đoạn |
|---|---|---|---|---|
| A7 | Đăng ký / Đăng nhập / OTP / Quên MK | `/dang-ky`, `/dang-nhap`, … | Xác thực; hỗ trợ `?redirect=` | MVP |
| A8 | Tin đã lưu | `/tai-khoan/da-luu` | Favorite; cảnh báo tin đổi trạng thái | V1 |
| A9 | Quản lý tin nhu cầu của tôi | `/tai-khoan/tin-cua-toi` | Tạo/sửa/ẩn/gia hạn | V1 |
| A10 | Đăng tin nhu cầu (form) | `/tai-khoan/dang-tin-nhu-cau` | Wizard tìm phòng / ở ghép | V1 |
| A11 | Hộp thư / Chat | `/tin-nhan`, `/tin-nhan/{id}` | Danh sách hội thoại + khung chat | MVP (UI) → V1 |
| A12 | Thông báo | `/thong-bao` | Trung tâm thông báo (gồm lời mời liên kết Occupancy) | V1 |
| A13 | **Phòng của tôi** | `/tai-khoan/phong-cua-toi` | Tab **"Đang ở"** (HĐ + danh sách hóa đơn kèm trạng thái, xem VietQR để chuyển khoản) + tab **"Lịch sử ở trọ"** (các đợt đã kết thúc, nút "Đánh giá khu" cho đợt chưa review) + xác nhận/gỡ liên kết | V1 |
| A14 | Hồ sơ & cài đặt | `/tai-khoan/ho-so` | Tên, avatar, SĐT liên hệ, email, đổi mật khẩu, yêu cầu xóa tài khoản | MVP |

### 10.B — MANAGEMENT WORKSPACE SHELL — route gốc `/chu-tro`

> Shell yêu cầu role **Seller** (entry `/chu-tro` mở cho mọi user đăng nhập — là điểm kích hoạt Seller). Chia 2 zone: **Zone Tin đăng** (B4, B5 — miễn phí, KHÔNG gating) và **Zone SaaS** (còn lại — gating BR-015; `READ_ONLY` ẩn/khóa nút ghi, lỗi `WORKSPACE_READ_ONLY`).

| # | Màn hình | Route | Zone | Mô tả | Giai đoạn |
|---|---|---|---|---|---|
| B1 | Entry / Onboarding | `/chu-tro` | — | **2 lối:** "Đăng tin (miễn phí)" → B5; "Dùng thử bộ quản lý" → TRIAL → B2 | V1 |
| B2 | Onboarding wizard 3 bước | `/chu-tro/bat-dau` | SaaS | Property + nhận tiền (VietQR) → Room → (tùy chọn) Occupancy/Contract | V1 |
| B3 | Dashboard Seller | `/chu-tro/tong-quan` | SaaS | Phòng trống (luôn hiện); lấp đầy, doanh thu/tổng phòng/số khách (toggle, mặc định TẮT — BR-012); sắp hết hạn HĐ; chưa thu | MVP (mock) → V1 |
| B4 | Quản lý tin cho thuê | `/tai-khoan/tin-cho-thue` | **Tin đăng** | Tin của tôi; tạo/sửa/boost/gia hạn/xóa | MVP |
| B5 | Đăng tin cho thuê | `/dang-tin-cho-thue` | **Tin đăng** | Form nhiều bước + bước chọn khu (nếu có Property) | MVP |
| B6 | Danh sách khu trọ | `/chu-tro/khu-tro` | SaaS | Danh sách khu + tổng phòng/trống; thêm khu | MVP (mock) → V1 |
| B7 | Chi tiết khu + nhận tiền + public | `/chu-tro/khu-tro/{id}` | SaaS | Sửa khu; STK/VietQR; bật hồ sơ public | V1 |
| B8 | Quản lý phòng | `/chu-tro/khu-tro/{id}/phong` | SaaS | Lưới phòng theo trạng thái; badge "Có tin đang chạy"; "Tạo tin từ phòng" | MVP (mock) → V1 |
| B9 | Chi tiết phòng | `/chu-tro/phong/{id}` | SaaS | Thông tin, người ở hiện tại (nhiều Occupancy), HĐ, hóa đơn gần đây | V1 |
| B10 | Quản lý người ở | `/chu-tro/phong/{id}/nguoi-o` | SaaS | Thêm theo SĐT (linked Pending/Confirmed hoặc fallback), kết thúc ở (endDate), lịch sử | V1 |
| B11 | Hợp đồng | `/chu-tro/hop-dong`, `…/{id}` | SaaS | Tạo HĐ (chặn chồng lấn), upload scan, nhắc hết hạn, chấm dứt | V1 |
| B12 | Điện nước & Hóa đơn | `/chu-tro/hoa-don` | SaaS | UtilityReading → Invoice → xuất kèm VietQR (amount + mã HĐ) → gửi → "Đã thu" | MVP (demo luồng) → V1 |
| B13 | Chi tiết hóa đơn | `/chu-tro/hoa-don/{id}` | SaaS | Dòng hóa đơn, STK/QR, lịch sử thu | V1 |
| B14 | Hỗ trợ thuế | `/chu-tro/thue` | SaaS | Tính GTGT/TNCN ước tính (cash basis), xuất template | V1 (cơ bản) |
| B15 | Gói SaaS của tôi | `/chu-tro/goi-dich-vu` | SaaS* | Xem hạn, dùng thử, mua, gia hạn, trạng thái giao dịch | V1 |
| B16 | Quản lý đánh giá khu | `/chu-tro/danh-gia` | SaaS* | Xem đánh giá khu của mình (phản hồi = V2) | V1 |

\* B15/B16 là màn **đọc** — vẫn xem được ở `READ_ONLY` (B15 phải xem được để còn gia hạn).

### 10.C — ADMIN / MODERATOR AREA — route gốc `/admin`

| # | Màn hình | Route | Mô tả | Giai đoạn |
|---|---|---|---|---|
| C1 | Dashboard hệ thống | `/admin` | Tổng user/tin/doanh thu phí nền tảng | V1 |
| C2 | Kiểm duyệt tin | `/admin/duyet-tin` | Hàng đợi 3 loại tin, duyệt/từ chối (lý do) | V1 |
| C3 | Xử lý báo cáo | `/admin/bao-cao` | Report tin / tin nhắn / đánh giá; khóa hội thoại | V1 |
| C4 | Kiểm duyệt đánh giá | `/admin/danh-gia` | Hàng đợi review bị báo cáo | V1 |
| C5 | Quản lý người dùng | `/admin/nguoi-dung` | Khóa/mở (khóa → ẩn tin BR-028), gán role | V1 |
| C6 | Danh mục & cấu hình | `/admin/danh-muc` | Amenity, khu vực, khoảng giá, gói (+ plan Trial), **phí & thời hạn boost**, **từ khóa cấm**, `TaxSetting` | V1 |

---

## 11. BACKEND SERVICES (Modular Monolith — **16 service**)

> Một codebase, một database; mỗi service là một module có ranh giới; giao tiếp qua interface nội bộ. **Danh sách này là chuẩn duy nhất** — tài liệu Kiến trúc và cấu trúc thư mục code theo đây. Không dùng từ "Tenant/Tenancy" trong bất kỳ định danh nào.

**Shared Kernel (5):**
| Service | Trách nhiệm |
|---|---|
| `AuthService` | Đăng ký/đăng nhập, OTP, token + RefreshToken, role (tự kích hoạt + Admin), RBAC middleware |
| `UserProfileService` | Profile, display settings, xóa tài khoản |
| `MediaService` | Upload, signed URL, phân quyền file, job dọn media mồ côi |
| `NotificationService` | Thông báo in-app + SMS/Email; scheduled jobs (Overdue, Contract Expired, tin Expired, nhắc gói, TRIAL, giao dịch treo) |
| `MessagingService` | Conversation/Message, chặn, self-contact guard |

**Domain Marketplace (6):**
| Service | Trách nhiệm |
|---|---|
| `ListingService` | RentalListing: vòng đời (BR-001/003/026), boost, tạo từ phòng, đồng bộ từ Room (BR-027), ẩn khi user Locked (BR-028) |
| `DemandPostService` | Tin tìm phòng / ở ghép (BR-009/010) |
| `SearchService` | Tìm kiếm/lọc/sắp xếp/phân trang; hành vi lọc điểm đánh giá; gợi ý phòng |
| `FavoriteService` | Lưu tin, báo đổi trạng thái |
| `ReviewService` | Verify điều kiện review (BR-022/023), avgRating, trang khu public |
| `ModerationService` | Duyệt tin, lọc BannedKeyword, xử lý Report, khóa hội thoại, audit |

**Domain Property Management / SaaS (5):**
| Service | Trách nhiệm |
|---|---|
| `PropertyRoomService` | Property (+ nhận tiền, cờ public), Room, trạng thái (BR-002/011/031) |
| `OccupancyContractService` | Occupancy (link/consent BR-029, endDate), Contract (BR-006/031), scan (BR-008) |
| `BillingService` | UtilityReading, Invoice/Item (unique mới), Payment, VietQR (amount + mã HĐ), job Overdue |
| `SubscriptionService` | Plans (+ plan Trial), UserSubscription, **gating guard 4 trạng thái**, hạn mức/over-limit, `PlatformTransaction` + webhook + idempotency |
| `AnalyticsTaxService` | Dashboard Seller (BR-012) & Admin, ContactEvent, tính thuế (cash basis) + TaxDeclaration |

> `SubscriptionService` cung cấp **gating guard/middleware** mà mọi service SaaS gọi trước khi cho ghi. *(Middleware = lớp trung gian chạy trước handler, ở đây để chặn thao tác ghi khi `READ_ONLY`.)*

---

## 12. NON-FUNCTIONAL REQUIREMENTS (tóm tắt)

- **Hiệu năng:** tìm kiếm < 1.5s giai đoạn đầu; phân trang server-side; index theo Mục 6.
- **Bảo mật:** bcrypt/argon2; JWT access ngắn + refresh (lưu DB, thu hồi khi logout); file riêng tư qua signed URL; cô lập theo `sellerId` (BR-007); rate limit login/OTP/đăng tin/nhắn tin.
- **Riêng tư:** trang khu public không lộ vận hành (BR-024); dashboard toggle mặc định ẩn (BR-012); liên kết Occupancy cần consent (BR-029).
- **Độ tin cậy:** thao tác đa bước bọc **transaction** (tạo Contract → RoomStatus → Notification; tạo listing đầu → gán role; Room Rented → listing Rented; Invoice từ nhiều Item); webhook idempotent.
- **Khả mở rộng:** ranh giới domain rõ; storage tách khỏi DB; stateless API.
- **Bảo trì:** chuẩn REST 7.5; soft delete; audit Admin.

---

## 13. BẢNG ASSUMPTIONS CHUẨN (duy nhất — các tài liệu khác tham chiếu theo mã ở đây)

| Mã | Giả định |
|---|---|
| AS-001 | Liên hệ qua 2 kênh: nhắn tin in-app + gọi điện; không tích hợp Zalo; không đặt lịch xem phòng |
| AS-002 | Nền tảng KHÔNG cầm/thu hộ tiền thuê; hóa đơn kèm STK/VietQR của khu; chủ trọ tự ghi nhận thu; gateway chỉ thu phí nền tảng qua `PlatformTransaction`; đối soát ngân hàng tự động = tương lai |
| AS-003 | Gói SaaS bán đứt 36 tháng ~600.000đ (tham khảo); gia hạn ưu đãi 150.000–180.000đ/năm; nhắc 6/2/1 tháng; Workspace 4 trạng thái; TRIAL theo plan Trial (mặc định 1 tháng, 1 Property, 5 Room); hết hạn → read-only, giữ dữ liệu |
| AS-004 | Một tài khoản kiêm Renter & Seller; role cộng dồn theo hành vi (mục 1.8) |
| AS-005 | Seller là chủ BĐS hoặc người được ủy quyền (cò trọ); nền tảng không môi giới, không phân biệt người đăng |
| AS-006 | Occupancy `userId` nullable; liên kết tài khoản cần Renter xác nhận (BR-029); hệ thống single-sided — chủ trọ nhập điện nước |
| AS-007 | Review verified-only (BR-022); chủ không dùng SaaS → khu không có review (có chủ đích, tạo động lực dùng SaaS) |
| AS-008 | "Phòng của tôi" V1 chỉ xem; người ở tự nhập điện nước + báo sự cố = V2 |
| AS-009 | Người ở gửi chỉ số điện nước cho chủ qua kênh ngoài (thủ công, không tích hợp) |
| AS-010 | Hồ sơ khu public là opt-in; review viết được trước, hiển thị khi bật (BR-024) |
| AS-011 | Chat: UI từ MVP, nghiệp vụ đầy đủ V1; realtime polling → WebSocket/SSE sau |
| AS-012 | Tax Support tham khảo; căn cứ cash basis (ΣPayment/năm); mặc định ngưỡng 500 triệu/năm, GTGT 5%, TNCN 5% — **cần kiểm chứng theo quy định thuế từ kỳ 2026** |
| AS-013 | Thông tin nhận tiền (STK/QR) đặt theo từng Property |
| AS-014 | MVP demo = danh sách màn hình chuẩn ở Mục 10 (A1–A3, A7, A11-UI, A14, B3, B4, B5, B6, B8, B12), chạy mock data, chưa xây BE/DB chi tiết |
| AS-015 | Kiểm duyệt = lọc từ khóa (`BannedKeyword`) + Moderator duyệt tay; chưa AI moderation |
| AS-016 | Con số performance/availability là mục tiêu giả định, tinh chỉnh sau khi đo tải |
| AS-017 | Đơn giá điện/nước do Seller tự nhập, không lấy biểu giá nhà nước |
| AS-018 | Map dùng bên thứ ba; geocoding khi đăng tin |
| AS-019 | Web responsive trước; mobile app gốc sau, dùng lại API |
| AS-020 | Tech stack (PostgreSQL, MinIO/S3…) là đề xuất; team có thể thay theo thế mạnh |

---

## 14. ROADMAP & ĐỊNH HƯỚNG GIAI ĐOẠN

### 14.1 Phân kỳ tính năng

| Giai đoạn | Trọng tâm |
|---|---|
| **MVP** | Danh sách màn hình chuẩn (Mục 10), chạy mock để demo. **Nguyên tắc:** mock **dữ liệu và trạng thái** (dropdown giả lập gói/role), KHÔNG mock **cấu trúc luồng** — route, guard, 2 zone sidebar, context switcher đúng bản cuối ngay từ MVP; sang V1 chỉ thay nguồn dữ liệu bằng `GET /me` + API thật. Mục tiêu: kiểm chứng nhu cầu & mức sẵn lòng trả. |
| **V1** | Nghiệp vụ thật đầy đủ: Auth/RBAC/gating thật; Property/Room/Occupancy (consent)/Contract/Invoice/Payment; `PlatformTransaction` + webhook; Messaging đầy đủ; Review verified (BR-022 mới); bản đồ; "Phòng của tôi" + lịch sử ở; Admin/Moderation; Tax cơ bản. |
| **V2** | Người ở tự nhập điện nước + báo sự cố (ticketing); điểm uy tín chủ khu; chủ khu phản hồi review; versioning tin khi duyệt lại (BR-003); block user toàn cục; đối soát ngân hàng; WebSocket realtime; nâng gói giữa kỳ. |

### 14.2 Defense — vì sao Review chọn verified-only (chuẩn bị phản biện)

**Lập luận lõi:** giá trị của review nằm ở **độ tin cậy**, không ở số lượng — và độ tin cậy là thứ duy nhất Facebook/đối thủ không làm được. Cho đánh giá tự do = tái tạo đúng vấn đề "tin ảo" đang muốn giải.

Bốn trụ đỡ: (1) **Chiến lược** — verified là USP; (2) **Kinh doanh** — review gắn SaaS tạo flywheel: chủ dùng SaaS → khu có nhãn uy tín → tin dễ lấp phòng → hút chủ khác dùng SaaS (flywheel này hoạt động được nhờ tin đăng gắn được `propertyId` từ form — Module 3); (3) **Kỹ thuật** — chống gian lận ở tầng cấu trúc, không cần đội kiểm duyệt lớn; (4) **Lean** — nhóm hạt nhân dùng SaaS nên có review mẫu ngay.

**"Chủ không dùng SaaS thì khu không có review" không phải bug mà là thiết kế có chủ đích** — tương tự "shop không bán trên Shopee thì không có review Shopee". Tin của chủ chưa dùng SaaS vẫn hiển thị đầy đủ & đã kiểm duyệt; review là lớp tin cậy thêm, đồng thời là động lực dùng SaaS.

**Rủi ro gian lận & 4 lớp chặn (đã nâng từ "giảm thiểu" thành rule chốt):** (1) cấm chủ khu tự review (BR-022); (2) liên kết Occupancy cần Renter xác nhận — không gắn được tài khoản chim mồi âm thầm (BR-029); (3) điều kiện mở review: Contract ≥ 30 ngày hoặc có Payment — tạo Contract khống chưa đủ (BR-022); (4) report + tự ẩn ≥ 3 report + kiểm duyệt (BR-023). Không hệ thống nào chống giả 100%, nhưng chi phí gian lận ở đây cao hơn hẳn review tự do.

---

*— Hết tài liệu Đặc tả Kỹ thuật v2 —*
