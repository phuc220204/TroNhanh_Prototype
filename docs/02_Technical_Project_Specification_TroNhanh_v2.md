# ĐẶC TẢ KỸ THUẬT DỰ ÁN — TRỌ NHANH
## Technical Project Specification — v3

Trọ Nhanh là nền tảng web tìm thuê và quản lý phòng trọ, căn hộ dịch vụ — gồm hai trụ cột **Marketplace** (tìm & đăng tin) và **SaaS quản lý vận hành** cho chủ trọ.

**Tài liệu này là nguồn chân lý của dự án.** Nó đặc tả toàn bộ chức năng, luồng nghiệp vụ, mô hình dữ liệu, phân quyền và API của hệ thống. Khi tài liệu khác mâu thuẫn với tài liệu này, theo tài liệu này.

> **Bối cảnh v3.** Bản v2 là đặc tả viết trước khi code. Bản v3 viết lại sau khi toàn bộ nghiệp vụ đã được **dựng và chạy thật** trên một prototype — mọi luồng, ràng buộc và enum trong đây đều đã được kiểm chứng bằng dữ liệu thật, không còn là giả định.
>
> **Bản v3 phục vụ việc dựng lại hệ thống trên stack mới:** backend **Java Spring Boot**, frontend **Angular**, cơ sở dữ liệu **PostgreSQL**. Mọi quyết định thiết kế đi kèm lý do — phần "vì sao" quan trọng ngang phần "cái gì", vì nó là thứ ngăn người triển khai đi chệch.
>
> Mã `BR-xxx` và `AS-xxx` giữ nguyên đánh số cũ để đối chiếu được với code và tài liệu hiện hành; dãy số vì thế không liên tục.

---

## 0. THUẬT NGỮ (đọc trước cho đỡ rối)

| Thuật ngữ | Giải thích |
|---|---|
| **Marketplace** | Phần "chợ" đăng tin – tìm kiếm – liên hệ giữa người thuê và người cho thuê. Miễn phí. |
| **SaaS / Workspace** | Bộ phần mềm quản lý vận hành phía chủ trọ (khu, phòng, người ở, hợp đồng, điện nước, hóa đơn). Trả phí theo gói. |
| **Shell** | Một vùng giao diện có layout, điều hướng và điều kiện truy cập riêng. Hệ thống có 4 shell. |
| **Gating** | Cổng kiểm soát quyền theo **trạng thái gói dịch vụ** (khác với phân quyền theo vai trò). |
| **Property (Khu trọ)** | Một khu/tòa nhà chứa nhiều phòng — cấp 1 của SaaS. |
| **Room (Phòng)** | Một phòng cụ thể bên trong Property — cấp 2 của SaaS. |
| **Occupancy (Người ở)** | Bản ghi "ai đang ở phòng nào" do chủ trọ tạo. Có thể gắn tài khoản Renter hoặc không. Là **entity, không phải vai trò**. |
| **Renter** | *Tài khoản* của người đi thuê. |
| **Seller** | *Vai trò* của người đăng tin cho thuê. |
| **RentalListing** | Tin cho thuê do Seller đăng. |
| **DemandPost** | Tin nhu cầu do Renter đăng — tìm phòng hoặc tìm người ở ghép. |
| **Verified review** | Đánh giá mà **chỉ người ở đã được xác thực** mới viết được — chống review giả. |
| **Soft delete** | Đánh dấu `deleted_at`, ẩn khỏi mọi danh sách nhưng giữ trong DB. |
| **Boost (đẩy tin)** | Trả phí để tin được ưu tiên hiển thị trong mọi danh sách. |

> ⛔ **Cấm dùng từ "Tenant"** ở bất kỳ đâu — tên biến, tên bảng, comment, chữ trên giao diện. Khái niệm đúng là `Occupancy` (bản ghi người ở) hoặc `Renter` (tài khoản đi thuê). Từ "Tenant" trong ngữ cảnh SaaS còn mang nghĩa "tenancy đa khách hàng", trộn hai khái niệm này sẽ gây hiểu nhầm nghiêm trọng khi bàn về cô lập dữ liệu.

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1 Hai trụ cột

**Trụ cột A — Marketplace.** Kết nối nhu cầu thuê và cho thuê. Gồm tin cho thuê (`RentalListing`) do Seller đăng, tin nhu cầu (`DemandPost`) do Renter đăng, tìm kiếm/lọc, lưu tin, **đánh giá khu trọ (verified)**, kiểm duyệt. Người dùng liên hệ qua **hai kênh: nhắn tin trong app và gọi điện**.

**Trụ cột B — SaaS quản lý vận hành.** Công cụ cho chủ trọ theo cấu trúc hai cấp **Property → Room**. Quản lý người ở (`Occupancy`), hợp đồng (`Contract`), chỉ số điện nước (`UtilityReading`), hóa đơn (`Invoice`/`InvoiceItem`), ghi nhận thu (`Payment`), báo cáo vận hành. Truy cập theo gói (`UserSubscription`).

Hai trụ cột nối nhau qua **đúng hai điểm**, cả hai đều xảy ra ở tầng server:

1. **"Tạo tin đăng từ phòng trống"** — Room prefill sang RentalListing. `Room` và `RentalListing` là hai entity **độc lập về vòng đời**, chỉ liên kết bằng `room_id` nullable.
2. **Đồng bộ chống tin ảo (BR-027)** — phòng chuyển `Rented` thì tin gắn với phòng đó tự chuyển `Rented`.

Ngoài ra có một truy vấn đọc một chiều phục vụ màn "Tìm người thuê": tóm tắt phòng trống của chính chủ trọ (`{roomId, ward, price, area, propertyName}`) để đối chiếu với tin nhu cầu — **cố ý không trả bất kỳ dữ liệu vận hành nào**.

### 1.2 Cơ chế thanh toán — nền tảng KHÔNG giữ tiền (AS-002)

Nền tảng **không cầm, không trung chuyển tiền thuê** giữa người ở và chủ trọ.

- Mỗi **Property** lưu thông tin nhận tiền riêng (`bank_name`, `bank_account_number`, `bank_account_name`).
- Hóa đơn xuất kèm số tài khoản + **mã VietQR sinh tại máy người dùng** theo chuẩn EMVCo, nhúng sẵn **số tiền** và **nội dung chuyển khoản** để chủ trọ đối chiếu tay dễ.
- Người ở chuyển khoản thẳng hoặc trả tiền mặt. Chủ trọ bấm "Đã thu" → hệ thống ghi `Payment`.

> **Vì sao đây là quyết định kiến trúc chứ không phải hạn chế tạm thời:** giữ tiền hộ người khác là hoạt động **trung gian thanh toán**, ở Việt Nam cần giấy phép của Ngân hàng Nhà nước. Mọi tính năng ngụ ý nền tảng đứng giữa dòng tiền — ví thanh toán, biên lai điện tử, đối soát tự động — đều nằm ngoài phạm vi và **không được hứa trên giao diện**.

Hệ quả thiết kế: `Payment` là **ghi chép tay của chủ trọ**, không có trạng thái chờ, không có webhook, không có đối soát. Trạng thái hóa đơn **suy ra** từ tổng `Payment` so với `total_amount`.

### 1.3 Ranh giới hệ thống

**Trong phạm vi:** 16 module ở Mục 3; web responsive; REST API; PostgreSQL; lưu trữ ảnh tin; nhắn tin trong app; đánh giá khu trọ verified; hiển thị số tài khoản + VietQR và ghi nhận thanh toán thủ công.

**Ngoài phạm vi:** ký hợp đồng điện tử; đặt lịch xem phòng; cầm/thu hộ tiền thuê; đối soát ngân hàng tự động; eKYC; dịch vụ môi giới; kê khai thuế thay người dùng; tích hợp Zalo (AS-001).

### 1.4 ⚠️ Đơn vị hành chính — MÔ HÌNH 2 CẤP

Từ **01/07/2025**, Nghị quyết 1685/NQ-UBTVQH15 **bãi bỏ cấp quận/huyện** trên cả nước. Việt Nam còn **hai cấp**: tỉnh/thành → phường/xã/đặc khu. Cả nước có **34 tỉnh/thành và 3.321 phường/xã**; TP.HCM sáp nhập với Bình Dương và Bà Rịa – Vũng Tàu thành 168 đơn vị cấp xã.

Đây không phải chi tiết nhỏ — nó chạm vào mọi bộ lọc, mọi form địa chỉ và mọi tin đăng.

**Quy tắc lưu trữ (áp dụng cho `rental_listings`, `properties`, `demand_posts`):**

| Cột | Vai trò |
|---|---|
| `province_code` (integer) | **Sự thật để lọc.** Mã Cục Thống kê, ổn định. |
| `ward_code` (integer) | **Sự thật để lọc sâu.** Duy nhất toàn quốc. |
| `district` (text) | **Tên hiển thị** của phường/xã tại thời điểm tạo — một *ảnh chụp*. |

> **Vì sao lưu cả mã lẫn tên:** mã dùng để lọc và tra cứu vì nó ổn định; tên là ảnh chụp để tin cũ vẫn đọc được sau này dù đơn vị hành chính lại đổi tên. Riêng tên phường **không đủ định danh** trên phạm vi toàn quốc — "Phường 1" tồn tại ở rất nhiều tỉnh.
>
> **Cố ý KHÔNG tạo bảng danh mục hành chính trong DB.** Danh mục là hằng số sinh từ script, nằm ở tầng ứng dụng. Dựng bảng danh mục nghĩa là có hai nguồn chân lý phải đồng bộ tay mỗi lần nhà nước sắp xếp lại đơn vị. Không đặt khóa ngoại tới danh mục.

**Yêu cầu tra cứu:** ô chọn khu vực phải **so khớp không dấu** — người dùng gõ "thu duc" phải ra "Phường Thủ Đức". Chuẩn hóa bằng cách tách dấu tổ hợp (NFD) rồi xóa, **cộng thêm xử lý riêng cho `đ`/`Đ`** vì hai ký tự này không phải chữ có dấu tổ hợp và NFD không tách được chúng. Thiếu bước này thì gõ "da nang" không ra "Đà Nẵng".

Ô tìm kiếm từ khóa của marketplace khớp **tiêu đề tin HOẶC tên phường/xã**, và cũng phải chấp nhận gõ không dấu.

### 1.5 Cơ chế liên hệ giữa người dùng

Đúng **hai kênh**:
- **Nhắn tin in-app** — không lộ số điện thoại, là kênh khuyến khích.
- **Gọi điện** — hiển thị `contact_phone`; khách chưa đăng nhập chỉ thấy **số bị che một phần** (BR-014).

