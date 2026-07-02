# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
## Dự án: Trọ Nhanh — Nền tảng tìm thuê & quản lý phòng trọ, căn hộ dịch vụ — v2

Tài liệu đặc tả yêu cầu phần mềm theo chuẩn IEEE 830, dành cho team phát triển, BA và QA. **Nhất quán tuyệt đối với tài liệu Đặc tả Kỹ thuật v2 (file 02)** về actor, enum trạng thái, business rules và bảng Assumptions — khi mâu thuẫn, theo file 02.

---

## 1. INTRODUCTION

### 1.1 Purpose
Đặc tả đầy đủ yêu cầu phần mềm cho **Trọ Nhanh** — nền tảng Web/Mobile hai trụ cột: (1) Marketplace kết nối thuê và cho thuê, (2) bộ SaaS quản lý vận hành cho chủ trọ. SRS làm cơ sở chấm điểm và đầu vào cho thiết kế, phát triển, kiểm thử.

### 1.2 Scope
Hệ thống cho phép:
- Renter/Guest tìm kiếm, lọc, xem chi tiết tin; Renter liên hệ người đăng qua **nhắn tin in-app hoặc gọi điện**, lưu tin yêu thích, đăng tin tìm phòng và tìm người ở ghép, **xác nhận liên kết vào phòng** và xem "Phòng của tôi", **viết đánh giá khu đã ở (verified)**.
- Seller đăng/quản lý tin cho thuê (miễn phí), boost, và dùng bộ SaaS (theo gating): Property, Room, Occupancy, Contract, Invoice/UtilityReading/Payment, thông tin nhận tiền theo khu (STK/VietQR), công cụ hỗ trợ thuế, nhắc hạn, báo cáo vận hành.
- Admin/Moderator kiểm duyệt tin, xử lý báo cáo (tin/tin nhắn/đánh giá), quản lý người dùng, danh mục (gồm từ khóa cấm, cấu hình boost), cấu hình thuế, gói SaaS.

**Mô hình thanh toán:** nền tảng **không cầm/không thu hộ tiền thuê** (AS-002); hóa đơn kèm STK + VietQR của khu (QR nhúng số tiền + mã hóa đơn), chủ trọ tự đánh dấu "Đã thu". Phí nền tảng (boost, gói SaaS) đi qua payment gateway, ghi nhận bằng `PlatformTransaction` + webhook.

**Ngoài phạm vi:** ký hợp đồng điện tử; đặt lịch xem phòng trong app; cầm/đối soát tiền thuê; eKYC; môi giới; kê khai/nộp thuế thay người dùng; tích hợp Zalo (AS-001).

**Phạm vi MVP (demo):** theo danh sách màn hình chuẩn ở file 02 Mục 10 — A1–A3, A7, A11 (UI), A14, B3, B4, B5, B6 (mock), B8 (mock), B12 (demo luồng) — chạy **mock data**, chưa xây backend/DB chi tiết (AS-014). Nguyên tắc: mock dữ liệu/trạng thái, không mock cấu trúc luồng màn hình.

### 1.3 Definitions, Acronyms, Abbreviations

| Thuật ngữ | Ý nghĩa |
|---|---|
| Marketplace | Phần đăng tin – tìm kiếm – liên hệ |
| SaaS | Phần mềm quản lý vận hành cho Seller, truy cập theo gói |
| MVP | Sản phẩm khả dụng tối thiểu để kiểm chứng nhu cầu |
| RBAC | Phân quyền theo vai trò |
| Listing / RentalListing | Tin cho thuê do Seller đăng |
| Tin nhu cầu thuê | RoomWantedPost (tìm phòng) và RoommateWantedPost (ở ghép) do Renter đăng |
| Property | Khu trọ/khu căn hộ (cấp 1 SaaS) |
| Room | Phòng trong Property (cấp 2) |
| **Occupancy** | **Người ở thực tế trong phòng (bản ghi do Seller quản lý)**; `userId` nullable; liên kết tài khoản cần Renter xác nhận (`linkStatus`) |
| Renter | Tài khoản người đi thuê; người đang ở nếu có tài khoản là một Renter được gắn (đã xác nhận) vào phòng |
| Contract | Hợp đồng thuê; lưu bản scan, không ký điện tử |
| Invoice / InvoiceItem | Hóa đơn kỳ và các dòng chi phí |
| Payment | Ghi nhận khoản thu **tiền thuê** (Cash/BankTransfer); nền tảng không giữ tiền |
| PlatformTransaction | Giao dịch **phí nền tảng** (boost/gói) qua payment gateway, có webhook + idempotency |
| VietQR | Mã QR chuyển khoản, sinh từ STK của khu, nhúng số tiền + mã hóa đơn |
| Conversation / Message | Hội thoại in-app và tin nhắn |
| Tax Support | Công cụ tính thuế ước tính (cash basis) + xuất template tờ khai (tham khảo) |
| Domain / Shared Kernel | 2 domain (Marketplace, SaaS) + nhóm năng lực dùng chung |
| Gating | Cổng kiểm soát Workspace theo trạng thái gói (NONE/TRIAL/ACTIVE/READ_ONLY) |
| Zone | Vùng trong shell Workspace: zone Tin đăng (free) / zone SaaS (gating) |
| Verified review | Đánh giá chỉ người ở đã xác thực (Contract + liên kết Confirmed) mới viết được |
| Boost | Đẩy tin nổi bật (trả phí) |
| Soft delete | Xóa mềm — ẩn nhưng giữ trong DB |
| Read-only | Chỉ xem, không tạo/sửa/xóa |
| MoSCoW | Must/Should/Could/Won't |
| OTP | Mã xác thực một lần |

### 1.4 References
- Tài liệu Đặc tả Kỹ thuật v2 (file 02) — **nguồn chân lý** về BR, enum, entity, màn hình, Assumptions.
- Tài liệu Kiến trúc Hệ thống (file 04); Quy ước code (file 06).
- IEEE Std 830-1998.
- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP.
- Quy định thuế cho thuê tài sản từ kỳ tính thuế 2026 (tham chiếu cho TaxSetting; cần kiểm chứng).

### 1.5 Overview
Mục 2: tổng quan & lớp người dùng. Mục 3: FR/NFR. Mục 4: use case. Mục 5: dữ liệu. Mục 6: business rules (bản gọn). Mục 7: phụ lục.

---

## 2. OVERALL DESCRIPTION

### 2.1 Product Perspective
Sản phẩm mới, độc lập, hai trụ cột trên cùng hệ thống tài khoản và database:
- **Marketplace:** RentalListing (Seller), tin nhu cầu thuê (Renter), Search & Filter, Favorite, Review (verified), kiểm duyệt, Report, nhắn tin in-app.
- **SaaS:** Property → Room, kèm Occupancy (liên kết có xác nhận), Contract, Invoice/UtilityReading/Payment, thông tin nhận tiền theo khu, Tax Support, Notification, Dashboard.

**Vai trò SaaS:** workspace **một phía** của Seller — vận hành đầy đủ không cần người ở tham gia. Người ở có tài khoản chỉ là lớp nâng cấp ("Phòng của tôi", V1, chỉ xem).

**Free vs Paid:** Marketplace miễn phí cho mọi người; SaaS trả phí theo gói (gating 4 trạng thái).

Hai trụ cột liên kết qua: "Tạo tin từ phòng trống", cơ chế gắn tin vào khu (`propertyId`), và **đồng bộ chống tin ảo** (Room Rented → listing gắn phòng tự Rented — BR-027). Tích hợp ngoài: SMS/Email, Map, Payment gateway (chỉ phí nền tảng), Cloud storage. Không Zalo.

