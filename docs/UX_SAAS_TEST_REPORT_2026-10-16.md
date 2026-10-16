# Báo cáo test UX/UI & logic thao tác SaaS — tài khoản demo (16/10/2026)

**Môi trường:** localhost (nhánh `main`, đã gồm PR #15), backend Supabase production.
**Tài khoản:** `seller.a`, `seller.b`, `renter.a`, `admin` (`docs/cp4/DEMO_ACCOUNTS.md`). Chủ dự án tự đăng nhập; phiên test không nhập mật khẩu.
**Phạm vi:** chỉ đọc. Theo DEMO_ACCOUNTS §6, không bấm nút ghi (lưu, gia hạn, xác nhận, thanh toán), chỉ mở form/modal để xem.
**Chưa phản ánh:** các sửa đổi trong PR #16–#24 đang chờ merge. Mục nào đã có PR sửa thì có ghi chú.

## Kết luận nhanh

| Khía cạnh | Đánh giá |
|---|---|
| Cô lập dữ liệu giữa chủ trọ (BR-007) | ✅ **Đạt.** Với phiên seller.b, truy vấn trực tiếp khu trọ (kể cả STK ngân hàng), phòng, hóa đơn, hợp đồng, người ở, thanh toán của seller.a đều trả 0 dòng. |
| Gating theo gói (BR-015) | ✅ Chủ trọ chưa có gói thấy paywall + nút dùng thử ở mọi trang SaaS; trang Gói dịch vụ vẫn vào được. |
| Che SĐT (BR-014) | ✅ Đã đăng nhập thì thấy đủ số; khách thấy số đã che. |
| **Logic vận hành của một SaaS quản lý trọ** | ⚠️ **Chưa đạt.** Hệ thống *ghi nhận* tốt nhưng *không nhắc việc*: hợp đồng quá hạn, tháng chưa lập hóa đơn, nợ quá hạn đều không được đẩy lên thành việc cần làm. |
| Vệ sinh dữ liệu | ❌ Dữ liệu test E2E còn trong tài khoản demo, danh sách người dùng và tin nhắn; số tiền "còn phải thu" bị cộng cả hóa đơn test. |

## 🔴 Lỗi logic nghiệp vụ (ưu tiên cao)

1. **Hợp đồng hết hạn không được phát hiện.**
   - Tại Khu Phan Văn Trị, 3/4 hợp đồng đã quá ngày kết thúc: P203 (20/06/2026), P202 (15/07/2026, quá 93 ngày), P102 (01/10/2026).
   - Cả ba vẫn nằm dưới tiêu đề "Hợp đồng **đang hiệu lực**", phòng vẫn "Đang thuê".
   - Dashboard không có ô "Hợp đồng sắp hết hạn / đã hết hạn".
   - Nút "Gia hạn HĐ" có nhưng không được gợi ý.
2. **Không nhắc lập hóa đơn và ghi điện nước.**
   - Kỳ gần nhất của các phòng là tháng 8/2026; tháng 9 và 10 không có chỉ số điện nước hay hóa đơn.
   - Không có màn nào báo "Tháng 9, 10 chưa lập hóa đơn cho 5 phòng". Với SaaS thu tiền theo kỳ, đây là việc cốt lõi.
3. **Dashboard mâu thuẫn với dữ liệu.**
   - Lời chào ghi "Mọi thứ trong tầm kiểm soát" trong khi P202 nợ 3.386.000đ, quá hạn 67 ngày.
   - Bảng phòng ghi P202 "Chưa thanh toán", trong khi chính khối "Hóa đơn cần nhắc" bên cạnh ghi "Quá hạn 67 ngày".
4. **Hóa đơn của khu đã xóa vẫn được tính.**
   - Hóa đơn của 4 khu test `khu-e2e-…` (đã xóa mềm) vẫn hiện ở dashboard và ở `/chu-tro/hoa-don`.
   - Chúng được cộng vào "Còn phải thu: 6.686.000đ", trong đó 3.300.000đ là hóa đơn test.
   - Truy vấn hóa đơn không lọc khu đã xóa.
5. **Quản lý tin: "Cần xử lý 0 · Mọi tin đều ổn" trong khi cả 4 tin đều Hết hạn.** Tin hết hạn phải được tính là cần xử lý (gia hạn).
6. **"Tạo tin đăng" từ phòng trống không điền sẵn gì.**
   - Đây là điểm nối Room → RentalListing (CLAUDE.md §2.2). Dashboard chỉ `navigate("/dang-tin-cho-thue")`, không truyền `prefill` dù `DangTinPage` đã hỗ trợ `location.state.prefill`.
   - Chủ trọ phải gõ lại địa chỉ, diện tích, giá, đơn giá điện nước.
7. **"Xem hóa đơn" ở một phòng mở toàn bộ hóa đơn**, không lọc theo phòng đó.

## 🟠 Bất hợp lý thao tác / UX

| # | Màn | Vấn đề |
|---|---|---|
| 8 | Khu trọ & Phòng | Không có "Tất cả khu trọ"; mặc định mở "Căn hộ Quận 7" (3 phòng) thay vì khu lớn nhất. Đổi tab Cài đặt hoặc tải lại là mất lựa chọn khu. Dashboard lại có "Tất cả khu trọ" ⇒ không nhất quán. |
| 9 | Khu trọ & Phòng | Danh sách phòng không hiện trạng thái nợ: P202 quá hạn 67 ngày trông giống mọi phòng "Đang thuê" khác. |
| 10 | Hóa đơn | Thứ tự hỗn loạn (tháng 10, 7, 6, 7, 8…). Nên sắp quá hạn trước, rồi theo kỳ mới nhất. |
| 11 | Dashboard | Che số liệu (BR-012) không nhất quán: "Đã thu trong tháng" bị che, nhưng "Hóa đơn kỳ này 13,2 triệu đ" và "Hóa đơn chưa thu 6,7 triệu đ" vẫn hiện. |
| 12 | Dashboard | Cột phải "Công cụ quản lý" lặp lại sidebar; "Hỗ trợ — Gửi ngay" chỉ là mailto. |
| 13 | Dashboard mobile | Thẻ "Hóa đơn cần nhắc" bị ép chữ ("Khu trọ / Phan / Văn / Trị"); tiêu đề header "Dashboard" là tiếng Anh. |
| 14 | Đăng tin | SĐT liên hệ không lấy sẵn từ hồ sơ (seller.a có 0901234567). |
| 15 | Paywall | Tiêu đề "Tính năng dành riêng cho gói **SaaS**", là thuật ngữ kỹ thuật với chủ trọ; nên ghi "gói Quản lý vận hành". |
| 16 | Gói dịch vụ | seller.a "Đang hoạt động · đến 07/08/2029" nhưng không hiện tên gói, không đánh dấu thẻ "Gói hiện tại". |
| 17 | Tìm người thuê | "5 phòng trống sẵn sàng" nhưng không có tin nhu cầu (đã dọn); trạng thái trống không gợi ý bước tiếp theo (đăng tin cho thuê, bật thông báo). |
| 18 | Phòng của tôi (renter) | Lời mời liên kết "Xác nhận bạn là người ở P102" không hiện chủ trọ, ngày bắt đầu hay giá thuê để người thuê đối chiếu. Hồ sơ người ở P102 là "Nguyễn Văn An" nhưng tài khoản được mời là "Lê Minh Nhật"; không có cảnh báo lệch tên. |
| 19 | Tài khoản (renter) | Trang Tổng quan của người thuê vẫn hiện ô "Tin cho thuê". |
| 20 | Admin – Kiểm duyệt | Thiếu tab "Hết hạn" và "Đã ẩn"; tin bị ẩn chỉ tìm được qua "Tất cả". |
| 21 | Admin – Người dùng | 48 tài khoản, nhiều `e2e.*@tronhanh.test` và tài khoản clone. Không lọc theo vai trò, không phân trang, không có ngày tạo hay gói. |
| 22 | Admin – Tổng quan / Cài đặt | Không có chỉ số doanh thu, số gói đang hoạt động/dùng thử, đơn payOS cần đối soát. Giá đẩy tin nhu cầu và giá gói SaaS không chỉnh được trong UI (chỉ có giá Boost tin cho thuê). |

**Đã có PR sửa (chờ merge):** nút báo cáo và khóa tài khoản (#19); đánh giá và tìm người thuê ra khỏi paywall, phân biệt lỗi tải gói (#21); thông báo lỗi và trạng thái rỗng (#22).

## 🧹 Dữ liệu cần dọn trên production

- Khu trọ test `khu-e2e-*` của seller.a (đã xóa mềm) **và hóa đơn của chúng** (vẫn đang được tính).
- Hội thoại `tin-e2e-*`, `msg-e2e-*` giữa seller.a và renter.a.
- Tài khoản `e2e.*@tronhanh.test`, "Người Dùng SĐT E2E".
- Cập nhật `DEMO_ACCOUNTS.md`:
  - seller.b thực tế **0 khu, 0 phòng, không có gói**, khác mô tả "giống seller.a". Phép thử cô lập theo tài liệu vì vậy không làm được qua UI.
  - Tên hiển thị thực tế là seller.a = "Nguyễn Thị A", renter.a = "Lê Minh Nhật".

## Đề xuất thứ tự sửa

1. **Bảng "Việc cần làm" trên dashboard:** hợp đồng hết hạn hoặc sắp hết hạn (≤ 30 ngày), phòng chưa lập hóa đơn kỳ này, hóa đơn quá hạn, tin hết hạn. Gộp các mục 1, 2, 3, 5.
2. Lọc hóa đơn và KPI theo khu chưa xóa (mục 4), rồi dọn dữ liệu test.
3. Điền sẵn dữ liệu khi tạo tin từ phòng trống (`state.prefill` từ room + property) và SĐT từ hồ sơ (mục 6, 14). Lọc hóa đơn theo phòng (mục 7).
4. Phòng & Hóa đơn: trạng thái nợ trên danh sách phòng, sắp xếp hóa đơn, nhớ khu đang chọn (mục 8–10).
5. Lời mời liên kết người ở hiện đủ thông tin đối chiếu (mục 18).
6. Admin: tab Hết hạn/Đã ẩn, lọc và phân trang người dùng, chỉ số doanh thu và gói (mục 20–22).