Không tích hợp Zalo (AS-001). Không được tạo hội thoại với tin của **chính mình** (BR-030).

### 1.6 Kiến trúc — 4 vùng nghiệp vụ

Hệ thống chia thành **4 vùng có ranh giới rõ**, áp dụng đối xứng ở cả backend và frontend. Đây là tách **logic** trong một codebase, một database — không phải microservice.

| Vùng | Sở hữu dữ liệu | Nội dung |
|---|---|---|
| **shared** | `profiles`, `user_roles`, `conversations`, `messages`, `user_subscriptions`, `platform_settings` | Hạ tầng dùng chung: xác thực, hồ sơ, nhắn tin, gói dịch vụ, cấu hình |
| **marketplace** | `rental_listings`, `listing_amenities`, `listing_media`, `demand_posts`, `reviews`, `saved_listings` | Công khai + Renter + tin đăng của Seller |
| **workspace** | `properties`, `rooms`, `occupancies`, `contracts`, `utility_readings`, `invoices`, `invoice_items`, `payments` | SaaS vận hành của chủ trọ |
| **admin** | `moderation_logs` | Kiểm duyệt & quản trị |

**Luật ranh giới — đây là ràng buộc kiến trúc bắt buộc, không phải gợi ý:**

> **`marketplace` và `workspace` không được truy cập bảng của nhau.** Mọi truy cập dữ liệu phải đi qua tầng service **nằm trong chính vùng sở hữu bảng đó**.

Cơ chế cưỡng chế ở Spring Boot: mỗi vùng là một package `com.tronhanh.<vùng>`; repository của một bảng chỉ được khai báo trong package sở hữu nó; service của vùng khác muốn dùng thì gọi qua **interface public của vùng sở hữu**, không autowire repository trực tiếp.

Hai ngoại lệ được phép, đã liệt kê ở §1.1. Mọi crossing khác phải xảy ra **bên trong một service transaction ở tầng server**, không phải bằng cách frontend gọi hai API rồi tự ghép.

**`admin` được miễn luật này một cách tường minh** — người kiểm duyệt hợp lý khi nhìn cả hai vùng. Nhưng service của admin **chỉ được gọi các thao tác kiểm duyệt đã định nghĩa sẵn**, không viết truy vấn thô vào bảng nghiệp vụ.

> **Vùng đi theo DỮ LIỆU, không đi theo khung giao diện.** Một màn hình hiển thị bên trong layout của chủ trọ nhưng chạy 100% trên `rental_listings` thì **thuộc marketplace**. Nhầm chỗ này là cách phổ biến nhất làm ranh giới rữa ra sau vài sprint.

**Frontend Angular — 4 shell:**

| Shell | Tiền tố route | Người dùng |
|---|---|---|
| **Public** | `/`, `/tim-phong`, `/phong/:id`, `/khu-tro/:slug`, `/tin-nhu-cau` | Khách, Renter |
| **Tài khoản** | `/tai-khoan/*`, `/yeu-thich`, `/dang-tin-cho-thue`, `/tin-nhan` | Mọi tài khoản đăng nhập — **miễn phí** |
| **Chủ trọ** | `/chu-tro/*` | Seller có gói còn hiệu lực — **gating** |
| **Quản trị** | `/quan-tri/*` | Admin, Moderator |

> ⚠️ **Tách "Tài khoản" khỏi "Chủ trọ" là quyết định quan trọng.** Đăng tin cho thuê **không phải đặc quyền của chủ trọ** — ai cũng đăng được, miễn phí. Gộp chung hai vùng này (như thiết kế ban đầu) tạo ra tình trạng URL nói "chủ trọ" mà quyền truy cập lại mở cho tất cả, và người chỉ muốn đăng một cái tin bị lùa qua màn chào bán gói SaaS.
>
> Ranh giới đúng là **theo tiền và quyền**, không theo vai trò: `/tai-khoan/*` miễn phí; `/chu-tro/*` sau cổng gói.

### 1.7 Mô hình Gating SaaS — 4 trạng thái

Tách bạch hai khái niệm:

- **Năng lực Seller trên Marketplace** (đăng tin, boost, nhắn tin): **miễn phí**, tự kích hoạt.
- **Workspace quản lý vận hành**: nằm **sau cổng gating**.

| Trạng thái | Điều kiện | Quyền |
|---|---|---|
| **NONE** | Chưa từng kích hoạt | Zone tin đăng dùng bình thường; vùng SaaS chỉ thấy màn mời dùng thử |
| **TRIAL** | Bấm dùng thử (mỗi Seller 1 lần) | Dùng đầy đủ trong thời hạn dùng thử |
| **ACTIVE** | Đã mua, còn hạn | Đầy đủ theo `max_properties` / `max_rooms` của gói |
| **READ_ONLY** | Hết hạn TRIAL/ACTIVE | Chỉ xem/xuất; **không** tạo/sửa/xóa; **dữ liệu giữ nguyên** (BR-015) |

> **Vì sao hết hạn là READ_ONLY chứ không phải khóa:** mất dữ liệu vận hành của chủ trọ là tối kỵ — đó là hợp đồng, hóa đơn, lịch sử thu tiền của họ. Khóa cứng biến việc quên gia hạn thành thảm họa và giết luôn khả năng họ quay lại.

**Gating chỉ khóa quyền GHI của vùng SaaS.** Marketplace (đăng tin, boost, nhắn tin) **luôn miễn phí và không bao giờ bị gating**.

Ở frontend, trạng thái chỉ-đọc phải được xử lý **tại một chỗ duy nhất** — một hàm/`signal` `canWrite()` mà mọi nút ghi đọc chung, không phải kiểm tra rải rác từng nút.

> ⚠️ **Gác vùng SaaS bằng TRẠNG THÁI GÓI, không bằng vai trò.** Vai trò `Seller` được cấp tự động ngay lần đăng tin đầu tiên, nên nó chỉ có nghĩa "đã từng đăng tin" — dùng nó để gác cổng SaaS là mở toang cổng.

### 1.8 Mô hình Role — cộng dồn theo hành vi

**Nguyên tắc lõi:** vai trò là **cộng dồn (additive)**, không phải **chuyển đổi (switching)**. Quan hệ `User ↔ Role` là n-n; quyền hiệu lực của một phiên là **hợp** quyền của mọi vai trò đang có. Vì mọi permission đều dạng *cho phép* (không có permission *cấm*), hợp không bao giờ sinh mâu thuẫn.

> **Vì sao không bắt chọn vai trò lúc đăng ký:** ranh giới Renter/Seller ngoài đời rất mờ — chủ trọ vẫn đi tìm phòng, người thuê có thể đăng tin hộ. Bắt chọn sớm tăng ma sát đăng ký và đẻ ra luồng "chuyển đổi tài khoản" phức tạp. **Đánh đổi:** giao diện phải tự gánh việc phân ngữ cảnh — giải bằng 4 shell ở §1.6.

**Vòng đời vai trò:**

| Sự kiện | Vai trò sau sự kiện |
|---|---|
| Đăng ký | `[Renter]` — mặc định mọi tài khoản |
| Đăng tin nhu cầu | `[Renter]` — không đổi |
| **Tạo tin cho thuê đầu tiên** (kể cả bản nháp) | `[Renter, Seller]` — cấp tự động, **cùng transaction với việc tạo tin** |
| Bấm dùng thử / mua gói | Vai trò không đổi; chỉ đổi trạng thái gói |
| Admin cấp/gỡ vai trò | Theo thao tác Admin |

**Bất biến:** *tồn tại một tin có `seller_id = U` ⟹ U có vai trò Seller.* Bất biến này được giữ bằng cách gán vai trò **trong cùng transaction** với việc tạo tin — không phải bằng một lời gọi API thứ hai có thể thất bại.

**Hai vai trò nội bộ:**
- `Admin` — quản lý người dùng, phân quyền, cấu hình nền tảng.
- `Moderator` — kiểm duyệt tin và đánh giá. Không quản lý người dùng, không sửa cấu hình.

> ⛔ **`Admin` chỉ được tạo bằng thao tác thủ công trực tiếp trên cơ sở dữ liệu.** Tuyệt đối không có endpoint nào cho phép tự nâng mình lên Admin — kể cả "chỉ để tiện lúc phát triển". Một hàm kiểu `claimAdmin()` là backdoor và nó **sẽ** sống sót vào production. API cấp quyền chỉ được nhận `Seller` và `Moderator`.

---

## 2. ACTOR VÀ QUYỀN HẠN

> Chỉ có **5 actor**. "Người ở trọ" **không phải** actor — có tài khoản thì là **Renter** được gắn vào phòng; chưa có thì là bản ghi **Occupancy** do chủ trọ quản lý.

| Actor | Mô tả | Quyền chính |
|---|---|---|
| **Guest** | Chưa đăng nhập | Xem tin công khai, tìm kiếm/lọc, xem chi tiết, xem trang khu trọ công khai và đánh giá, thấy SĐT che một phần (BR-014) |
| **Renter** | Mọi tài khoản đã đăng nhập | Quyền Guest + nhắn tin/gọi, lưu tin, đăng & quản lý tin nhu cầu, xem "Phòng của tôi" khi được gắn vào phòng (liên kết **đã xác nhận**), viết đánh giá khu đã ở |
| **Seller** | Người đăng & quản lý tin cho thuê | Quyền Renter + đăng/sửa/ẩn/gia hạn/đẩy tin cho thuê; **(sau gating)** quản lý Property/Room/Occupancy/Contract/Invoice; trả lời đánh giá khu mình |
| **Moderator** | Nhân viên vận hành | Kiểm duyệt tin, ẩn đánh giá vi phạm |
| **Admin** | Quản trị hệ thống | Quyền Moderator + quản lý người dùng & vai trò, cấu hình nền tảng, xem thống kê toàn hệ thống |

**Renter và Occupancy — chống nhầm lẫn:**

| | Renter | Occupancy (người ở) |
|---|---|---|
| Là gì | Một **tài khoản** đăng nhập | Một **bản ghi dữ liệu** do Seller tạo |
| Ai tạo | Tự đăng ký | Chủ trọ nhập khi gán người vào phòng |
| Cần tài khoản? | Có | **Không bắt buộc** — có thể chỉ tên + SĐT |
| Thuộc về | Chính người dùng | Seller sở hữu (BR-007) |
| Liên kết | — | `user_id` (nullable) + `link_status` (Pending/Confirmed/Rejected — BR-029) |

---

## 3. MODULE CHỨC NĂNG (16 MODULE)

> `[SH]` = shared · `[MKT]` = marketplace · `[WS]` = workspace · `[AD]` = admin