### 2.2 Product Functions (19 module)
1. Authentication & User Management — đăng ký/đăng nhập OTP, token, role cộng dồn, đổi/quên mật khẩu, đăng xuất, xóa tài khoản, `GET /me`.
2. Profile Management — hồ sơ, liên hệ, email tùy chọn, cài đặt hiển thị.
3. Rental Listing Management — đăng/sửa/duyệt/gia hạn/boost tin cho thuê; gắn khu; đồng bộ theo Room.
4. Demand Posts — tin tìm phòng + tin ở ghép.
5. Property Management — khu + nhận tiền theo khu + hồ sơ khu public.
6. Room Management — phòng & trạng thái.
7. Occupancy Management — người ở (liên kết có xác nhận, nhiều người/phòng, lịch sử ở).
8. Contract Management — hợp đồng + scan; ≤1 Active/Room; tự Expired.
9. Payment/Invoice/Utility Tracking — điện nước, hóa đơn (VietQR), ghi nhận thu.
10. Notification & Reminder — thông báo & nhắc hạn (gồm OccupancyLinked, ListingAutoRented, InvoiceReceived).
11. Favorite/Saved Posts — lưu tin.
12. Search & Filter — tìm kiếm & lọc (giờ giấc, điểm đánh giá có toggle).
13. Admin Management — user, danh mục (gồm từ khóa cấm, boost config), gói, thuế.
14. Report/Complaint Management — báo cáo tin (2 loại) + tin nhắn + đánh giá.
15. SaaS Subscription Management — gói, TRIAL, gating, PlatformTransaction + webhook.
16. Dashboard & Analytics — báo cáo vận hành & hệ thống; ContactEvent.
17. Messaging/Chat — nhắn tin in-app (cấm self-contact).
18. Tax Support — hỗ trợ thuế (cash basis).
19. Review — đánh giá khu trọ (verified, cấp Property, 4 lớp chống gian lận).

### 2.3 User Classes and Characteristics

| User Class | Đặc điểm | Tần suất | Trình độ |
|---|---|---|---|
| **Guest** | Khách khảo sát thị trường | Theo nhu cầu | Thấp–TB |
| **Renter** | Sinh viên, người đi làm trẻ tìm phòng; người đang ở (nếu có tài khoản) = Renter được gắn (đã xác nhận) vào phòng | Cao khi tìm phòng | TB |
| **Seller** | Chủ trọ/chủ căn hộ hoặc người được ủy quyền (cò trọ); có thể không rành công nghệ | Cao, đều | Thấp–TB |
| **Admin** | Vận hành nền tảng | Hằng ngày | Cao |
| **Moderator/Staff** | Kiểm duyệt, hỗ trợ | Hằng ngày | TB–Cao |

**Role cộng dồn:** Renter và Seller không loại trừ nhau — một tài khoản kiêm cả hai; Seller tự kích hoạt theo hành vi (file 02 §1.8). **Occupancy không phải user class** — là bản ghi dữ liệu của Seller (AS-006).

### 2.4 Operating Environment
Web responsive (Chrome/Edge/Firefox/Safari/Cốc Cốc bản mới); mobile web, mở rộng app gốc sau; backend cloud + RDBMS + object storage; tối ưu 3G/4G phổ thông.

### 2.5 Design and Implementation Constraints
- Tiếng Việt đầy đủ dấu; font Be Vietnam Pro; tông cát/nâu; màu nhấn `#8A6A45`.
- Kiến trúc modular monolith; 2 domain + shared kernel; frontend 2 shell, Workspace 2 zone (file 02 §1.6).
- Liên hệ in-app + gọi; không Zalo; không đặt lịch (AS-001).
- Chat: UI từ MVP, nghiệp vụ V1; polling → WebSocket (AS-011).
- Hợp đồng: lưu scan, không ký điện tử; file private (BR-008).
- Thanh toán: không giữ tiền thuê; phí nền tảng qua `PlatformTransaction` + webhook (AS-002).
- Công cụ thuế: tham khảo, cash basis, có disclaimer (BR-021).
- Tuân thủ Luật 91/2025/QH15 (gồm consent liên kết BR-029, quyền xóa tài khoản).
- **MVP demo:** theo danh sách chuẩn file 02 Mục 10, mock data (AS-014).

### 2.6 User Documentation
Hướng dẫn nhanh Renter (tìm – liên hệ – xác nhận liên kết) và Seller (đăng tin – quản lý phòng – hóa đơn); tooltip/empty-state cho Seller ít rành công nghệ; FAQ & chính sách dữ liệu khi đăng ký/upload hợp đồng; disclaimer công cụ thuế.

### 2.7 Assumptions and Dependencies
Dùng **bảng Assumptions chuẩn duy nhất AS-001 → AS-020 ở file 02 Mục 13** (tóm tắt ở §7.3). Phụ thuộc: SMS/Email gateway, Map, Payment gateway, Cloud storage.

---

## 3. SPECIFIC REQUIREMENTS

### 3.1 Functional Requirements

> Mẫu: **Mã | Tên | Mô tả | Actor | Priority | Module**. Mã FR duy nhất toàn tài liệu (đã đánh lại, hết trùng lặp). FR-081 → FR-093 là dải mã mới.

#### Module 1 — Authentication & User Management
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-001 | Đăng ký tài khoản | Bằng SĐT (unique, BR-016) + OTP; role mặc định Renter; hỗ trợ `?redirect=` quay về ngữ cảnh | Guest | Must | 1 |
| FR-002 | Đăng nhập | SĐT + mật khẩu; trả access token (claims `roles[]`) + refresh token; FE gọi `GET /me` sau đăng nhập | Guest | Must | 1 |
| FR-003 | Quên mật khẩu | Đặt lại qua OTP | Guest | Must | 1 |
| FR-004 | Làm mới phiên | Access token mới từ refresh token; **bắt buộc gọi ngay sau khi role Seller được kích hoạt** (file 02 §1.8) | Renter, Seller | Must | 1 |
| FR-005 | Khóa/mở tài khoản | Admin khóa/mở; khóa → mọi tin Active tự Hidden (BR-028); dữ liệu SaaS giữ nguyên; mở khóa không tự Active lại tin | Admin | Must | 1 |
| FR-006 | Tự kích hoạt role Seller | Hệ thống thêm role Seller khi user tạo RentalListing đầu tiên (kể cả Draft, cùng transaction) hoặc mở Workspace lần đầu; idempotent (BR-013, file 02 §1.8) | Hệ thống | Must | 1 |
| FR-085 | Admin gán/gỡ role | Đường phụ phục vụ vận hành; ghi audit | Admin | Should | 1 |
| FR-086 | Đổi mật khẩu | Khi đã đăng nhập; yêu cầu mật khẩu cũ | Renter, Seller | Should | 1 |
| FR-087 | Đăng xuất | Thu hồi refresh token (bảng RefreshToken) | Đã đăng nhập | Must | 1 |
| FR-088 | Yêu cầu xóa tài khoản | Right to erasure: soft delete User, ẩn tin, gỡ `userId` khỏi Occupancy (dữ liệu vận hành của Seller khác giữ nguyên) | Renter, Seller | Should | 1 |
| FR-089 | Hồ sơ phiên | `GET /me` trả user, profile, `roles[]`, `workspaceStatus` — nguồn chân lý phía client | Đã đăng nhập | Must | 1 |

