# Backlog sau CP4 — những thứ CỐ Ý không làm, và vì sao

> Cập nhật: 2026-08-06 · Quyết định của chủ dự án (`phuc220204`)
>
> File này tồn tại để phân biệt **"chưa làm vì có lý do"** với **"quên làm"**.
> Không có nó, người tiếp nhận sau sẽ tưởng đây là lỗ hổng và đi vá lại một
> quyết định đã được cân nhắc.
>
> ⚠️ **Không có mục nào trong file này được để lộ nhãn phiên bản ra UI.**
> Sản phẩm CP4 phải trông như một app hoàn chỉnh đang kinh doanh: nút nào không
> làm được việc thì **xóa** hoặc **đổi thành việc làm được thật** — tuyệt đối
> không `[V1]`, không "sắp có", không hộp thoại báo thành công một việc chưa xảy ra.

---

## 1. Nhắc nợ tự động (gửi thông báo cho người ở kèm link hóa đơn)

**Trạng thái:** không làm ở CP4. **Quyết định của chủ dự án, không phải sơ suất.**

**Lý do nghiệp vụ:** tính năng này chỉ có ý nghĩa khi **người ở có app riêng để
nhận thông báo**. Gửi vào hộp thư in-app của web mà người ở không mở thì không
khác gì không gửi — chủ trọ vẫn phải gọi điện, và hệ thống lại tạo cảm giác
"đã nhắc rồi" trong khi người ở chưa biết gì. Đó là tệ hơn không có tính năng.

⇒ **Phụ thuộc: app mobile cho người ở.** Chưa cần thiết ở giai đoạn này.

**CP4 làm gì thay thế:** nút "Nhắc nợ" ở dashboard đổi thành **"Xem hóa đơn"** →
mở `/chu-tro/hoa-don`. Chủ trọ lấy mã VietQR ở đó rồi tự gửi cho người ở qua
Zalo/điện thoại. Đúng tinh thần **AS-002** — nền tảng không đứng giữa dòng tiền,
và cũng không giả vờ đứng giữa dòng liên lạc.

### Nếu làm sau này — những gì phải chạm

1. **`conversations.ref_type` hiện chỉ nhận `'RentalListing' | 'DemandPost'`.**
   `start_conversation()` raise `INVALID_REF_TYPE` với mọi giá trị khác. Muốn
   hội thoại gắn với hợp đồng/hóa đơn thì phải nới CHECK constraint bằng
   migration mới **và** cập nhật RPC — không sửa được ở frontend.
2. **Quyền đọc hội thoại.** Policy hiện tại dựng theo `initiator_id`/`poster_id`
   của tin đăng. Hội thoại gắn hợp đồng cần helper `security definer` mới (kiểu
   `is_contract_occupant`), vì người ở **không đọc được** `rooms`/`properties` —
   xem CONTEXT_HANDOFF §3, cạm bẫy RLS trả rỗng im lặng đã cắn 4 lần.
3. **Đường thông báo thật** (push notification) — chính là phần cần app mobile.

---

## 2. Cổng thanh toán trực tuyến / biên lai điện tử

**Trạng thái:** không làm, và **không nên hứa**.

**AS-002 là quyết định kiến trúc, không phải hạn chế tạm thời:** nền tảng
**KHÔNG giữ tiền thuê**. Hóa đơn kèm số tài khoản + mã VietQR, người ở chuyển
khoản thẳng cho chủ trọ, chủ trọ tự bấm "Đã thu".

Giữ tiền hộ người khác là hoạt động **trung gian thanh toán**, ở Việt Nam cần
giấy phép của Ngân hàng Nhà nước. Đó là lý do thật, không phải vì thiếu thời gian.

**Đã sửa ở CP4:** copy marketing trên `HomePage` từng quảng cáo *"thanh toán
tiền điện nước trực tuyến minh bạch, có biên lai điện tử"* — mô tả một dịch vụ
tài chính không tồn tại. Đã đổi sang điểm mạnh thật: chuyển khoản trực tiếp qua
VietQR, không qua trung gian, không phí ẩn.

---

## 3. Hỗ trợ khách hàng 24/7

**Trạng thái:** không có đội CSKH. Copy cũ trên `HomePage` hứa điều này — đã sửa.

CP4 dùng `mailto:` tới email của nhóm. Trung thực và đủ cho quy mô hiện tại.

---

## 4. Đã làm ở CP4, ghi lại để không ai tưởng còn thiếu

| Việc | Nơi |
|---|---|
| Gia hạn hợp đồng (`extend_contract`) | Có RPC riêng, kiểm BR-006 |
| Bật boost khi **sửa** tin | `updateListing` nhận `boostExpireAt` |
| "Phòng tương tự" ở trang chi tiết | Query thật theo quận + khoảng giá, không còn `SIMILAR_ROOMS` cứng |
| Nhắn tin in-app | `start_conversation` cho tin cho thuê & tin nhu cầu |
| VietQR trên hóa đơn | Tự sinh EMVCo tại máy người dùng, không gọi dịch vụ ngoài |