### Module 1 — Xác thực & Tài khoản `[SH]`
- Đăng ký bằng **email + mật khẩu**; đăng nhập; đăng xuất; quên mật khẩu; đổi mật khẩu.
- **Đăng nhập bằng Google (OAuth).** Cùng một nút cho cả đăng ký và đăng nhập — với OAuth thì hai việc này là một lời gọi: tạo tài khoản mới nếu email chưa có, gộp vào tài khoản cũ nếu email đã tồn tại và đã xác minh.
- Cấp vai trò `Renter` tự động khi tài khoản được tạo.
- **Trường bắt buộc khi đăng ký: họ tên, email, mật khẩu (≥ 6 ký tự).** Số điện thoại là thông tin liên hệ **tùy chọn**, bổ sung sau ở phần cài đặt tài khoản.

> **Vì sao email là định danh chứ không phải số điện thoại:** đăng ký bằng SĐT bắt buộc phải có nhà cung cấp SMS để gửi OTP — một phụ thuộc hạ tầng có chi phí trên mỗi tin nhắn. Email + OAuth cho cùng mức tin cậy mà không cần khoản đó. Người đăng nhập bằng Google **không có** số điện thoại (Google không cấp), nên bắt buộc SĐT lúc đăng ký sẽ chặn cứng luồng OAuth.

### Module 2 — Hồ sơ cá nhân `[SH]`
Cập nhật họ tên, số điện thoại liên hệ. Thông tin nhận tiền **không** nằm ở đây — nó thuộc từng Property (Module 5), vì một chủ trọ có thể có nhiều khu với tài khoản ngân hàng khác nhau.

### Module 3 — Tin cho thuê `[MKT]`
- Tạo tin qua **form nhiều bước**: (1) thông tin cơ bản + khu vực 2 cấp; (2) tiện ích & mô tả; (3) ảnh; (4) chi phí (điện, nước, dịch vụ, cọc); (5) giờ giấc; (6) *(nếu Seller có Property)* gắn tin vào khu trọ.
- Lưu bản nháp; gửi duyệt; sửa; ẩn; xóa mềm; **gia hạn** (BR-026).
- **Đẩy tin (boost)** theo gói thời hạn cấu hình được (BR-005).
- **Tạo tin từ phòng trống** — prefill từ Room, gắn sẵn `room_id` và `property_id`.
- Danh sách tin của tôi, lọc theo trạng thái.

**Ràng buộc:** vòng đời BR-001; thời hạn BR-026; sửa trường quan trọng phải duyệt lại (BR-003); đồng bộ với Room (BR-027). `property_id` và `room_id` (nếu có) **phải thuộc chính người đăng** — kiểm tra ở tầng service, không bằng ràng buộc CSDL.

### Module 4 — Tin nhu cầu `[MKT]`
Một khái niệm, hai dạng phân biệt bằng trường `kind`:
- **`RoomWanted`** — tìm phòng: khu vực mong muốn, khoảng giá, loại hình, diện tích tối thiểu, tiện ích, thời điểm dọn vào.
- **`RoommateWanted`** — tìm người ở ghép: địa chỉ hiện tại, giá chia sẻ, số người cần, yêu cầu giới tính, yêu cầu khác.

> **Vì sao một bảng chứ không phải hai:** hai dạng dùng chung ~70% trường, chung vòng đời, chung màn danh sách và chung cơ chế kiểm duyệt. Tách đôi nghĩa là nhân đôi số bảng, số endpoint và số quy tắc phân quyền để đổi lấy vài cột nullable. Ràng buộc riêng của từng dạng giữ bằng CHECK có điều kiện (`kind <> 'RoommateWanted' or needed_count is not null`).

### Module 5 — Khu trọ (Property) `[WS]`
- Tạo/sửa/xóa mềm khu trọ.
- **Cấu hình nhận tiền:** ngân hàng, số tài khoản, tên chủ tài khoản → nguồn sinh VietQR.
- **Đơn giá mặc định của khu:** điện, nước, phí dịch vụ.
- **Bật/tắt hồ sơ khu công khai** (`is_public_profile_enabled`) — mặc định TẮT, chủ trọ chủ động bật.
- Danh sách khu kèm tổng phòng và số phòng trống.

**Ràng buộc:** không xóa khu còn phòng `Rented`/`Deposited` hoặc hợp đồng còn hiệu lực (BR-011); hạn mức theo gói (BR-015).

### Module 6 — Phòng (Room) `[WS]`
- Thêm/sửa/xóa phòng: mã phòng, tầng, diện tích, giá.
- **Đơn giá điện/nước/dịch vụ riêng của phòng** — để trống thì kế thừa đơn giá của khu. Cần thiết vì trong một khu thường có phòng dùng đồng hồ riêng và phòng tính khoán.
- Đổi trạng thái phòng; lọc theo trạng thái.
- "Tạo tin đăng" cho phòng trống; phòng đã có tin đang chạy hiện huy hiệu và **chặn tạo tin thứ hai** từ cùng phòng.

**Ràng buộc:** trạng thái BR-002; `room_code` duy nhất trong khu; đồng bộ với hợp đồng (BR-031) và tin đăng (BR-027).

### Module 7 — Người ở (Occupancy) `[WS]`
- Thêm người ở theo số điện thoại. Nếu SĐT đã có tài khoản → gợi ý gắn tài khoản, tạo liên kết ở trạng thái **`Pending`**; Renter tự **Chấp nhận** hoặc **Từ chối** (BR-029). Nếu chưa có tài khoản → thêm bằng tên + SĐT, gắn tài khoản sau.
- **Một hợp đồng có thể có nhiều người ở** (ở ghép): các Occupancy cùng trỏ về một `contract_id`, một người được đánh dấu `is_primary` làm đại diện.
- Kết thúc đợt ở: đặt `end_date`, `is_active = false` → vào lịch sử.
- **"Phòng của tôi"** cho Renter đã xác nhận liên kết: xem hợp đồng và hóa đơn của mình (kể cả mã VietQR để chuyển khoản), kèm tab lịch sử các đợt ở đã kết thúc.

### Module 8 — Hợp đồng (Contract) `[WS]`
Tạo hợp đồng (phòng, người ở đại diện, ngày bắt đầu/kết thúc, tiền thuê, cọc); **gia hạn**; **chấm dứt sớm** kèm lý do.

**Ràng buộc:** BR-006 — mỗi phòng tối đa một hợp đồng còn hiệu lực, **chặn chồng lấn khoảng thời gian**. Hợp đồng là bằng chứng mở quyền đánh giá (BR-022). Không ký điện tử.

### Module 9 — Điện nước, Hóa đơn, Thu tiền `[WS]`
**Đây là luồng cốt lõi của trụ cột SaaS.**

- Nhập chỉ số điện/nước theo kỳ (`YYYY-MM`) cho từng phòng.
- Lập hóa đơn từ các dòng: tiền phòng, điện, nước, dịch vụ, khác.
- Xuất hóa đơn kèm số tài khoản + **mã VietQR nhúng số tiền và mã hóa đơn**.
- Ghi nhận thu (đủ hoặc một phần), phương thức tiền mặt / chuyển khoản.

**Ràng buộc:** trạng thái hóa đơn **suy tự động** từ tổng đã thu (BR-004); duy nhất `(contract_id, period)`; duy nhất `(room_id, type, period)` cho chỉ số; chỉ số mới **≥** chỉ số cũ.

> **`previous_reading` và `unit_price` phải được tính ở tầng server**, lấy từ kỳ trước gần nhất và từ đơn giá của phòng/khu. Nhận hai giá trị này từ client là cho client tự quyết định hóa đơn của chính mình.

### Module 10 — Tin đã lưu `[MKT]`
Lưu/bỏ lưu tin cho thuê; trang danh sách tin đã lưu. Một khái niệm, hai nhãn ("Yêu thích" trên thanh điều hướng, "Tin đã lưu" trong tài khoản) — **một trang duy nhất**.

### Module 11 — Tìm kiếm & Lọc `[MKT]`
- Tìm theo **từ khóa** — khớp tiêu đề **hoặc** tên phường/xã, chấp nhận gõ không dấu (§1.4).
- Lọc: tỉnh/thành, phường/xã, khoảng giá, loại hình, diện tích, tiện ích.
- Sắp xếp: mới nhất, giá tăng/giảm, diện tích giảm.
- Phân trang **ở tầng server**.
- Xem kết quả dạng danh sách hoặc **bản đồ**.

**Ràng buộc:** chỉ trả tin `Active` cho người xem công khai; **tin còn hạn boost xếp trước trong MỌI danh sách** (BR-005) — thứ tự này áp dụng trước mọi tiêu chí sắp xếp khác.

> **Lọc tiện ích cần ngữ nghĩa VÀ** (tin phải có đủ mọi tiện ích được chọn), và nhãn lưu trong CSDL không khớp tuyệt đối với nhãn trên bộ lọc. Xử lý bằng cách lấy trước tập id tin thỏa đủ điều kiện rồi lọc theo tập đó — **phải làm xong trước khi phân trang**, nếu không tổng số kết quả và số trang đều sai.

### Module 12 — Nhắn tin `[SH]`
Hội thoại 1-1 gắn với **một tin** (cho thuê hoặc nhu cầu); gửi/nhận tin nhắn; đếm chưa đọc; đánh dấu đã đọc; danh sách hội thoại.

**Ràng buộc:** chỉ người đăng nhập (BR-019); không nhắn tin cho tin của chính mình (BR-030); mỗi cặp (người khởi tạo, tin) chỉ có **một** hội thoại — mở lại hội thoại cũ thay vì tạo mới.

> **`poster_id` phải được suy ra ở tầng server** từ `rental_listings.seller_id` hoặc `demand_posts.renter_id`. Nhận từ client cho phép bất kỳ ai mở hội thoại **"từ" người khác**.

Cập nhật thời gian thực qua WebSocket, có cơ chế làm tươi định kỳ dự phòng cho mạng yếu.

### Module 13 — Đánh giá khu trọ `[MKT]`
Người ở thật đánh giá **Property** để người thuê yên tâm trước khi cọc.

- Chấm 1–5 sao + nội dung ≤ 1.000 ký tự.
- **Mỗi đợt ở (mỗi hợp đồng) đúng một đánh giá**; sửa được trong 7 ngày.
- Hiển thị: huy hiệu điểm trên tin gắn khu + trang khu công khai `/khu-tro/:slug`.
- **Chủ khu trả lời đánh giá** — một phản hồi cho mỗi đánh giá.
- Moderator ẩn đánh giá vi phạm.