#### Module 2 — Profile Management
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-007 | Xem/cập nhật hồ sơ | Tên, avatar, SĐT liên hệ, email (tùy chọn, unique nếu có) | Renter, Seller | Must | 2 |
| FR-008 | Cấu hình hiển thị dashboard | Toggle "Tổng số phòng"/"Số khách đang ở"/**"Doanh thu"**, mặc định TẮT (BR-012) | Seller | Must | 2 |
| FR-009 | Nguồn liên hệ tin đăng | `contactPhone` Profile prefill vào tin; chưa đặt → dùng `phoneNumber` tài khoản | Seller | Should | 2 |

#### Module 3 — Rental Listing Management (cốt lõi)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-010 | Tạo tin cho thuê | Nhiều bước; lưu Draft; bước tùy chọn chọn khu (`propertyId` thuộc chính seller) nếu có Property; tạo đầu tiên kích hoạt Seller (FR-006) | Renter/Seller | Must | 3 |
| FR-011 | Gửi duyệt tin | Draft→PendingApproval; lọc từ khóa cấm (`BannedKeyword`) | Seller | Must | 3 |
| FR-012 | Sửa tin | Sửa trường quan trọng → duyệt lại, **tin ẩn tạm khi chờ duyệt**, UI cảnh báo trước khi lưu (BR-003) | Seller (owner) | Must | 3 |
| FR-013 | Đổi trạng thái tin | Ẩn/mở/Rented (BR-001) | Seller (owner) | Must | 3 |
| FR-014 | Xóa tin | Xóa mềm | Seller (owner) | Should | 3 |
| FR-015 | Đẩy tin nổi bật | Chỉ tin Active; qua PlatformTransaction (FR-093); `boostDays/boostPrice` do Admin cấu hình (BR-005) | Seller (owner) | Should | 3 |
| FR-016 | Tạo tin từ phòng trống | Prefill từ Room Available (gắn sẵn `roomId` + `propertyId`); chặn tạo tin thứ hai khi Room còn tin Active | Seller (owner) | Could | 3 |
| FR-017 | Xem tin của tôi | Mọi trạng thái (`GET /me/listings`) | Seller | Must | 3 |
| FR-090 | Gia hạn tin cho thuê | +60 ngày, không giới hạn số lần; **không duyệt lại nếu không sửa nội dung** (BR-026) | Seller (owner) | Must | 3 |
| FR-091 | Đồng bộ tin theo phòng | Room gắn tin chuyển Rented → tin tự chuyển Rented (cùng transaction) + Notification; Deposited → notification gợi ý ẩn 1 chạm (BR-027) | Hệ thống | Must | 3 |

#### Module 4 — Demand Posts (tin tìm phòng + ở ghép)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-018 | Đăng tin tìm phòng | Khu vực, giá, loại hình, diện tích, tiện ích, thời điểm dọn vào; qua kiểm duyệt (BR-001) | Renter | Must | 4 |
| FR-019 | Quản lý tin tìm phòng | Sửa/ẩn/xóa; tối đa 2 tin Active (BR-010) | Renter (owner) | Must | 4 |
| FR-020 | Gia hạn tin tìm phòng | +30 ngày, không duyệt lại nếu không sửa (BR-009) | Renter (owner) | Should | 4 |
| FR-021 | Đăng tin tìm người ở ghép | Vị trí, giá chia sẻ, số người, yêu cầu, ảnh | Renter | Must | 4 |
| FR-022 | Quản lý tin ở ghép | Sửa/ẩn/xóa; giới hạn & thời hạn (BR-009, BR-010) | Renter (owner) | Must | 4 |
| FR-023 | Gia hạn tin ở ghép | +30 ngày | Renter (owner) | Should | 4 |

#### Module 5 — Property Management (cốt lõi SaaS)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-024 | Tạo khu trọ | Tên, địa chỉ, quận/huyện, số tầng, ghi chú; theo hạn mức gói (BR-015) | Seller | Must | 5 |
| FR-025 | Danh sách khu trọ | Kèm tổng phòng & phòng trống | Seller | Must | 5 |
| FR-026 | Sửa khu trọ | Cập nhật thông tin khu | Seller (owner) | Must | 5 |
| FR-027 | Xóa khu trọ | Chặn nếu còn phòng thuê/HĐ Active; xóa mềm (BR-011); review giữ trong DB, trang khu ẩn (BR-024) | Seller (owner) | Should | 5 |
| FR-028 | Chọn khu để quản lý | Vào dashboard phòng của khu | Seller (owner) | Must | 5 |
| FR-077 | Thông tin nhận tiền theo khu | Ngân hàng/STK/tên chủ TK → sinh VietQR (AS-013) | Seller (owner) | Should | 5 |

#### Module 6 — Room Management (cốt lõi SaaS)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-029 | Thêm phòng | Mã phòng unique trong khu, tầng, diện tích, giá, tiện ích, giờ giấc | Seller (owner) | Must | 6 |
| FR-030 | Sửa/xóa phòng | Xóa khi không có Contract Active | Seller (owner) | Must | 6 |
| FR-031 | Đổi trạng thái phòng | Available/Deposited/Rented/Hidden (BR-002); đồng bộ Contract (BR-031) và Listing (BR-027) | Seller (owner) | Must | 6 |
| FR-032 | Tìm/lọc phòng | Theo mã/người ở/tầng; lọc trạng thái; badge "Có tin đang chạy" | Seller (owner) | Should | 6 |
| FR-033 | Hiển thị phòng trống | Chỉ số chính, luôn hiển thị | Seller (owner) | Must | 6 |

#### Module 7 — Occupancy Management (Quản lý người ở)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-034 | Thêm người ở | Nhập SĐT → có tài khoản: gắn `userId` với `linkStatus=Pending` chờ Renter xác nhận (BR-029); chưa có: fallback tên+SĐT. Một phòng nhiều Occupancy Active được (ở ghép) | Seller (owner) | Must | 7 |
| FR-035 | Cập nhật/kết thúc ở | Sửa thông tin; kết thúc → set `endDate`, `isActive=false` → lịch sử | Seller (owner) | Must | 7 |
| FR-036 | Gắn tài khoản sau | Gắn `userId` khi người ở đăng ký; cũng qua xác nhận (BR-029) | Seller (owner) | Should | 7 |
| FR-079 | Phòng của tôi | Renter liên kết Confirmed xem HĐ/hóa đơn của mình; tab "Lịch sử ở trọ" các đợt đã kết thúc | Renter | Should | 7 |
| FR-092 | Xác nhận/gỡ liên kết | Renter Chấp nhận (Confirmed — mở Phòng của tôi + quyền review) / Từ chối (Rejected — gỡ userId) lời mời liên kết; tự gỡ liên kết bất kỳ lúc nào (BR-029) | Renter | Must | 7 |

#### Module 8 — Contract Management (cốt lõi)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-037 | Tạo hợp đồng | Phòng, Occupancy đại diện, ngày, tiền thuê, cọc; chặn Contract Active thứ 2 & chồng lấn thời gian trên cùng Room (BR-006, 409); Room tự Rented (BR-031, cùng transaction) | Seller (owner) | Must | 8 |
| FR-038 | Upload bản scan | Tự nguyện, thông báo mục đích (BR-008) | Seller (owner) | Should | 8 |
| FR-039 | Xem/tải bản scan | Signed URL; owner + Renter liên kết Confirmed | Seller (owner), Renter gắn | Should | 8 |
| FR-040 | Xóa bản scan | Quyền xóa dữ liệu | Seller (owner), Renter gắn | Should | 8 |
| FR-041 | Vòng đời hợp đồng | Draft/Active/Expired/Terminated; **job tự chuyển Expired khi qua endDate** (BR-006) | Seller (owner), Hệ thống | Must | 8 |
| FR-042 | Nhắc hết hạn hợp đồng | Tại thời điểm max(startDate, endDate − 30 ngày) | Hệ thống | Must | 8 |

#### Module 9 — Payment/Invoice/Utility Tracking (cốt lõi)
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-043 | Ghi chỉ số điện nước | Điện = (mới − cũ) × đơn giá; chỉ số mới ≥ cũ; unique (roomId, type, period) | Seller (owner) | Must | 9 |
| FR-044 | Tạo hóa đơn kỳ | Invoice + InvoiceItem cho Room có Contract Active; unique (contractId, period) — hỗ trợ đổi người giữa kỳ; reading dùng được đánh dấu `invoiceId` | Seller (owner) | Must | 9 |
| FR-045 | Ghi nhận thanh toán | "Đã thu" (Cash/BankTransfer, đủ/một phần); **trạng thái Invoice suy tự động từ ΣPayment** (BR-004). App không giữ tiền | Seller (owner) | Must | 9 |
| FR-046 | Đánh dấu quá hạn | Job chuyển Overdue + Notification; từ Overdue: thu đủ → Paid, một phần → vẫn Overdue (BR-004) | Hệ thống | Should | 9 |
| FR-078 | Xuất & chia sẻ hóa đơn | PDF/ảnh kèm STK + **VietQR nhúng số tiền + mã hóa đơn**; người ở linked Confirmed → hiện in-app + Notification `InvoiceReceived` | Seller (owner) | Should | 9 |

#### Module 10 — Notification & Reminder
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-047 | Thông báo duyệt tin | Báo duyệt/từ chối (3 loại tin) | Renter, Seller | Must | 10 |
| FR-048 | Nhắc hợp đồng & hóa đơn | Contract sắp hết hạn; Invoice đến hạn/quá hạn; hóa đơn mới (`InvoiceReceived`) | Seller, Renter gắn | Must | 10 |
| FR-049 | Nhắc gia hạn gói SaaS | Trước 6/2/1 tháng (BR-017); TRIAL sắp hết trước 7 ngày | Hệ thống | Should | 10 |
| FR-050 | Quản lý thông báo | Xem, đánh dấu đã đọc; gồm NewMessage, `OccupancyLinked`, `ListingAutoRented`, tin đã lưu đổi trạng thái | Đã đăng nhập | Must | 10 |

#### Module 11 — Favorite/Saved Posts
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-051 | Lưu/bỏ lưu tin | RentalListing Active | Renter | Should | 11 |
| FR-052 | Danh sách đã lưu | Báo khi tin đổi trạng thái | Renter | Could | 11 |

#### Module 12 — Search & Filter
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-053 | Tìm kiếm tin | Từ khóa/khu vực, chỉ tin Active | Guest, Renter | Must | 12 |
| FR-054 | Lọc đa tiêu chí | Giá, loại hình, diện tích, tiện ích, giờ giấc, điểm đánh giá (chỉ áp tin có review + toggle "gồm tin chưa có đánh giá" mặc định BẬT) | Guest, Renter | Must | 12 |
| FR-055 | Sắp xếp & phân trang | Boost trước (BR-005); sort theo điểm đẩy tin chưa có điểm xuống cuối | Guest, Renter | Must | 12 |
| FR-056 | Gợi ý phòng phù hợp | Theo nhu cầu Renter | Renter | Could | 12 |

#### Module 13 — Admin Management
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-057 | Quản lý người dùng | Khóa/mở (FR-005), gán role (FR-085) | Admin | Must | 13 |
| FR-058 | Quản lý danh mục | Amenity, khu vực, khoảng giá, loại phòng, **từ khóa cấm (BannedKeyword)**, **cấu hình boost (boostPrice/boostDays)** | Admin | Must | 13 |
| FR-059 | Quản lý gói SaaS | CRUD SubscriptionPlan (gồm plan Trial định nghĩa hạn mức dùng thử) | Admin | Should | 13 |
| FR-060 | Dashboard hệ thống | Tổng user/tin/doanh thu phí nền tảng | Admin | Should | 13 |

#### Module 14 — Report/Complaint Management
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-061 | Gửi báo cáo vi phạm | Tin cho thuê / tin nhu cầu / tin nhắn / đánh giá | Renter, Seller | Must | 14 |
| FR-062 | Xử lý báo cáo | Giữ/ẩn/từ chối tin, khóa hội thoại, khóa user (→ BR-028), ẩn review | Moderator, Admin | Must | 14 |
| FR-063 | Tự rà soát tin bị báo cáo | ≥3 report → PendingApproval, tạm ẩn (BR-018) | Hệ thống | Should | 14 |
| FR-064 | Kiểm duyệt tin | Duyệt/từ chối (bắt buộc lý do), audit | Moderator, Admin | Must | 13,14 |

#### Module 15 — SaaS Subscription Management
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-065 | Xem & mua gói | Gói bán đứt 3 năm; thanh toán qua FR-093 | Seller | Must | 15 |
| FR-065b | Dùng thử (TRIAL) | Kích hoạt 1 lần/Seller; hạn mức theo plan Trial; gating NONE/TRIAL/ACTIVE/READ_ONLY (BR-013, BR-015) | Seller | Must | 15 |
| FR-066 | Gia hạn gói | Đổi gói khi gia hạn được (V1 không nâng giữa kỳ); hết hạn → read-only, giữ dữ liệu; over-limit → chặn tạo mới (BR-015) | Seller | Must | 15 |
| FR-067 | Quản lý subscription | Admin xem UserSubscription; hủy (`Cancelled`) khi xử lý khiếu nại/hoàn tiền | Admin | Could | 15 |
| FR-093 | Thanh toán phí nền tảng | Tạo `PlatformTransaction` (Pending, idempotencyKey) → URL gateway → **webhook verify chữ ký, idempotent, là nơi DUY NHẤT kích hoạt quyền lợi** (boost/gói); Pending quá 15 phút → job đánh Failed | Hệ thống | Must | 15 |

#### Module 16 — Dashboard & Analytics
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-068 | Dashboard vận hành Seller | Phòng trống (luôn hiện); lấp đầy; **doanh thu/tổng phòng/số khách theo toggle mặc định TẮT** (BR-012); sắp hết hạn HĐ; chưa thanh toán | Seller | Must | 16 |
| FR-069 | Tôn trọng quyền riêng tư | Riêng tư tuyệt đối theo sellerId (BR-007, BR-012) | Seller | Must | 16 |
| FR-070 | Ghi nhận tương tác liên hệ | Ghi entity `ContactEvent` (Call/Message) theo tin | Hệ thống | Could | 16 |

#### Module 17 — Messaging/Chat
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-071 | Tạo/mở hội thoại | Với người đăng từ một tin; chỉ user đăng nhập (BR-019); **cấm self-contact (BR-030)**; unique (initiatorId, tin) → mở lại hội thoại cũ | Renter, Seller | Should | 17 |
| FR-072 | Gửi/nhận tin nhắn | Văn bản; polling; đã đọc; báo tin mới | Renter, Seller | Should | 17 |
| FR-073 | Chặn & báo cáo trong chat | Chặn theo Conversation (block user toàn cục = V2); báo cáo tin nhắn (BR-020) | Renter, Seller | Should | 17 |

#### Module 18 — Tax Support
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-074 | Tính thuế ước tính | Doanh thu = ΣPayment ghi nhận trong năm (cash basis, BR-021); MVP nhập tay, V1 tự kéo | Seller | Must | 18 |
| FR-075 | Xuất template tờ khai | PDF cơ bản + disclaimer; lưu TaxDeclaration | Seller | Should | 18 |
| FR-076 | Cấu hình thuế | Admin cấu hình ngưỡng/thuế suất theo năm (TaxSetting) | Admin | Should | 18 |

#### Module 19 — Review/Đánh giá khu trọ
| Mã | Tên | Mô tả | Actor | Priority | Module |
|---|---|---|---|---|---|
| FR-081 | Viết đánh giá khu | Sao 1–5 + nội dung ≤1.000 ký tự; điều kiện BR-022: liên kết Confirmed + có Contract tại khu + **không phải chủ khu** + (Contract ≥ 30 ngày HOẶC ≥1 Payment); mỗi đợt ở 1 lần, sửa trong 7 ngày (BR-023) | Renter | Must | 19 |
| FR-082 | Xem đánh giá khu | Điểm & danh sách review ở badge tin đăng + trang khu public; **chỉ hiển thị khi khu bật public** (BR-024) | Guest, Renter | Must | 19 |
| FR-083 | Bật hồ sơ khu public | Seller opt-in; tắt → ẩn hiển thị, review giữ DB (BR-024) | Seller | Should | 19,5 |
| FR-084 | Báo cáo/kiểm duyệt đánh giá | Report review; ≥3 report tự ẩn chờ duyệt; Moderator/Admin ẩn review giả (BR-023) | Renter, Moderator | Should | 19,14 |

### 3.2 Non-functional Requirements

#### 3.2.1 External Interface
| Mã | Yêu cầu |
|---|---|
| NFR-001 | SMS/Email gateway: OTP, nhắc hạn, báo tin nhắn mới |
| NFR-002 | Map service: geocode & hiển thị vị trí, tiện ích xung quanh |
| NFR-003 | Payment gateway nội địa: thu phí boost & gói qua `PlatformTransaction` + webhook (verify chữ ký, idempotent); KHÔNG xử lý tiền thuê (AS-002) |
| NFR-004 | Cloud/object storage: ảnh tin, scan hợp đồng, file hóa đơn & template thuế |

#### 3.2.2 User Interface
| Mã | Yêu cầu |
|---|---|
| NFR-005 | Responsive web (desktop navbar) + mobile (bottom tab), tiếng Việt đầy đủ, font Be Vietnam Pro |
| NFR-006 | Tông cát/nâu; chữ chính #3E2E1E tương phản WCAG AA |
| NFR-007 | Thao tác chính trên mobile ≤ 3 chạm; UI đơn giản cho Seller ít rành công nghệ |
| NFR-008 | Màn demo hiển thị banner "sản phẩm demo lấy feedback, tối ưu khi xem trên web" |

#### 3.2.3 Software Interface
| Mã | Yêu cầu |
|---|---|
| NFR-009 | REST, JSON, versioned (/api/v1); Bearer token; **chuẩn response/error/pagination duy nhất ở file 02 §7.5** |
| NFR-010 | Modular monolith, stateless API, tách job scheduler (Overdue, Contract Expired, tin Expired, nhắc hạn, giao dịch treo, dọn media mồ côi) |

#### 3.2.4 Security
| Mã | Yêu cầu |
|---|---|
| NFR-011 | Mật khẩu băm bcrypt/argon2; JWT access ngắn hạn + refresh token lưu DB, thu hồi khi logout |
| NFR-012 | RBAC kiểm role + ownership mọi endpoint; pipeline SaaS: token → role → ownership → gating |
| NFR-013 | Guest thấy SĐT che một phần; nhắn tin in-app không lộ SĐT (BR-014) |
| NFR-014 | Chống spam: lọc từ khóa cấm, giới hạn tin (BR-010), tự rà tin bị báo cáo (BR-018), rate limit (login/OTP/đăng tin/nhắn tin) |
| NFR-015 | File riêng tư: private bucket, signed URL ≤ 15 phút (BR-008) |
| NFR-016 | Tuân thủ Luật 91/2025/QH15: consent liên kết (BR-029), quyền xóa tài khoản (FR-088), audit khi Admin truy cập dữ liệu SaaS |
| NFR-017 | HTTPS/TLS toàn bộ |

#### 3.2.5 Performance (mục tiêu giả định — AS-016)
| Mã | Yêu cầu |
|---|---|
| NFR-018 | Tìm kiếm < 1s với ~100.000 tin |
| NFR-019 | Trang chi tiết < 2s |
| NFR-020 | Dashboard Seller < 2s với 50 property / 1.000 room |
| NFR-021 | ~1.000 người dùng đồng thời giai đoạn đầu |
| NFR-022 | Tin nhắn: độ trễ chấp nhận được với polling; thiết kế sẵn đường nâng WebSocket |

#### 3.2.6 Availability
| Mã | Yêu cầu |
|---|---|
| NFR-023 | Uptime mục tiêu 99% giai đoạn đầu |
| NFR-024 | Backup DB hằng ngày, giữ ≥ 7 bản |

#### 3.2.7 Maintainability
| Mã | Yêu cầu |
|---|---|
| NFR-025 | Code theo 19 module / 16 service (file 02 Mục 11); đặt tên thống nhất, không dùng "Tenant" |
| NFR-026 | Log có cấu trúc; audit hành động nhạy cảm |

#### 3.2.8 Scalability
| Mã | Yêu cầu |
|---|---|
| NFR-027 | API stateless, scale ngang; tách lưu trữ file khỏi DB |
| NFR-028 | Sẵn sàng tách module nặng (Search, Notification, Messaging, Billing) thành service riêng |

---

## 4. USE CASE SPECIFICATION

### 4.1 Bảng tổng hợp Use Case

| UC ID | Use Case | Actor chính | Module |
|---|---|---|---|
| UC-001 | Đăng ký tài khoản | Guest | 1 |
| UC-002 | Đăng nhập | Guest | 1 |
| UC-003 | Tìm kiếm & lọc tin | Guest, Renter | 12 |
| UC-004 | Xem chi tiết tin | Guest, Renter | 3,12 |
| UC-005 | Liên hệ người đăng (nhắn tin/gọi) | Renter | 3,17 |
| UC-006 | Lưu tin yêu thích | Renter | 11 |
| UC-007 | Đăng tin tìm phòng | Renter | 4 |
| UC-008 | Đăng tin tìm người ở ghép | Renter | 4 |
| UC-009 | Đăng tin cho thuê (kích hoạt Seller lần đầu) | Renter/Seller | 1,3 |
| UC-010 | Quản lý khu trọ + thông tin nhận tiền | Seller | 5 |
| UC-011 | Thêm phòng vào khu | Seller | 6 |
| UC-012 | Cập nhật trạng thái phòng | Seller | 6 |
| UC-013 | Quản lý người ở (Occupancy) | Seller | 7 |
| UC-014 | Tạo hợp đồng & lưu scan | Seller | 8 |
| UC-015 | Ghi điện nước, tạo & gửi hóa đơn, ghi nhận thu | Seller | 9 |
| UC-016 | Mua/gia hạn gói SaaS | Seller | 15 |
| UC-017 | Kiểm duyệt tin | Moderator, Admin | 13 |
| UC-018 | Xử lý báo cáo vi phạm | Moderator, Admin | 14 |
| UC-019 | Quản lý người dùng | Admin | 13 |
| UC-020 | Nhắn tin với người đăng | Renter, Seller | 17 |
| UC-021 | Dùng công cụ hỗ trợ thuế | Seller | 18 |
| UC-022 | Đánh giá khu trọ đã ở (verified) | Renter | 19 |
| UC-023 | Xác nhận liên kết vào phòng | Renter | 7 |
| UC-024 | Thanh toán phí nền tảng (boost/gói) | Seller, Hệ thống | 15,3 |

### 4.2 Use Case chi tiết (các UC trọng tâm)

#### UC-001 — Đăng ký tài khoản
- **Actor:** Guest. **Pre:** chưa đăng nhập; SĐT hợp lệ.
- **Main:** 1. Nhập SĐT, mật khẩu, tên. 2. Validate (FR-001, BR-016) + gửi OTP. 3. Nhập OTP. 4. Tạo User role mặc định Renter. 5. Đăng nhập tự động → **quay về ngữ cảnh `?redirect=`** (nếu có) hoặc trang chủ.
- **Alt:** 3a. Gửi lại OTP sau thời gian chờ. **Exc:** 2a. SĐT đã tồn tại → lỗi; 3b. OTP sai/hết hạn → nhập lại.

#### UC-002 — Đăng nhập
- **Actor:** Guest. **Pre:** đã có tài khoản, không bị Locked.
- **Main:** 1. Nhập SĐT + mật khẩu. 2. Hệ thống trả access token (claims `roles[]`) + refresh token (FR-002). 3. FE gọi `GET /me` (FR-089) → render navigation theo roles/workspaceStatus. 4. Quay về `?redirect=` hoặc trang chủ. **Không có bước chọn vai trò.**
- **Exc:** 1a. Sai thông tin → lỗi chung (không tiết lộ SĐT tồn tại hay không); 1b. tài khoản Locked → thông báo liên hệ hỗ trợ.

#### UC-005 — Liên hệ người đăng (nhắn tin/gọi)
- **Actor:** Renter. **Pre:** đăng nhập; tin Active.
- **Main:** 1. Mở khối "Liên hệ". 2. Hiện tên người đăng + nút Nhắn tin + Gọi. 3a. Nhắn tin → tạo/mở hội thoại in-app (UC-020). 3b. Gọi → hiện SĐT + dialer. 4. Ghi ContactEvent (FR-070).
- **Alt:** 2a. Guest → SĐT che một phần + mời đăng nhập kèm `?redirect=` (BR-014). **Exc:** 1a. tin Rented/Expired → ẩn khối liên hệ; 1b. **tin của chính mình → không hiện nút liên hệ (BR-030)**.

#### UC-009 — Đăng tin cho thuê (kích hoạt Seller lần đầu)
- **Actor:** Renter hoặc Seller. **Pre:** **đã đăng nhập** (không yêu cầu sẵn role Seller).
- **Main:** 1. Bấm "Đăng tin → Tin cho thuê" → `/chu-tro/dang-tin` (zone Tin đăng, miễn phí). 2. Điền form nhiều bước; nếu Seller có Property → bước tùy chọn chọn khu (gắn `propertyId`). 3. Lưu bản ghi đầu tiên (kể cả Draft) → **hệ thống gán role Seller cùng transaction (FR-006)** → FE gọi `POST /auth/refresh` (FR-004). 4. Gửi duyệt → lọc từ khóa cấm → PendingApproval → Moderator xử lý → Active (expireAt = approvedAt + 60 ngày, BR-026) / Rejected (lý do) → Notification.
- **Alt:** 4a. Rejected → sửa, gửi lại. 5a. Boost → UC-024. **Exc:** 2a. `propertyId` không thuộc seller → 422.

#### UC-010 — Quản lý khu trọ + thông tin nhận tiền
- **Actor:** Seller. **Pre:** đăng nhập; workspace TRIAL/ACTIVE (BR-015).
- **Main:** 1. Mở "Quản lý khu trọ & phòng". 2. Xem danh sách Property. 3. Thêm khu (FR-024) + cấu hình ngân hàng/STK/tên chủ TK (FR-077). 4. Chọn khu quản lý; sửa/xóa (FR-026/027).
- **Alt:** 2a. chưa có khu → empty state mời tạo. **Exc:** 4a. xóa khu còn phòng thuê/HĐ → chặn (BR-011); 3a. READ_ONLY → lỗi `WORKSPACE_READ_ONLY`, modal mời gia hạn; 3b. chạm hạn mức gói → chặn tạo mới, gợi ý gói lớn hơn.

#### UC-013 — Quản lý người ở (Occupancy) — có xác nhận liên kết
- **Actor:** Seller. **Pre:** có Room.
- **Main:** 1. Mở Room → tab "Người ở" → "+ Thêm người ở". 2. Nhập SĐT → tra: có tài khoản → gắn `userId`, `linkStatus=Pending` → Notification `OccupancyLinked` cho Renter (chờ UC-023); chưa có → fallback tên+SĐT. 3. Bổ sung ngày bắt đầu, số người, ghi chú → Lưu (FR-034). Một phòng thêm được nhiều người (ở ghép). 4. Người ở đăng ký sau → gắn tài khoản (FR-036, cũng qua xác nhận). 5. Kết thúc ở → `endDate`, lịch sử (FR-035); nếu Contract liên quan kết thúc → gợi ý đổi RoomStatus (BR-031).
- **Post:** người ở được quản lý; tài khoản là tùy chọn (AS-006).

#### UC-015 — Ghi điện nước, tạo & gửi hóa đơn, ghi nhận thu
- **Actor:** Seller. **Pre:** Room có Contract Active.
- **Main:** 1. Nhập chỉ số điện/nước (FR-043; chặn trùng kỳ). 2. Tạo Invoice + InvoiceItem (FR-044; unique contractId+period; reading được gắn `invoiceId`). 3. Xuất PDF/ảnh kèm STK + VietQR (số tiền + mã hóa đơn) (FR-078); người ở linked Confirmed → in-app + `InvoiceReceived`. 4. Nhận tiền ngoài nền tảng → bấm "Đã thu" (FR-045) → trạng thái Invoice **suy tự động** từ ΣPayment (BR-004).
- **Alt:** 4a. thu một phần trước hạn → PartiallyPaid. **Exc:** 1a. chỉ số mới < cũ → 422; 1b. trùng (roomId, type, period) → 409; 4b. quá dueDate → job Overdue + Notification (FR-046); thu một phần sau hạn → vẫn Overdue.
- **Post:** app ghi nhận, không cầm tiền (AS-002).

#### UC-017 — Kiểm duyệt tin
- **Actor:** Moderator, Admin. **Pre:** có tin PendingApproval.
- **Main:** 1. Mở hàng đợi (3 loại tin, gồm tin sửa trường quan trọng đang ẩn tạm — BR-003). 2. Đối chiếu tiêu chí. 3. Duyệt → Active + Notification; hoặc Từ chối (bắt buộc lý do) → Rejected (FR-064). 4. Audit log.

#### UC-018 — Xử lý báo cáo vi phạm
- **Actor:** Moderator, Admin. **Pre:** có Report Pending.
- **Main:** 1. User gửi Report (FR-061 — tin cho thuê/tin nhu cầu/tin nhắn/đánh giá). 2. Tin ≥3 report → tự PendingApproval + tạm ẩn (FR-063, BR-018); review ≥3 report → tự ẩn (BR-023). 3. Xem nội dung + lịch sử. 4. Hành động: Giữ/Ẩn/Từ chối tin, Khóa hội thoại, Khóa user (→ tin tự Hidden, BR-028), Ẩn review. 5. Phản hồi người báo cáo + audit.

#### UC-020 — Nhắn tin với người đăng
- **Actor:** Renter, Seller. **Pre:** đăng nhập; tin không Expired/Rented/Hidden; không phải tin của mình (BR-030).
- **Main:** 1. Bấm Nhắn tin → tạo/mở Conversation (FR-071, BR-019; unique theo (initiator, tin)). 2. Gửi Message (FR-072). 3. Notification "tin nhắn mới". 4. Người nhận mở → đã đọc; polling cập nhật.
- **Alt:** 1a. có hội thoại → mở cũ. **Exc:** 1b. chưa đăng nhập → yêu cầu đăng nhập kèm `?redirect=`; 2a. bị chặn → không gửi (FR-073, BR-020).

#### UC-021 — Dùng công cụ hỗ trợ thuế
- **Actor:** Seller. **Pre:** đăng nhập; workspace TRIAL/ACTIVE; TaxSetting năm Active.
- **Main:** 1. Mở "Hỗ trợ thuế", chọn năm. 2. Doanh thu = ΣPayment trong năm (cash basis; MVP nhập tay) (FR-074). 3. Tính GTGT/TNCN + disclaimer (BR-021). 4. Xuất template PDF + lưu TaxDeclaration (FR-075).
- **Alt:** 2a. ≤ ngưỡng → không phát sinh thuế. **Exc:** 1a. TaxSetting chưa cấu hình → cảnh báo, dùng giá trị năm gần nhất.

#### UC-022 — Đánh giá khu trọ đã ở (verified)
- **Actor:** Renter. **Pre:** liên kết Occupancy `Confirmed`; có/từng có Contract tại Property; không phải chủ khu; đạt điều kiện mở (Contract ≥ 30 ngày HOẶC ≥1 Payment — BR-022); đợt ở này chưa review (BR-023).
- **Main:** 1. Mở "Phòng của tôi" (đang ở) **hoặc tab "Lịch sử ở trọ"** (từng ở) → "Đánh giá khu". 2. Chọn sao (1–5) + nội dung → gửi (FR-081). 3. Hệ thống verify điều kiện → lưu Review (`Visible`) → cập nhật `avgRating`/`reviewCount`. 4. Hiển thị ở trang khu public + badge trên tin gắn khu — **chỉ khi khu đang bật public** (BR-024).
- **Alt:** 2a. sửa review trong 7 ngày. **Exc:** 1a. không đạt điều kiện → lỗi `REVIEW_NOT_ELIGIBLE` kèm lý do chung (không tiết lộ chi tiết cơ chế); 2b. đã review đợt này → chặn.

#### UC-023 — Xác nhận liên kết vào phòng (MỚI)
- **Actor:** Renter. **Pre:** Seller đã gắn SĐT/tài khoản của Renter vào một Occupancy (`linkStatus=Pending`).
- **Main:** 1. Renter nhận Notification `OccupancyLinked` ("Chủ trọ X mời bạn liên kết vào phòng Y, khu Z"). 2. Mở → xem thông tin phòng/khu. 3. **Chấp nhận** → `Confirmed`: mở "Phòng của tôi", quyền xem HĐ/hóa đơn của mình, quyền review (FR-092). 4. Hoặc **Từ chối** → `Rejected`: gỡ `userId`, Occupancy về fallback.
- **Alt:** 3a. Renter đã Confirmed có thể **tự gỡ liên kết** bất kỳ lúc nào (BR-029) — Occupancy về fallback, quyền xem/review đóng lại.
- **Post:** không ai bị gắn vào phòng mà không biết; chặn cửa gian lận review bằng tài khoản chim mồi.

#### UC-024 — Thanh toán phí nền tảng (boost/gói) (MỚI)
- **Actor:** Seller (khởi tạo), Hệ thống (hoàn tất). **Pre:** Seller chọn boost tin Active hoặc mua/gia hạn gói.
- **Main:** 1. BE tạo `PlatformTransaction` (`Pending`, `idempotencyKey`) → trả URL thanh toán VNPay (FR-093). 2. Seller thanh toán trên gateway. 3. Gateway gọi webhook (server-to-server) → BE verify chữ ký → `Success` → **kích hoạt quyền lợi tại đây**: set `boostExpireAt = now + boostDays` hoặc tạo/gia hạn `UserSubscription`. 4. Return URL trên trình duyệt chỉ hiển thị kết quả.
- **Alt:** 3a. webhook đến trùng → idempotent, không kích hoạt lần 2. **Exc:** 3b. thanh toán thất bại → `Failed`, không kích hoạt; 3c. `Pending` > 15 phút không có webhook → job đánh `Failed`; Seller thấy trạng thái ở B15/B4, bấm thử lại (idempotencyKey mới).
- **Post:** không bao giờ kích hoạt quyền lợi mà chưa xác nhận tiền qua webhook; không tính phí trùng.

---

## 5. DATA REQUIREMENTS

### 5.1 Entity List (30 entity)
User, Role, Profile, **RefreshToken**, RentalListing, RoomWantedPost, RoommateWantedPost, Property, Room, Occupancy, Contract, Invoice, InvoiceItem, UtilityReading, Payment, **PlatformTransaction**, Notification, Favorite, Report, Review, Conversation, Message, **ContactEvent**, SubscriptionPlan, UserSubscription, TaxSetting, TaxDeclaration, Amenity, **BannedKeyword**, Media. *(Chi tiết field/quan hệ/index: file 02 Mục 6 — nguồn chân lý.)*

### 5.2 Entity Description (rút gọn)

| Entity | Mô tả | Field chính |
|---|---|---|
| User | Tài khoản | phoneNumber (unique), email (null), passwordHash, status (Active/Locked) |
| Role | Vai trò (n-n với User, cộng dồn) | name (Renter/Seller/Admin/Moderator) |
| Profile | Hồ sơ & liên hệ | fullName, contactPhone, displaySettings |
| RefreshToken | Phiên đăng nhập | userId, tokenHash, expiresAt, revokedAt |
| RentalListing | Tin cho thuê | propertyType (BoardingRoom/ServicedApartment/Apartment), price, status, expireAt (=approvedAt+60d), boostExpireAt, roomId (null), propertyId (null) |
| RoomWantedPost | Tin tìm phòng | desiredDistricts, priceMin/Max, status, expireAt |
| RoommateWantedPost | Tin ở ghép | sharePrice, neededCount, genderRequirement, status |
| Property | Khu + nhận tiền + public | name, district, bank*, isPublicProfileEnabled, publicSlug, avgRating, reviewCount |
| Room | Phòng | roomCode (unique/khu), area, price, status |
| Occupancy | Người ở thực tế | userId (null), **linkStatus (Pending/Confirmed/Rejected)**, fullName, phoneNumber, startDate, **endDate (null)**, isActive |
| Contract | Hợp đồng (lưu scan) | occupancyId, startDate, endDate, rentPrice, deposit, status |
| Invoice | Hóa đơn kỳ | period, dueDate, totalAmount, status; **unique (contractId, period)** |
| InvoiceItem | Dòng chi phí | type (Rent/Electricity/Water/Service/Other), amount |
| UtilityReading | Chỉ số điện nước | type, period, previous/currentReading, unitPrice, **invoiceId (null)**; **unique (roomId, type, period)** |
| Payment | Ghi nhận thu tiền thuê | invoiceId (bắt buộc), amount, method (Cash/BankTransfer), paidAt |
| PlatformTransaction | Phí nền tảng qua gateway | sellerId, type (Boost/Subscription), listingId/userSubscriptionId (null), amount, status (Pending/Success/Failed), idempotencyKey (unique) |
| Notification | Thông báo | type (…, InvoiceReceived, OccupancyLinked, ListingAutoRented), isRead, refType/refId |
| Favorite | Tin đã lưu | renterId, listingId (unique cặp) |
| Report | Báo cáo vi phạm | targetType (2 loại tin nhu cầu + RentalListing + Conversation/Message/Review), reason, status |
| Review | Đánh giá khu | propertyId, authorUserId, contractId (unique), rating, status, sellerReply (V2) |
| Conversation | Hội thoại | refType, refId, **initiatorId**, posterId, status; **unique (initiatorId, refType, refId)** |
| Message | Tin nhắn | conversationId, senderId, content, isRead, readAt |
| ContactEvent | Tương tác liên hệ | listingId, userId (null), type (Call/Message) |
| SubscriptionPlan | Gói SaaS | durationMonths, price, renewalPrice, trialDays, maxProperties, maxRooms, **isTrialPlan** |
| UserSubscription | Gói của Seller | startDate, expireDate, status (Trial/Active/Expired/Cancelled) |
| TaxSetting | Cấu hình thuế | year, thresholdRevenue, vatRate, pitRate |
| TaxDeclaration | Bản tính thuế | year, totalRevenue (cash basis), vatAmount, pitAmount |
| Amenity | Tiện ích | name, icon, type (Room/Surrounding) |
| BannedKeyword | Từ khóa cấm | keyword, isActive |
| Media | File/ảnh | ownerType, ownerId (null khi mới upload), url, isPrivate |

### 5.3 Relationship Summary
- **1-1:** User — Profile.
- **N-N:** User — Role; RentalListing — Amenity; Room — Amenity.
- **1-N:** User — RefreshToken; User(Seller) — Property/UserSubscription/TaxDeclaration/PlatformTransaction; Property — Room/Review; Room — Occupancy/Contract/Invoice/UtilityReading; Invoice — InvoiceItem/Payment/Media; Contract — Media (scan); User — Notification; User(Renter) — RoomWantedPost/RoommateWantedPost/Favorite; Conversation — Message; SubscriptionPlan — UserSubscription; RentalListing — ContactEvent.
- **N-1 tùy chọn:** RentalListing — Room; RentalListing — Property; Occupancy — User (userId nullable + linkStatus); UtilityReading — Invoice; PlatformTransaction — RentalListing hoặc UserSubscription.
- **1-1 tối đa:** Contract — Review (qua contractId unique).
- **Hai khóa người dùng:** Conversation tham chiếu initiatorId & posterId.
- **Đa hình:** Media theo ownerType; Report theo targetType; Conversation theo refType.

---

## 6. BUSINESS RULES (bản gọn — diễn giải đầy đủ ở file 02 Mục 5)

- **BR-001 — ListingStatus:** Draft, PendingApproval, Active, Rejected, Hidden, Expired, Rented; áp dụng cả tin nhu cầu.
- **BR-002 — RoomStatus:** Available, Deposited, Rented, Hidden; đồng bộ theo BR-031.
- **BR-003 — Sửa trường quan trọng → duyệt lại, tin ẩn tạm; gia hạn không sửa → không duyệt lại.**
- **BR-004 — InvoiceStatus suy tự động từ ΣPayment:** Unpaid, PartiallyPaid, Paid, Overdue; Overdue thu đủ → Paid, một phần → vẫn Overdue.
- **BR-005 — Chỉ hiển thị tin Active; boost xếp trước; chỉ boost tin Active.**
- **BR-006 — ContractStatus:** Draft, Active, Expired, Terminated; **mỗi Room ≤ 1 Contract Active, chặn chồng lấn; job tự Expired.**
- **BR-007 — Dữ liệu SaaS thuộc đúng một Seller;** Renter gắn chỉ xem của mình; Admin truy cập audit.
- **BR-008 — Scan hợp đồng:** tự nguyện, private + signed URL ≤ 15 phút, cho xóa.
- **BR-009 — Tin nhu cầu 30 ngày → Expired; gia hạn +30 ngày (không duyệt lại nếu không sửa).**
- **BR-010 — Mỗi Renter ≤ 2 tin Active mỗi loại.**
- **BR-011 — Không xóa Property còn phòng thuê/HĐ Active; xóa mềm.**
- **BR-012 — Dashboard: "Phòng trống" luôn hiện; "Tổng số phòng"/"Số khách"/"Doanh thu" toggle, mặc định TẮT.**
- **BR-013 — Role cộng dồn:** một User vừa Renter vừa Seller; Seller tự kích hoạt theo hành vi; Marketplace free, Workspace SaaS sau gating; Admin/Moderator tách bạch.
- **BR-014 — Hai kênh liên hệ; Guest thấy SĐT che một phần; không Zalo.**
- **BR-015 — Gating 4 trạng thái;** hết hạn → read-only giữ dữ liệu; over-limit → chỉ chặn tạo mới; TRIAL theo plan Trial; Cancelled chỉ do Admin; V1 không nâng gói giữa kỳ.
- **BR-016 — phoneNumber duy nhất, định danh đăng ký + kênh OTP; email tùy chọn.**
- **BR-017 — Nhắc gia hạn gói trước 6/2/1 tháng; TRIAL trước 7 ngày.**
- **BR-018 — Tin ≥ 3 report chưa xử lý → PendingApproval, tạm ẩn.**
- **BR-019 — Nhắn tin: chỉ user đăng nhập; một Conversation/(người khởi tạo, tin); không tạo với tin Expired/Rented/Hidden.**
- **BR-020 — Chặn & báo cáo trong chat; phạm vi chặn V1 = Conversation.**
- **BR-021 — Thuế tham khảo; cash basis (ΣPayment/năm); cấu hình TaxSetting; disclaimer; kiểm chứng quy định 2026.**
- **BR-022 — Verified review:** liên kết Confirmed + có Contract tại khu + **không phải chủ khu** + (Contract ≥ 30 ngày HOẶC ≥ 1 Payment).
- **BR-023 — Mỗi đợt ở (Contract) 1 review; sửa trong 7 ngày; ≥ 3 report → tự ẩn chờ duyệt.**
- **BR-024 — Review viết & lưu được mọi lúc; CHỈ HIỂN THỊ khi khu bật public;** tắt public/xóa mềm → ẩn hiển thị, giữ DB; trang khu không lộ vận hành.
- **BR-025 — Giờ giấc ra vào làm bộ lọc; chi tiết tin hiển thị thời điểm đăng/cập nhật.**
- **BR-026 — Tin cho thuê hiển thị 60 ngày; gia hạn +60, về thẳng Active nếu không sửa.**
- **BR-027 — Đồng bộ Room ↔ Listing:** Room Rented → tin gắn phòng tự Rented + Notification; Deposited → gợi ý ẩn 1 chạm.
- **BR-028 — User Locked → tin Active tự Hidden; mở khóa không tự Active lại.**
- **BR-029 — Liên kết Occupancy cần Renter xác nhận** (Pending/Confirmed/Rejected); Renter tự gỡ được.
- **BR-030 — Cấm tự tương tác:** không nhắn tin/review với tin/khu của chính mình.
- **BR-031 — Đồng bộ RoomStatus ↔ Contract:** tạo Contract Active → Room Rented (cùng transaction); Contract kết thúc → gợi ý 1 chạm về Available.

---

## 7. APPENDIX

### 7.1 Sơ đồ trạng thái (text)

**Listing (BR-001, BR-003, BR-026, BR-027):**
```
Draft ──gửi──▶ PendingApproval ──duyệt──▶ Active ──hết 60 ngày──▶ Expired
                     │                      │  ▲                     │
                  từ chối        sửa quan trọng │ gia hạn (không sửa) │
                     ▼           / ≥3 report │ └──── Active ◀────────┘
                 Rejected ──sửa+gửi lại──▶ PendingApproval
Active ──Seller ẩn / user bị khóa (BR-028)──▶ Hidden ──mở lại──▶ Active
Active ──Seller đánh dấu / Room Rented (BR-027)──▶ Rented ──phòng trống lại──▶ Active
```

**Room (BR-002, BR-031):** Available ⇄ Deposited ⇄ Rented; Available ⇄ Hidden; tạo Contract Active → Rented (tự động); Contract kết thúc → gợi ý về Available.

**Contract (BR-006):** Draft ▶ Active ▶ Expired (job khi qua endDate) | Terminated.

**Invoice (BR-004):** Unpaid ▶ PartiallyPaid ▶ Paid; Unpaid/PartiallyPaid ──quá dueDate──▶ Overdue; Overdue ──thu đủ──▶ Paid (thu một phần: vẫn Overdue).

**PlatformTransaction:** Pending ▶ Success (webhook, kích hoạt quyền lợi) | Failed (webhook fail hoặc treo > 15 phút).

**Occupancy link (BR-029):** (userId gắn) Pending ▶ Confirmed | Rejected; Confirmed ──tự gỡ──▶ (userId null).

**Conversation (BR-019/020):** Active ▶ Archived | Blocked.

### 7.2 Bảng tổng hợp MoSCoW

| Priority | Mã FR |
|---|---|
| **Must** | 001–008, 010–013, 017–019, 021, 022, 024–026, 028–031, 033–035, 037, 041–045, 047, 048, 050, 053–055, 057, 058, 061, 062, 064–066 (gồm 065b), 068, 069, 074, 081, 082, 087, 089, 090, 091, 092, 093 |
| **Should** | 009, 014, 015, 020, 023, 027, 032, 036, 038–040, 046, 049, 051, 059, 060, 063, 071–073, 075–079, 083–086, 088 |
| **Could** | 016, 052, 056, 067, 070 |

Ghi chú: UI màn chat hiển thị từ MVP; nghiệp vụ chat (FR-071..073) hoàn thiện V1. **MVP demo** chỉ hiện thực FR liên quan Show Listing (FR-053..055), Đăng Listing (FR-010, FR-011), Dashboard SaaS (FR-068) và demo luồng hóa đơn (FR-043..045, FR-078 mock) bằng mock data (AS-014).

### 7.3 Assumptions (tham chiếu — bảng chuẩn duy nhất ở file 02 Mục 13)

| Mã | Tóm tắt một dòng |
|---|---|
| AS-001 | Liên hệ 2 kênh (in-app + gọi); không Zalo; không đặt lịch |
| AS-002 | Không giữ tiền thuê; VietQR theo khu; phí nền tảng qua PlatformTransaction |
| AS-003 | Gói 36 tháng ~600k; TRIAL theo plan Trial; 4 trạng thái workspace |
| AS-004 | Một tài khoản kiêm Renter & Seller; role cộng dồn |
| AS-005 | Seller gồm cò trọ; không môi giới |
| AS-006 | Occupancy userId nullable; liên kết cần xác nhận; single-sided |
| AS-007 | Review verified-only; khu không dùng SaaS không có review (chủ đích) |
| AS-008 | "Phòng của tôi" V1 chỉ xem; tự nhập điện nước/báo sự cố = V2 |
| AS-009 | Người ở gửi chỉ số qua kênh ngoài (thủ công) |
| AS-010 | Hồ sơ khu public opt-in; review hiển thị khi bật |
| AS-011 | Chat UI từ MVP, nghiệp vụ V1; polling → WebSocket |
| AS-012 | Thuế tham khảo, cash basis; kiểm chứng quy định 2026 |
| AS-013 | Nhận tiền (STK/QR) theo từng Property |
| AS-014 | MVP = danh sách màn hình chuẩn file 02 Mục 10, mock data |
| AS-015 | Kiểm duyệt = từ khóa cấm + duyệt tay |
| AS-016 | Con số NFR là mục tiêu giả định |
| AS-017 | Đơn giá điện/nước Seller tự nhập |
| AS-018 | Map bên thứ ba; geocoding khi đăng tin |
| AS-019 | Web-first; mobile sau, cùng API |
| AS-020 | Tech stack là đề xuất, team thay được |

— HẾT TÀI LIỆU SRS v2 —