**Ràng buộc:** BR-022, BR-023, BR-024, BR-030.

### Module 14 — Kiểm duyệt & Quản trị `[AD]`
- **Hàng đợi duyệt tin** cho tin cho thuê và tin nhu cầu: duyệt / từ chối **kèm lý do bắt buộc**.
- **Kiểm duyệt đánh giá** bị báo cáo.
- **Quản lý người dùng**: tra cứu, cấp/gỡ vai trò `Seller` và `Moderator`.
- **Cấu hình nền tảng**: chế độ duyệt tự động/thủ công, thời hạn hiển thị tin, bảng giá đẩy tin.
- **Thống kê hệ thống**: tổng người dùng, tổng tin theo trạng thái, số việc đang chờ xử lý.

> **Mọi thay đổi trạng thái kiểm duyệt bắt buộc ghi một dòng nhật ký** (`moderation_logs`). Cách cưỡng chế: **không cấp quyền cập nhật trực tiếp** lên bảng tin cho Moderator — mọi transition phải đi qua đúng một service method, và method đó ghi nhật ký trong cùng transaction. Nhờ vậy không thể có transition nào lọt ra ngoài audit trail.

### Module 15 — Gói dịch vụ & Gating `[SH]`
Xem bảng gói; kích hoạt dùng thử (một lần mỗi Seller); mua/gia hạn; xem hạn. Cung cấp **guard gating** mà mọi endpoint ghi của vùng workspace phải đi qua (§1.7).

### Module 16 — Dashboard & Đối chiếu nhu cầu `[WS]`
- **Dashboard chủ trọ:** "Phòng trống" **luôn hiện**; "Tổng số phòng", "Đang thuê" và doanh thu theo **công tắc, mặc định TẮT** (BR-012); hợp đồng sắp hết hạn; hóa đơn chưa thu.
- **Đối chiếu nhu cầu:** xếp hạng tin nhu cầu theo độ khớp với phòng trống của chính chủ trọ (khu vực, giá, diện tích).

> **Vì sao mặc định ẩn các con số:** dashboard tuy riêng tư nhưng chủ trọ hay mở nơi công cộng hoặc chia sẻ màn hình. Doanh thu và số khách là thông tin nhạy cảm — để họ chủ động bật khi cần.

---

## 4. LUỒNG NGHIỆP VỤ CHI TIẾT

### 4.1 Khách tìm kiếm & xem chi tiết tin
1. Trang chủ → gõ từ khóa hoặc chọn khu vực → lọc → danh sách kết quả (**tin boost xếp trước**).
2. Chi tiết tin: thư viện ảnh, giá & chi phí, tiện ích, giờ giấc, thời điểm đăng, **huy hiệu điểm đánh giá của khu** (nếu tin gắn khu và khu đã bật hồ sơ công khai), khối liên hệ với **SĐT che một phần** kèm lời mời đăng nhập.
3. Không có kết quả → trạng thái rỗng có gợi ý nới bộ lọc. **Không bao giờ hiển thị dữ liệu mẫu khi không có kết quả thật.**

### 4.2 Renter liên hệ người đăng
1. Đăng nhập → "Nhắn tin" hoặc "Gọi" (hiện đủ số).
2. Kiểm tra: tin đang `Active`; **không phải tin của chính mình** → tạo mới hoặc mở lại hội thoại → gửi tin nhắn.

### 4.3 Đăng tin cho thuê (gồm kích hoạt vai trò Seller)
1. Từ "Đăng tin" trên thanh điều hướng → `/dang-tin-cho-thue`. **Tài khoản chưa có vai trò Seller vẫn vào được** — chính hành động tạo tin đầu tiên sẽ cấp vai trò.
2. Điền form nhiều bước (Module 3).
3. Lưu → trong **một transaction**: tạo tin + tiện ích + ảnh + cấp vai trò `Seller`.
4. Trạng thái tin được **suy ra ở tầng server**, không nhận từ client:

   | Điều kiện | Trạng thái |
   |---|---|
   | Lưu nháp | `Draft` |
   | Gửi duyệt, cấu hình duyệt tự động BẬT | `Active` + ghi nhật ký kiểm duyệt tự động |
   | Gửi duyệt, cấu hình duyệt tự động TẮT | `PendingApproval` |

5. Khi được duyệt: `approved_at = now()`, `expire_at = approved_at + 60 ngày` (BR-026).

### 4.4 Chủ trọ mở Workspace lần đầu
1. Vào `/chu-tro` → nếu chưa có gói, thấy màn mời với **hai lối rõ ràng**: "Đăng tin cho thuê (miễn phí)" và "Dùng thử bộ quản lý".
2. Chọn dùng thử → tạo bản ghi gói trạng thái `TRIAL` → hướng dẫn 3 bước: tạo khu + thông tin nhận tiền → thêm phòng → *(tùy chọn)* thêm người ở và hợp đồng.
3. Hết hạn → chuyển `READ_ONLY`, dữ liệu giữ nguyên.

### 4.5 Chủ trọ quản lý người ở — có bước xác nhận
1. Chi tiết phòng → "Thêm người ở" → nhập SĐT → hệ thống tra tài khoản:
   - **Có tài khoản:** hiện tên → chủ trọ bấm gắn → liên kết `Pending` → **Renter tự Chấp nhận** (`Confirmed` — mở "Phòng của tôi" và quyền đánh giá) **hoặc Từ chối** (`Rejected` — gỡ `user_id`, giữ lại bản ghi người ở dạng chỉ có tên + SĐT).
   - **Chưa có tài khoản:** nhập tên + SĐT; gắn tài khoản sau khi người đó đăng ký, cũng qua bước xác nhận.
2. Ở ghép → thêm người ở phụ vào cùng hợp đồng.
3. Rời đi → "Kết thúc ở" → đặt `end_date`, `is_active = false`.

> ⛔ **`link_status` không bao giờ được đặt thẳng thành `Confirmed`.** Toàn bộ giá trị chống gian lận của đánh giá verified nằm ở đúng bước xác nhận này — bỏ nó đi thì chủ trọ tự gắn tài khoản chim mồi rồi tự viết đánh giá 5 sao cho khu của mình.

### 4.6 Chủ trọ ghi điện nước → hóa đơn → ghi nhận thu *(luồng cốt lõi)*
1. Người ở gửi chỉ số qua kênh ngoài (AS-009).
2. Nhập chỉ số cho từng phòng đang có hợp đồng. Server tự lấy chỉ số kỳ trước và đơn giá; chặn nếu chỉ số mới nhỏ hơn chỉ số cũ; chặn trùng kỳ.
3. Lập hóa đơn — **tổng tiền tính bằng tổng các dòng ở tầng server**, không nhận từ client.
4. Xuất hóa đơn kèm số tài khoản + VietQR.
5. Nhận tiền ngoài nền tảng → bấm "Đã thu" → ghi nhận thanh toán → **trạng thái hóa đơn tự suy lại** từ tổng đã thu (BR-004).

### 4.7 Renter viết đánh giá khu trọ
1. Vào "Phòng của tôi" (đang ở) hoặc tab "Lịch sử ở trọ" (từng ở) → "Đánh giá khu".
2. Điều kiện mở (BR-022), kiểm ở tầng server:
   - Liên kết Occupancy ở trạng thái `Confirmed`;
   - Có hợp đồng tại khu đó;
   - **Không phải chủ khu** (BR-030);
   - Hợp đồng đã tồn tại **≥ 30 ngày** HOẶC đã có **≥ 1 lần ghi nhận thanh toán**;
   - Đợt ở này chưa có đánh giá (BR-023).
3. Chọn sao + nội dung → lưu → **điểm trung bình và số lượt đánh giá của khu được tính lại tự động**.
4. Hiển thị công khai **chỉ khi khu đang bật hồ sơ công khai** (BR-024). Khu chưa bật thì đánh giá vẫn được lưu, chờ chủ bật.

### 4.8 Kiểm duyệt
- **Duyệt tin:** hàng đợi → duyệt (đặt `approved_at`, `expire_at`) hoặc từ chối (**bắt buộc nhập lý do**) → ghi nhật ký.
- **Đánh giá bị báo cáo:** hàng đợi → ẩn hoặc giữ → ghi nhật ký.

### 4.9 Đẩy tin nổi bật
Seller chọn gói đẩy tin từ bảng giá do Admin cấu hình → hệ thống đặt `boost_expire_at = now() + số ngày của gói`.

> **`boost_expire_at` không bao giờ được nhận trực tiếp từ client.** Nếu nhận, bất kỳ ai cũng tự đặt cho mình 10 năm nổi bật. Client chỉ gửi **mã gói**; server tra bảng giá rồi tự tính thời hạn.

---

## 5. BUSINESS RULES

| BR | Nội dung |
|---|---|
| **BR-001** | Vòng đời tin cho thuê: `Draft → PendingApproval → Active → (Expired / Rented / Hidden / Rejected)`. Tin nhu cầu dùng cùng tập trạng thái, trừ `Rented`. |
| **BR-002** | Trạng thái phòng: **đúng 4 giá trị** `Available / Deposited / Rented / Hidden`. Phòng đang sửa chữa dùng `Hidden` — không thêm giá trị thứ 5 cho một trạng thái không có nghiệp vụ nào đằng sau. |
| **BR-003** | Sửa trường quan trọng của tin đang `Active` (tiêu đề, giá, địa chỉ, khu vực, diện tích, loại hình, mô tả) → chuyển về `PendingApproval`. Chỉ áp dụng khi chế độ duyệt thủ công đang bật. Gia hạn không sửa nội dung → **không** duyệt lại. |
| **BR-004** | Trạng thái hóa đơn **suy tự động từ tổng đã thu**: đủ → `Paid`; > 0 nhưng chưa đủ → `PartiallyPaid`; = 0 → `Unpaid`; chưa đủ mà quá `due_date` → `Overdue`. |
| **BR-005** | Chỉ hiển thị tin `Active` cho người xem công khai. **Tin còn hạn boost xếp trước trong mọi danh sách**, trước mọi tiêu chí sắp xếp khác. Chỉ đẩy được tin `Active`. |
| **BR-006** | Trạng thái hợp đồng: `Active → (Expired / Terminated)`. **Mỗi phòng tối đa một hợp đồng `Active`; chặn chồng lấn khoảng thời gian.** |
| **BR-007** | **Dữ liệu SaaS riêng tư tuyệt đối giữa các Seller.** Cô lập phải được cưỡng chế ở tầng truy vấn của server, không phải bằng cách lọc ở client. |
| **BR-008** | File riêng tư truy cập qua URL có chữ ký, thời hạn ngắn. |
| **BR-010** | Mỗi Renter tối đa 2 tin nhu cầu `Active` mỗi loại. |
| **BR-011** | Không xóa khu còn phòng `Rented`/`Deposited` hoặc hợp đồng `Active`. Xóa hợp lệ là xóa mềm. |
| **BR-012** | Dashboard: "Phòng trống" luôn hiện; "Tổng số phòng", "Đang thuê", doanh thu theo công tắc, **mặc định TẮT**. |
| **BR-013** | Một tài khoản đồng thời là Renter và Seller; vai trò cộng dồn theo hành vi (§1.8). |
| **BR-014** | Hai kênh liên hệ: nhắn tin in-app (không lộ SĐT) và gọi điện. **Khách chưa đăng nhập chỉ thấy SĐT che một phần.** |
| **BR-015** | Hết hạn gói → vùng SaaS chuyển **chỉ đọc**, **không mất dữ liệu**. Marketplace và nhắn tin không bị ảnh hưởng. Chạm hạn mức → chỉ **chặn tạo mới**, không đụng dữ liệu đang có. |
| **BR-018** | Đánh giá bị báo cáo từ 3 lần trở lên → tự chuyển trạng thái chờ kiểm duyệt. |
| **BR-019** | Chỉ người đăng nhập mới nhắn tin; không mở hội thoại với tin không còn `Active`; mỗi cặp (người khởi tạo, tin) đúng một hội thoại. |
| **BR-022** | **Verified review.** Chỉ tài khoản có liên kết Occupancy `Confirmed` và có hợp đồng tại khu đó mới viết được đánh giá. **Cấm chủ khu tự đánh giá khu mình.** Điều kiện mở: hợp đồng tồn tại ≥ 30 ngày **hoặc** đã có ≥ 1 lần ghi nhận thanh toán. |
| **BR-023** | Mỗi hợp đồng đúng một đánh giá; sửa được trong **7 ngày**. Trạng thái đánh giá: `Visible / Hidden / Reported`. |
| **BR-024** | Đánh giá **viết & lưu được bất kể khu đã bật công khai hay chưa**, nhưng **chỉ hiển thị** khi `is_public_profile_enabled = true`. Trang khu công khai chỉ hiện tên khu, khu vực, điểm, danh sách đánh giá và tin đang cho thuê — **tuyệt đối không lộ dữ liệu vận hành**. |
| **BR-025** | Tin và phòng có chính sách giờ giấc (`Free`/`Restricted` + giờ mở/đóng); hiển thị ở chi tiết và dùng làm bộ lọc. |
| **BR-026** | Tin cho thuê hiển thị **60 ngày** kể từ khi được duyệt. Gia hạn +60 ngày, không giới hạn số lần, **về thẳng `Active`** nếu không sửa nội dung. Thời hạn cấu hình được. |
| **BR-027** | **Đồng bộ Room ↔ RentalListing (chống tin ảo).** Phòng chuyển `Rented` → tin gắn phòng đó **tự chuyển `Rented` trong cùng transaction**. Tin không gắn phòng không bị ảnh hưởng. |
| **BR-029** | **Liên kết Occupancy cần đồng ý.** Gắn tài khoản vào bản ghi người ở tạo trạng thái `Pending`; Renter tự chuyển thành `Confirmed` hoặc `Rejected`. **Không bao giờ tự động `Confirmed`.** Người đã xác nhận có quyền tự gỡ liên kết. |
| **BR-030** | **Cấm tự tương tác:** không nhắn tin cho tin của chính mình; không đánh giá khu của chính mình. |
| **BR-031** | **Đồng bộ trạng thái phòng ↔ hợp đồng.** Tạo hợp đồng `Active` → phòng tự chuyển `Rented` trong cùng transaction. Hợp đồng kết thúc → **gợi ý một chạm** chuyển phòng về `Available`, không tự động (chủ có thể đang dọn hoặc sửa phòng). |

**Ba rule có ảnh hưởng kiến trúc, giải thích thêm:**

**BR-007 — cô lập dữ liệu.** Đây là ràng buộc bảo mật nghiêm trọng nhất của hệ thống. Ở Spring Boot, mọi truy vấn tới bảng thuộc vùng workspace **phải** kèm điều kiện chủ sở hữu lấy từ ngữ cảnh bảo mật của phiên. Không được để một endpoint nào nhận `ownerId` từ tham số request rồi tin nó.

**BR-024 — không phơi bảng `properties` ra công khai.** Bảng `properties` chứa **số tài khoản ngân hàng, tên chủ tài khoản và toàn bộ đơn giá**. Trang khu công khai chỉ được đọc qua một **projection khai báo tường minh từng cột** (`id, name, district, public_slug, avg_rating, review_count`). Không bao giờ trả về cả entity. Đây là chỗ dễ rò rỉ dữ liệu nhất trong toàn hệ thống: chỉ cần một lần trả nguyên entity "cho tiện" là lộ số tài khoản ngân hàng của mọi chủ trọ đã bật trang công khai.

**BR-027 — vì sao bắt buộc:** "phòng hết rồi mà tin vẫn treo" là nỗi đau số một mà sản phẩm này tuyên chiến. Không thể để chính hệ thống tái tạo nó.

---

## 6. MÔ HÌNH DỮ LIỆU (22 BẢNG)

> Quy ước chung: khóa chính `uuid`; mọi bảng có `created_at`, `updated_at`; bảng nghiệp vụ có `deleted_at` (xóa mềm). Tên bảng **số nhiều, snake_case**; tên cột **snake_case**.

### 6.1 Vùng shared

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `profiles` | `user_id` (unique, FK tới tài khoản), `full_name`, `contact_phone`, `is_seller` | Hồ sơ 1-1 với tài khoản. Tạo tự động khi tài khoản mới được tạo. |
| `user_roles` | `user_id`, `role` (`Renter`/`Seller`/`Admin`/`Moderator`), `granted_by`, unique `(user_id, role)` | **Bảng riêng, KHÔNG phải một cột `role` trên `profiles`.** |
| `conversations` | `ref_type` (`RentalListing`/`DemandPost`), `ref_id`, `initiator_id`, `poster_id`, `status`, `last_message_at`, `last_message_preview`, `initiator_unread`, `poster_unread`; unique `(initiator_id, ref_type, ref_id)`; check `initiator_id <> poster_id` | Hai bộ đếm chưa đọc tách riêng cho hai phía. |
| `messages` | `conversation_id`, `sender_id`, `content` (1–2.000 ký tự), `is_read`, `read_at` | |
| `subscription_plans` | `name`, `duration_months`, `price`, `renewal_price`, `max_properties`, `max_rooms` | |
| `user_subscriptions` | `seller_id`, `plan_id`, `start_date`, `expire_date`, `status` (`NONE`/`TRIAL`/`ACTIVE`/`READ_ONLY`) | |
| `platform_settings` | `key` (PK), `value` (jsonb) | Khóa hiện dùng: `auto_approve_listings`, `auto_approve_demand_posts`, `listing_ttl_days`, `boost_config`. |

> ⚠️ **Vì sao vai trò phải là bảng riêng, không phải cột trên `profiles`:** (1) vai trò là quan hệ n-n, một cột không diễn tả được; (2) người dùng **được phép tự sửa hồ sơ của mình** — một cột `role` nằm trong đó cho phép **bất kỳ ai tự nâng mình thành Admin bằng một lần cập nhật hồ sơ**. Đây là lỗ hổng leo thang đặc quyền, không phải chuyện phong cách code.
>
> Bảng `user_roles` chỉ được ghi qua service quản trị. Không có endpoint nào cho phép người dùng tự ghi vào bảng này.

**Cấu hình mặc định của `platform_settings`:**
```
auto_approve_listings     = true
auto_approve_demand_posts = true
listing_ttl_days          = 60
boost_config              = { "days": [7, 15, 30], "price": [20000, 35000, 60000] }
```

### 6.2 Vùng marketplace

| Bảng | Cột chính |
|---|---|
| `rental_listings` | `seller_id`, `room_id` (null), `property_id` (null), `title`, `property_type`, `price`, `area`, `address`, `district`, `province_code`, `ward_code`, `description`, `status`, `contact_name`, `contact_phone`, `electricity_price`, `water_price`, `water_unit` (`person`/`cubic`), `service_price`, `deposit`, `access_policy` (`Free`/`Restricted`), `access_open_time`, `access_close_time`, `latitude`, `longitude`, `approved_at`, `expire_at`, `rejection_reason`, `moderated_by`, `moderated_at`, `boost_expire_at`, `view_count`, `metadata` (jsonb) |
| `listing_amenities` | `listing_id`, `amenity` (text) |
| `listing_media` | `listing_id`, `storage_path`, `sort_order`, `width`, `height`, `size_bytes`, `mime_type`; unique `(listing_id, sort_order)` |
| `demand_posts` | `renter_id`, `kind`, `title`, `description`, `desired_districts` (text[]), `desired_province_code`, `desired_ward_codes` (int[]), `price_min`, `price_max`, `property_type`, `min_area`, `desired_amenities` (text[]), `move_in_date`, `occupant_count`, `contact_name`, `contact_phone`, `current_address`, `district`, `share_price`, `needed_count`, `gender_requirement`, `requirements` (text[]), `status`, `expire_at` |
| `reviews` | `property_id`, `author_user_id`, `contract_id` (**unique** — BR-023), `rating` (1–5), `content` (≤1.000), `status`, `report_count`, `seller_reply`, `seller_replied_at` |
| `saved_listings` | `user_id`, `listing_id`; unique `(user_id, listing_id)` |

**Ba quyết định mô hình hóa cần giữ:**

1. **`rental_listings.property_id` là cột của vùng marketplace trỏ sang vùng workspace.** Nó hợp lệ vì việc bắc cầu xảy ra **bên trong service ở tầng server**, không phải do frontend gọi chéo. Cần cho huy hiệu đánh giá và cho BR-027. **Kiểm quyền sở hữu của `property_id` bên trong service**, không bằng khóa ngoại.

2. **Ảnh lưu `storage_path`, KHÔNG BAO GIỜ lưu URL đầy đủ.** URL được dựng lúc render. Lưu URL biến việc đổi CDN hay đổi bucket thành một cuộc migration dữ liệu.

3. **`seller_reply` là một cột trên `reviews`, không phải bảng riêng.** Cardinality đúng 0..1, không cần phân trang, không cần sắp xếp. Một bảng riêng thêm cả một bề mặt phân quyền cho một chuỗi text.

### 6.3 Vùng workspace

| Bảng | Cột chính |
|---|---|
| `properties` | `owner_id`, `name`, `address`, `district`, `province_code`, `ward_code`, `floor_count`, `bank_name`, `bank_account_number`, `bank_account_name`, `electricity_unit_price`, `water_unit_price`, `service_fee`, `is_public_profile_enabled` (default false), `public_slug` (unique), `avg_rating`, `review_count` |
| `rooms` | `property_id`, `owner_id`, `room_code`, `floor`, `area`, `price`, `status`, `electricity_price` (null), `water_price` (null), `service_fee` (null); unique `(property_id, room_code)` |
| `occupancies` | `room_id`, `owner_id`, `user_id` (null), `link_status` (`Pending`/`Confirmed`/`Rejected`, null khi `user_id` null), `contract_id` (null), `is_primary`, `full_name`, `phone_number`, `start_date`, `end_date` (null), `occupant_count`, `is_active` |
| `contracts` | `room_id`, `occupancy_id`, `owner_id`, `start_date`, `end_date`, `rent_price`, `deposit`, `status`, `terminate_reason` |
| `utility_readings` | `room_id`, `owner_id`, `type` (`Electricity`/`Water`), `period` (`YYYY-MM`), `previous_reading`, `current_reading`, `unit_price`; check `current_reading >= previous_reading`; unique `(room_id, type, period)` |
| `invoices` | `room_id`, `contract_id`, `owner_id`, `period`, `due_date`, `total_amount`, `status`; unique `(contract_id, period)` |
| `invoice_items` | `invoice_id`, `type` (`Rent`/`Electricity`/`Water`/`Service`/`Other`), `description`, `quantity`, `unit_price`, `amount` |
| `payments` | `invoice_id`, `owner_id`, `amount`, `method` (`Cash`/`BankTransfer`), `paid_at`, `purpose` |

> **Đơn giá điện/nước/dịch vụ có ở CẢ `properties` LẪN `rooms`.** Giá trị ở `rooms` là ghi đè; để `null` thì kế thừa của khu. Cần một hàm/service duy nhất trả về "đơn giá hiệu lực của phòng này", để không có hai chỗ tự tính fallback rồi lệch nhau.
>
> **`unique (contract_id, period)` chứ không phải `(room_id, period)`** — cho phép hai hóa đơn cùng phòng cùng tháng khi đổi người giữa kỳ.

### 6.4 Vùng admin

| Bảng | Cột chính |
|---|---|
| `moderation_logs` | `target_type` (`RentalListing`/`DemandPost`/`Review`/`Conversation`/`Message`/`User`), `target_id`, `moderator_id` (null = hệ thống tự động), `action` (`Approve`/`Reject`/`Hide`/`Restore`/`Lock`/`Unlock`), `reason` |

### 6.5 Index bắt buộc

```
rental_listings (status, boost_expire_at desc nulls last, created_at desc) where deleted_at is null
rental_listings (status, district, price)  where deleted_at is null
rental_listings (province_code, status)    where deleted_at is null
rental_listings (ward_code, status)        where deleted_at is null
rental_listings (seller_id, status) · (property_id) · (room_id)
rental_listings gin(title trigram) · gin(address trigram)
listing_amenities (listing_id) · (amenity)
rooms (property_id, status) · (owner_id, status)   where deleted_at is null
occupancies (room_id) · (user_id)
contracts (room_id, status)                        where deleted_at is null
invoices  unique (contract_id, period)             where deleted_at is null
utility_readings unique (room_id, type, period)    where deleted_at is null
payments (invoice_id)
demand_posts (status, kind, created_at desc)       where deleted_at is null
demand_posts gin(desired_ward_codes)
reviews (property_id, status, created_at desc) · (author_user_id)
conversations (poster_id, last_message_at desc) · (initiator_id, last_message_at desc)
messages (conversation_id, created_at)
```

> **Chọn chỉ mục trigram thay vì full-text search.** Dấu tiếng Việt cộng với ô tìm kiếm có hình dạng "chứa chuỗi con" làm full-text thành lựa chọn tệ hơn và bắt phải cấu hình bộ bỏ dấu. Trigram + so khớp `chứa` là một extension duy nhất và chỉ mục thật sự được dùng.

---

## 7. REST API (Spring Boot)

> Tiền tố `/api/v1`. Chuẩn response, lỗi và phân trang ở §7.6 — **một chuẩn duy nhất cho toàn dự án**.

### 7.1 Xác thực, hồ sơ, nhắn tin
```
POST   /auth/register              POST /auth/login            POST /auth/logout
POST   /auth/refresh               POST /auth/google           (OAuth callback)
POST   /auth/forgot-password       POST /auth/reset-password
GET    /me                         (hồ sơ + roles[] + trạng thái gói — nguồn chân lý của client)
PUT    /me/profile                 PUT  /me/password
GET    /conversations              POST /conversations
GET    /conversations/{id}/messages          POST /conversations/{id}/messages
PATCH  /conversations/{id}/read
GET    /conversations/unread-count
```

### 7.2 Marketplace
```
GET    /listings                   (tìm kiếm + lọc + phân trang + sắp xếp)
GET    /listings/{id}              GET  /listings/{id}/similar
POST   /listings                   (tạo — cấp vai trò Seller cùng transaction)
PUT    /listings/{id}              PATCH /listings/{id}/status
DELETE /listings/{id}              (xóa mềm)
PATCH  /listings/{id}/renew        POST  /listings/{id}/boost   (body: mã gói)
GET    /me/listings
POST   /listings/{id}/save         DELETE /listings/{id}/save   GET /me/saved-listings
GET    /demand-posts               GET  /demand-posts/{id}
POST   /demand-posts               PUT  /demand-posts/{id}      DELETE /demand-posts/{id}
GET    /me/demand-posts
GET    /public/properties/{slug}   (trang khu công khai — projection allow-list cột)
GET    /public/properties/{slug}/reviews
POST   /reviews                    PUT  /reviews/{id}
GET    /me/reviews                 GET  /me/reviewable-stays
GET    /regions/provinces          GET  /regions/wards?provinceCode=
```

### 7.3 Workspace (chịu gating)
```
GET/POST   /properties             GET/PUT/DELETE /properties/{id}
PATCH      /properties/{id}/public-profile
GET/POST   /properties/{id}/rooms  GET/PUT/DELETE /rooms/{id}
PATCH      /rooms/{id}/status      POST /rooms/{id}/create-listing
GET        /rooms/{id}/effective-prices
GET/POST   /rooms/{id}/occupancies          PUT /occupancies/{id}
POST       /occupancies/lookup              (tra tài khoản theo SĐT)
POST       /contracts                       (tạo occupancy + contract, atomic)
POST       /contracts/{id}/occupants        (thêm người ở ghép)
PATCH      /contracts/{id}/extend            PATCH /contracts/{id}/terminate
POST       /rooms/{id}/utility-readings     GET  /rooms/{id}/utility-readings
GET/POST   /invoices                        GET  /invoices/{id}
POST       /invoices/{id}/payments
GET        /dashboard/summary
GET        /vacancies/matching-demands      (đối chiếu phòng trống ↔ tin nhu cầu)
GET        /me/property-reviews             POST /reviews/{id}/reply
GET/POST   /me/subscription                 POST /me/subscription/trial
# "Phòng của tôi" — Renter đã xác nhận liên kết
GET    /me/stays                   PATCH /me/occupancies/{id}/confirm
PATCH  /me/occupancies/{id}/reject PATCH /me/occupancies/{id}/unlink
GET    /me/stays/{id}/contracts    GET   /me/stays/{id}/invoices
```

### 7.4 Quản trị
```
GET    /admin/users                PATCH /admin/users/{id}/roles
GET    /admin/moderation/listings  PATCH /admin/listings/{id}/moderate   (body: action, reason)
GET    /admin/moderation/reviews   PATCH /admin/reviews/{id}/hide
GET    /admin/settings             PUT   /admin/settings/{key}
GET    /admin/dashboard
```

### 7.5 Nguyên tắc thiết kế endpoint — bắt buộc

> **Giá trị nhạy cảm phải được suy ra ở tầng server, KHÔNG BAO GIỜ nhận từ request body.** Nhận từ client tức là cho client tự phong quyền cho mình.

| Không bao giờ nhận từ client | Suy ra từ |
|---|---|
| `seller_id`, `owner_id`, `renter_id`, `author_user_id` | Người dùng trong ngữ cảnh bảo mật của phiên |
| `poster_id` của hội thoại | `rental_listings.seller_id` / `demand_posts.renter_id` |
| `property_id` của đánh giá | `contract → room.property_id` |
| `previous_reading` | Kỳ trước gần nhất của cùng phòng + loại |
| `unit_price` của chỉ số | Đơn giá hiệu lực của phòng (ghi đè của phòng, nếu không thì của khu) |
| `invoices.total_amount` | Tổng `invoice_items.amount` |
| `rental_listings.status` | Cấu hình duyệt tự động + cờ "gửi duyệt" |
| `boost_expire_at` | Bảng giá đẩy tin + mã gói client chọn |

> **Mọi thao tác chạm nhiều bảng phải nằm trong MỘT transaction.** Không được thay bằng một chuỗi lời gọi tuần tự — sai một bước giữa chừng là dữ liệu lệch vĩnh viễn giữa các bảng. Danh sách bắt buộc: tạo tin (+tiện ích +ảnh +cấp vai trò); sửa tin; kiểm duyệt tin (+ghi nhật ký); tạo người ở + hợp đồng (+đổi trạng thái phòng +đồng bộ tin); tạo hóa đơn + các dòng; ghi nhận thu (+tính lại trạng thái hóa đơn); đăng đánh giá (+tính lại điểm khu); mở hội thoại; cấp/gỡ vai trò.

### 7.6 Chuẩn response

- **Thành công:** `{ "data": …, "meta": {…} }` — không có cờ `success`, mã HTTP đã nói điều đó.
- **Lỗi:** `{ "error": { "code": "ROOM_NOT_OWNED", "message": "…", "details": [] } }`.
- **Phân trang:** `?page=&pageSize=&sort=` → `meta: { page, pageSize, total, totalPages }`.
- **Mã trạng thái:** 200/201 thành công · 400 sai cấu trúc · 401 chưa xác thực · 403 không đủ quyền · 404 không tồn tại · 409 xung đột (trùng `room_code`, chồng lấn hợp đồng, trùng kỳ hóa đơn) · 422 sai validation ngữ nghĩa · 429 vượt giới hạn tần suất.

**Mã lỗi nghiệp vụ — bảng chuẩn.** Backend raise **mã**, không raise câu văn; frontend tra bảng để hiển thị tiếng Việt. Nhờ vậy đổi câu chữ không phải sửa backend, và **không bao giờ có văn bản kỹ thuật lọt ra giao diện**.

| Mã | Thông báo cho người dùng |
|---|---|
| `AUTH_REQUIRED` | Bạn cần đăng nhập để thực hiện thao tác này. |
| `FORBIDDEN` | Bạn không có quyền thực hiện thao tác này. |
| `ROOM_NOT_OWNED` | Phòng này không thuộc quyền quản lý của bạn. |
| `PROPERTY_NOT_OWNED` | Khu trọ này không thuộc quyền quản lý của bạn. |
| `PROPERTY_HAS_RENTED_ROOMS` | Không thể xóa khu trọ khi vẫn còn phòng đang cho thuê. |
| `ROOM_HAS_ACTIVE_CONTRACT` | Phòng này đã có hợp đồng còn hiệu lực trong khoảng thời gian đó. |
| `ROOM_ALREADY_LISTED` | Phòng này đã được gắn với một tin đăng khác đang hiển thị. |
| `READING_LOWER_THAN_PREVIOUS` | Chỉ số kỳ này không được nhỏ hơn chỉ số kỳ trước. |
| `INVOICE_PERIOD_EXISTS` | Kỳ này đã có hóa đơn. |
| `REVIEW_NOT_ELIGIBLE` | Bạn chưa đủ điều kiện đánh giá khu trọ này. |
| `REVIEW_ALREADY_EXISTS` | Bạn đã đánh giá đợt ở này rồi. |
| `SELF_CONTACT_FORBIDDEN` | Bạn không thể nhắn tin cho tin đăng của chính mình. |
| `LISTING_NOT_CONTACTABLE` | Tin đăng này hiện không nhận liên hệ. |
| `REASON_REQUIRED` | Vui lòng nhập lý do từ chối. |
| `WORKSPACE_READ_ONLY` | Gói dịch vụ đã hết hạn. Bạn vẫn xem được dữ liệu, gia hạn để tiếp tục chỉnh sửa. |
| `TRIAL_ALREADY_USED` | Tài khoản này đã sử dụng bản dùng thử. |
| `INVALID_BOOST_PACKAGE` | Gói đẩy tin không hợp lệ. |

---

## 8. PHÂN QUYỀN VÀ MÔ HÌNH BẢO MẬT

### 8.1 Ma trận quyền

| Nhóm chức năng | Guest | Renter | Seller | Moderator | Admin |
|---|---|---|---|---|---|
| Xem tin, tìm kiếm, xem trang khu công khai | ✓ | ✓ | ✓ | ✓ | ✓ |
| Nhắn tin, lưu tin, đăng tin nhu cầu | – | ✓ | ✓ | – | – |
| Viết đánh giá | – | ✓¹ | ✓¹ | – | – |
| Đăng & quản lý tin cho thuê, đẩy tin | – | –³ | ✓ | – | – |
| Workspace SaaS | – | – | ✓² | – | – |
| Kiểm duyệt tin & đánh giá | – | – | – | ✓ | ✓ |
| Quản lý người dùng, vai trò, cấu hình | – | – | – | – | ✓ |

¹ Chỉ khi đạt đủ điều kiện BR-022. ² Chỉ khi gói ở `TRIAL`/`ACTIVE`; `READ_ONLY` chỉ đọc. ³ Renter tạo tin đầu tiên sẽ tự nhận vai trò Seller ngay trong chính request đó.

### 8.2 Thứ tự kiểm tra cho endpoint vùng workspace

```
1. Token hợp lệ                    → 401 nếu không
2. Có vai trò Seller               → 403 FORBIDDEN
3. Quyền sở hữu bản ghi (BR-007)   → 403 *_NOT_OWNED
4. Trạng thái gói cho phép ghi     → 403 WORKSPACE_READ_ONLY
```

**Bốn bước này phải chạy ở tầng server.** Guard phía Angular chỉ là trải nghiệm người dùng — nó ngăn người ta bấm vào chỗ không dùng được, nó **không** là biên bảo mật. Không bao giờ được phân quyền dựa trên một giá trị mà client đọc được và sửa được.

### 8.3 Cô lập dữ liệu — yêu cầu triển khai

Prototype cưỡng chế cô lập ở **tầng cơ sở dữ liệu**. Khi dựng lại trên Spring Boot, cùng mức bảo đảm đó phải được tái lập ở tầng ứng dụng:

1. **Mọi repository của vùng workspace nhận `ownerId` như một tham số bắt buộc**, lấy từ ngữ cảnh bảo mật — không phải từ request. Cách hiệu quả nhất là một lớp base repository/specification tự chèn điều kiện này, để lập trình viên **không thể quên**.
2. **Không có endpoint nào trả về entity thô của `properties`.** Luôn qua DTO. Số tài khoản ngân hàng chỉ xuất hiện trong DTO của chính chủ sở hữu và trong DTO hóa đơn gửi cho người ở đã xác nhận liên kết.
3. **Kiểm quyền sở hữu phải nằm bên trong service transaction**, ngay trước khi ghi — không phải ở controller. Controller có thể bị bỏ qua khi service được gọi từ chỗ khác.
4. **Người ở đã xác nhận liên kết** đọc được hợp đồng và hóa đơn **của chính mình** — đây là một đường đọc riêng, không dùng chung truy vấn với chủ trọ.

> **Bài học từ prototype, đáng giữ:** khi cưỡng chế cô lập bằng cơ chế khai báo (chính sách ở CSDL), lỗi cấu hình biểu hiện thành **danh sách rỗng bí ẩn, không có thông báo lỗi nào**. Khi chuyển sang cưỡng chế ở tầng ứng dụng, hãy làm ngược lại: **thiếu điều kiện chủ sở hữu phải là lỗi ồn ào ngay lúc chạy**, không phải một truy vấn âm thầm trả về dữ liệu của người khác. Viết integration test cho từng bảng workspace với hai tài khoản chủ trọ khác nhau — đó là bộ test giá trị nhất trong cả dự án.

---

## 9. VALIDATION

Validate **ở tầng server trước khi ghi**. Validation phía client chỉ để phản hồi nhanh cho người dùng.

- **Tài khoản:** email đúng định dạng, duy nhất; mật khẩu ≥ 6 ký tự; họ tên bắt buộc; SĐT tùy chọn, nếu có thì đúng định dạng Việt Nam.
- **Tin cho thuê:** tiêu đề 10–120 ký tự; giá > 0; diện tích > 0; ảnh ≥ 3; `access_policy = Restricted` thì bắt buộc có giờ mở/đóng; `property_id`/`room_id` nếu có phải thuộc chính người đăng.
- **Khu trọ:** bật hồ sơ công khai thì bắt buộc có tên và khu vực; `public_slug` tự sinh, duy nhất; số tài khoản chỉ chứa chữ số; **tên chủ tài khoản IN HOA không dấu** (yêu cầu của chuẩn VietQR).
- **Phòng:** `room_code` duy nhất trong khu; giá ≥ 0; diện tích > 0.
- **Người ở:** `end_date ≥ start_date`; `link_status` chỉ có nghĩa khi có `user_id`.
- **Hợp đồng:** `end_date > start_date`; chặn hợp đồng `Active` thứ hai và chặn chồng lấn thời gian trên cùng phòng (409).
- **Chỉ số điện nước:** `current_reading ≥ previous_reading`; đơn giá ≥ 0; duy nhất `(room_id, type, period)`.
- **Hóa đơn:** `period` đúng định dạng `YYYY-MM`; tổng = tổng các dòng; duy nhất `(contract_id, period)`.
- **Ghi nhận thu:** số tiền > 0; tổng đã thu không vượt tổng hóa đơn.
- **Đánh giá:** sao 1–5; nội dung ≤ 1.000 ký tự; hợp đồng hợp lệ và thuộc người viết; không phải chủ khu; đạt điều kiện mở BR-022; chặn trùng theo hợp đồng.
- **Hội thoại:** người khởi tạo khác người đăng tin; tin đang ở trạng thái cho phép.
- **Gói dịch vụ:** không dùng thử lần thứ hai.

---

## 10. DANH SÁCH MÀN HÌNH (Angular)

### 10.A Shell Public

| Màn hình | Route | Nội dung |
|---|---|---|
| Trang chủ | `/` | Ô tìm kiếm, tin nổi bật, khu vực gợi ý |
| Kết quả tìm phòng | `/tim-phong` | Danh sách + bộ lọc + chế độ bản đồ |
| Tất cả phòng | `/tat-ca-phong` | Duyệt toàn bộ tin, bộ lọc đầy đủ |
| Chi tiết tin | `/phong/:id` | Thư viện ảnh, chi phí, tiện ích, huy hiệu điểm khu, khối liên hệ, phòng tương tự |
| Trang khu trọ công khai | `/khu-tro/:slug` | Tên khu, khu vực, điểm & danh sách đánh giá, tin đang cho thuê |
| Tin nhu cầu | `/tin-nhu-cau`, `/tin-nhu-cau/:id` | Danh sách và chi tiết tin tìm phòng / ở ghép |
| Đăng tin nhu cầu | `/dang-tin-nhu-cau` | Form theo dạng tin |
| Đăng nhập / Đăng ký | `/dang-nhap`, `/dang-ky` | Email + mật khẩu, hoặc Google |

### 10.B Shell Tài khoản *(đăng nhập, miễn phí)*

| Màn hình | Route |
|---|---|
| Tổng quan tài khoản | `/tai-khoan` |
| Cài đặt tài khoản | `/tai-khoan/cai-dat` |
| Tin cho thuê của tôi | `/tai-khoan/tin-cho-thue` |
| Tin nhu cầu của tôi | `/tai-khoan/tin-nhu-cau` |
| Phòng của tôi | `/tai-khoan/phong-cua-toi` |
| Đánh giá của tôi | `/tai-khoan/danh-gia` |
| Tin đã lưu | `/yeu-thich` |
| Đăng / sửa tin cho thuê | `/dang-tin-cho-thue`, `/dang-tin-cho-thue/:id` |
| Hộp thư | `/tin-nhan`, `/tin-nhan/:id` |

### 10.C Shell Chủ trọ *(gating theo gói)*

| Màn hình | Route |
|---|---|
| Tổng quan | `/chu-tro` |
| Khu trọ & Phòng | `/chu-tro/quan-ly-phong` |
| Điện nước & Hóa đơn | `/chu-tro/hoa-don` |
| Tìm người thuê | `/chu-tro/tim-nguoi-thue` |
| Đánh giá khu của tôi | `/chu-tro/danh-gia` |

### 10.D Shell Quản trị

| Màn hình | Route |
|---|---|
| Tổng quan hệ thống | `/quan-tri` |
| Kiểm duyệt tin | `/quan-tri/kiem-duyet-tin` |
| Kiểm duyệt đánh giá | `/quan-tri/danh-gia` |
| Quản lý người dùng | `/quan-tri/nguoi-dung` |
| Cấu hình nền tảng | `/quan-tri/cai-dat` |

> **Quy ước route:** tiếng Việt không dấu, `kebab-case`. Route là một phần của sản phẩm, không phải chi tiết kỹ thuật — người dùng nhìn thấy và chia sẻ chúng.
>
> **Quy ước redirect:** mọi tình huống khách bị yêu cầu đăng nhập (nhắn tin, lưu tin, xem SĐT) đều mang tham số `?redirect=` để sau khi đăng nhập quay lại đúng ngữ cảnh. Chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng `/` và không bắt đầu bằng `//` — nếu không đây là lỗ hổng chuyển hướng mở.

---

## 11. CẤU TRÚC BACKEND (Spring Boot)

Một ứng dụng, một cơ sở dữ liệu, chia module theo đúng 4 vùng ở §1.6.

```
com.tronhanh
├── shared/          auth, profile, role, messaging, subscription, settings
│                    + config bảo mật, xử lý lỗi toàn cục, bảng mã lỗi
├── marketplace/     listing, demandpost, review, savedlisting, search, media
├── workspace/       property, room, occupancy, contract, billing, dashboard
└── admin/           moderation, usermanagement, platformsettings
```

Mỗi module có `controller / service / repository / dto / mapper`. **Repository của một bảng chỉ được khai báo trong module sở hữu bảng đó** (§1.6).

**Danh sách service và trách nhiệm:**

| Module | Service | Trách nhiệm |
|---|---|---|
| shared | `AuthService` | Đăng ký/đăng nhập, OAuth Google, token, cấp vai trò |
| | `ProfileService` | Hồ sơ người dùng |
| | `MessagingService` | Hội thoại, tin nhắn, chặn tự liên hệ |
| | `SubscriptionService` | Gói, dùng thử, **guard gating** cho mọi endpoint ghi của workspace |
| | `PlatformSettingsService` | Đọc/ghi cấu hình nền tảng |
| marketplace | `ListingService` | Vòng đời tin (BR-001/003/026), đẩy tin, tạo từ phòng, đồng bộ từ phòng (BR-027) |
| | `DemandPostService` | Tin nhu cầu (BR-010) |
| | `SearchService` | Tìm kiếm, lọc, sắp xếp, phân trang; chuẩn hóa không dấu |
| | `ReviewService` | Kiểm điều kiện (BR-022/023), tính lại điểm khu, trang khu công khai |
| | `SavedListingService` | Lưu tin |
| | `MediaService` | Ảnh tin, đường dẫn lưu trữ, phân quyền file |
| workspace | `PropertyService` | Khu trọ, thông tin nhận tiền, cờ công khai (BR-011) |
| | `RoomService` | Phòng, trạng thái (BR-002/031), đơn giá hiệu lực |
| | `OccupancyContractService` | Người ở (BR-029), hợp đồng (BR-006/031), gia hạn, chấm dứt |
| | `BillingService` | Chỉ số điện nước, hóa đơn, ghi nhận thu, VietQR |
| | `DashboardService` | Thống kê chủ trọ (BR-012), đối chiếu phòng trống ↔ tin nhu cầu |
| admin | `ModerationService` | Duyệt tin, ẩn đánh giá, ghi nhật ký |
| | `UserManagementService` | Tra cứu người dùng, cấp/gỡ vai trò |

**Tác vụ định kỳ:**

| Tác vụ | Việc |
|---|---|
| Hết hạn tin | Tin quá `expire_at` → `Expired` |
| Quá hạn hóa đơn | Hóa đơn chưa thu đủ mà quá `due_date` → `Overdue` |
| Hết hạn hợp đồng | Hợp đồng quá `end_date` → `Expired` |
| Hết hạn gói | Gói quá `expire_date` → `READ_ONLY` |

---

## 12. YÊU CẦU PHI CHỨC NĂNG

- **Hiệu năng:** kết quả tìm kiếm < 1,5s; **phân trang ở tầng server** — không bao giờ tải toàn bộ danh sách rồi lọc trong bộ nhớ; index theo §6.5.
- **Bảo mật:** băm mật khẩu bằng bcrypt/argon2; token truy cập ngắn hạn + refresh token thu hồi được; file riêng tư qua URL có chữ ký; cô lập theo chủ sở hữu (BR-007); giới hạn tần suất cho đăng nhập, đăng ký, đăng tin, nhắn tin.
- **Riêng tư:** trang khu công khai không lộ dữ liệu vận hành (BR-024); dashboard mặc định ẩn số nhạy cảm (BR-012); liên kết người ở cần đồng ý (BR-029).
- **Độ tin cậy:** mọi thao tác đa bảng bọc transaction (§7.5).
- **Khả bảo trì:** một chuẩn API duy nhất (§7.6); xóa mềm; ghi nhật ký mọi thao tác kiểm duyệt.
- **Xử lý lỗi:** thông báo cho người dùng **luôn bằng tiếng Việt, thân thiện**. **Không bao giờ để lộ stack trace, tên bảng, tên cột hay câu SQL ra giao diện.** Backend trả mã lỗi, frontend tra bảng ở §7.6.
- **Ba trạng thái giao diện phải phân biệt rõ:** *đang tải* / *lỗi* / *không có dữ liệu*. Danh sách rỗng phải render trạng thái rỗng có hướng dẫn, **không bao giờ thay bằng dữ liệu mẫu**.

---

## 13. GIẢ ĐỊNH CHUẨN

| Mã | Giả định |
|---|---|
| AS-001 | Liên hệ qua 2 kênh: nhắn tin in-app + gọi điện. Không tích hợp Zalo, không đặt lịch xem phòng. |
| AS-002 | Nền tảng **không** cầm/thu hộ tiền thuê. Hóa đơn kèm số tài khoản + VietQR của từng khu; chủ trọ tự ghi nhận thu. |
| AS-004 | Một tài khoản kiêm Renter và Seller; vai trò cộng dồn theo hành vi (§1.8). |
| AS-005 | Seller là chủ bất động sản hoặc người được ủy quyền. Nền tảng không môi giới, không phân biệt người đăng. |
| AS-006 | `occupancies.user_id` nullable; liên kết tài khoản cần Renter xác nhận (BR-029). |
| AS-007 | Đánh giá chỉ dành cho người ở đã xác thực (BR-022). Chủ không dùng SaaS thì khu không có đánh giá — **có chủ đích**, xem §14. |
| AS-009 | Người ở gửi chỉ số điện nước cho chủ qua kênh ngoài; chủ trọ nhập vào hệ thống. |
| AS-010 | Hồ sơ khu công khai là opt-in; đánh giá viết được trước, hiển thị khi chủ bật (BR-024). |
| AS-013 | Thông tin nhận tiền đặt theo **từng khu trọ**, không đặt ở hồ sơ cá nhân. |
| AS-017 | Đơn giá điện/nước do chủ trọ tự nhập, không lấy biểu giá nhà nước. Phòng ghi đè được đơn giá của khu. |
| AS-018 | Bản đồ dùng dịch vụ bên thứ ba; tọa độ lưu khi đăng tin. |
| AS-019 | Web responsive trước; ứng dụng di động sau, dùng lại cùng API. |
| AS-021 | **Đơn vị hành chính theo mô hình 2 cấp từ 01/07/2025** (§1.4). Danh mục là hằng số ở tầng ứng dụng, không phải bảng trong CSDL. |
| AS-022 | **Định danh đăng nhập là email**; đăng nhập bằng Google được hỗ trợ; số điện thoại là thông tin liên hệ tùy chọn. |

---

## 14. PHỤ LỤC — VÌ SAO ĐÁNH GIÁ CHỈ DÀNH CHO NGƯỜI Ở ĐÃ XÁC THỰC

*(Phần này chuẩn bị sẵn cho câu hỏi phản biện chắc chắn sẽ có.)*

**Lập luận lõi:** giá trị của đánh giá nằm ở **độ tin cậy**, không ở số lượng — và độ tin cậy là thứ duy nhất các nhóm rao vặt trên mạng xã hội không làm được. Cho đánh giá tự do là tái tạo đúng vấn đề "tin ảo, đánh giá ảo" mà sản phẩm này muốn giải.

**Bốn trụ đỡ:**
1. **Chiến lược** — verified là điểm khác biệt duy nhất khó sao chép.
2. **Kinh doanh** — đánh giá gắn với SaaS tạo vòng xoáy tăng trưởng: chủ dùng SaaS → khu có nhãn uy tín → tin dễ lấp phòng → hút chủ khác dùng SaaS.
3. **Kỹ thuật** — chống gian lận ở tầng cấu trúc dữ liệu, không cần đội kiểm duyệt lớn.
4. **Tinh gọn** — nhóm người dùng hạt nhân dùng SaaS nên có đánh giá thật ngay từ đầu.

**"Chủ không dùng SaaS thì khu không có đánh giá" là thiết kế có chủ đích, không phải thiếu sót** — tương tự cửa hàng không bán trên một sàn thì không có đánh giá của sàn đó. Tin của chủ chưa dùng SaaS vẫn hiển thị đầy đủ; đánh giá là lớp tin cậy cộng thêm, đồng thời là động lực dùng SaaS.

**Bốn lớp chống gian lận:**
1. Cấm chủ khu tự đánh giá khu mình (BR-022, BR-030).
2. Liên kết người ở **cần chính Renter xác nhận** — không thể âm thầm gắn tài khoản chim mồi (BR-029).
3. Điều kiện mở: hợp đồng ≥ 30 ngày **hoặc** đã có ghi nhận thanh toán — tạo hợp đồng khống chưa đủ, phải duy trì dấu vết vận hành (BR-022).
4. Báo cáo + tự ẩn khi đủ ngưỡng + kiểm duyệt (BR-018, BR-023).

Không hệ thống nào chống giả 100%, nhưng chi phí gian lận ở đây cao hơn hẳn đánh giá tự do — và đó chính là mục tiêu.

> ⚠️ **Khi dựng lại, đừng nới điều kiện mở đánh giá để tiện cho việc demo.** Cổng 30 ngày *chính là* toàn bộ giá trị chống gian lận của tính năng. Nếu cần dữ liệu demo, hãy tạo dữ liệu thỏa điều kiện, đừng hạ điều kiện xuống.

---

*— Hết tài liệu Đặc tả Kỹ thuật v3 —*
