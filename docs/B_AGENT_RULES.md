# AGENT RULES — Trọ Nhanh
> Luật bắt buộc cho Agent Code (Claude Code / Codex) khi vibe-code dự án này.
> Dán nội dung này vào `CLAUDE.md` (hoặc rules của agent) ở gốc repo.
> Đọc kèm: `A_PRD_TroNhanh_MVP.md` (làm cái gì) · `C_BUILD_PLAN.md` (làm theo thứ tự nào).

---

## 0. Nguồn chân lý & thái độ
- **File 02 (Đặc tả Kỹ thuật) là nguồn chân lý.** Khi mâu thuẫn, theo file 02. Enum trạng thái, tên entity, business rule lấy đúng, **không tự đặt mới**.
- **Rõ ràng hơn thông minh:** code dễ đọc quan trọng hơn ngắn gọn.
- **Không tự thêm tính năng ngoài scope PRD.** Nếu thấy cần thêm, ghi chú `// TODO(proposal): ...` và hỏi người dùng, đừng tự đưa vào.
- **Chia task lớn thành bước nhỏ**, làm theo `C_BUILD_PLAN.md`. Mỗi bước chạy được rồi mới sang bước sau.

## 1. Thuật ngữ (BẮT BUỘC dùng đúng)
`Property` (khu trọ) · `Room` (phòng) · `Occupancy` (người ở, KHÔNG phải role) · `Renter` (tài khoản thuê) · `Seller` (người đăng tin) · `RentalListing` (tin cho thuê) · `DemandPost` (tin nhu cầu).
- **CẤM dùng "Tenant"** ở bất kỳ đâu (biến, bảng, comment, UI). Thay bằng `Occupancy` hoặc `Renter`.

## 2. Ranh giới 2 domain (KHÔNG vi phạm)
- Code tách 3 nhóm: `src/shared/`, `src/marketplace/`, `src/workspace/`.
- `marketplace` và `workspace` **không import lẫn nhau qua tầng dữ liệu**. Chỉ nối qua interface/service ở `shared` (điểm nối hợp lệ duy nhất: "Tạo tin từ phòng").
- Không truy vấn thẳng table của domain kia.

## 3. Backend = Supabase
- Dùng `@supabase/supabase-js`. **Không** tự viết JWT/auth — dùng Supabase Auth.
- **Bật RLS** cho mọi bảng SaaS với policy `owner_id = auth.uid()`. Đây là cơ chế multi-tenant; không dựa vào việc lọc ở client.
- Mọi bảng đọc-public (Marketplace) có policy SELECT rõ ràng (vd `status = 'Active'`).
- **Không bao giờ** đặt `service_role` key ở frontend. Frontend chỉ dùng `anon` key.

## 4. Quản lý secret (KHÔNG hardcode)
- Supabase URL + anon key đọc qua biến môi trường: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- **Không commit `.env`.** Commit `.env.example` liệt kê tên biến (không giá trị thật).
- Không rải `import.meta.env` khắp nơi — gom vào một file `src/shared/config.ts` có validate (thiếu biến bắt buộc thì fail sớm).

## 5. Quy ước đặt tên (định danh tiếng Anh)

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Biến, hàm | `camelCase` | `roomList`, `calculateInvoiceTotal()` |
| Class, Type, Interface, Component React | `PascalCase` | `RoomCard`, `InvoiceItem` |
| Hằng số, biến môi trường | `UPPER_SNAKE_CASE` | `MAX_ROOMS_PER_PROPERTY` |
| File TS/logic | `kebab-case` | `create-invoice.ts` |
| File Component React | `PascalCase` | `RoomCard.tsx` |
| Bảng/cột DB (Supabase) | `snake_case` (bảng số nhiều) | bảng `rooms`, cột `property_id` |
| Route API/URL | `kebab-case` số nhiều | `/chu-tro/quan-ly-phong` |
| Nhánh Git | `<type>/<mô-tả-ngắn>` | `feature/utility-reading` |

- Boolean có tiền tố `is/has/can/should`: `isSeller`, `hasActiveContract`.
- Hàm bắt đầu bằng động từ: `getRoomById`, `createInvoice`, `markInvoicePaid`.
- Tránh viết tắt khó hiểu: `occupancy` không `occ` (ngoại lệ: `id`, `url`, `qr`).
- Comment/commit có thể tiếng Việt; **tên định danh luôn tiếng Anh**.

## 6. Async & transaction
- Luôn `await` các call trả Promise (query Supabase); bọc `try/catch`. Không trộn `.then()` với `async/await` trong cùng hàm.
- **Nhóm thao tác đa bảng phải atomic.** Với Supabase, luồng như *tạo Contract → đổi Room.status → tạo Notification* nên gói trong **một Postgres function (RPC)** để đảm bảo "hoặc thành công hết, hoặc rollback hết". Không để trạng thái lệch giữa các bảng.
- Ví dụ cần RPC/transaction: tạo hợp đồng; tạo hóa đơn từ nhiều invoice_items; ghi payment + đổi status invoice.

## 7. Xử lý lỗi & validation
- **Validate trước khi ghi**, không tin dữ liệu client. Ví dụ bắt buộc: `utility_readings.current_reading ≥ previous_reading`; `invoice.total = Σ invoice_items.amount`; `rooms.room_code` unique trong property.
- Ném lỗi có ý nghĩa, hiển thị message thân thiện tiếng Việt cho user; **không** lộ lỗi kỹ thuật/stack ra UI.
- Kiểm **ownership** ở mọi thao tác SaaS (RLS lo phần DB; UI cũng không hiển thị dữ liệu người khác).

## 8. Frontend
- **KHÔNG dùng `localStorage`/`sessionStorage` để tự quản auth** — Supabase Auth tự lo session.
- State trong app dùng React state/context. Data fetch qua supabase-js (cân nhắc React Query nếu cần cache).
- Giữ design system prototype: font Be Vietnam Pro, tông trung tính ấm, thao tác chính ≤ 3 chạm, banner "DEMO" khi còn mock.
- Component nhỏ, làm một việc; tách khi quá dài; không lồng quá 3 cấp; không để `console.log`/dead code trong PR.

## 9. Business rules phải tôn trọng (trích, MVP)

| BR | Nội dung |
|---|---|
| BR-002 | Room status: `Available / Deposited / Rented / Hidden` |
| BR-004 | Invoice status: `Unpaid / PartiallyPaid / Paid / Overdue`; quá hạn → Overdue |
| BR-005 | Tin có boost còn hạn xếp trước trong danh sách |
| BR-007 | Dữ liệu SaaS riêng tư tuyệt đối giữa các Seller |
| BR-012 | Dashboard: "Phòng trống" luôn hiện; "Tổng phòng"/"Đang thuê" **mặc định ẩn**, có toggle |
| BR-014 | Guest thấy SĐT che một phần; đăng nhập mới thấy đủ |
| BR-015 | Hết hạn gói → module SaaS chuyển READ_ONLY, **không mất dữ liệu** |
| AS-002 | Nền tảng KHÔNG giữ tiền thuê; hóa đơn kèm STK + VietQR; chủ tự bấm "Đã thu" |

## 10. Git & PR
- Nhánh `main` (ổn định), `develop` (tích hợp); nhánh làm việc `feature/…`, `fix/…`, `chore/…` tách từ `develop`. Không commit thẳng `main`/`develop`.
- Commit theo **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- PR nhỏ, một mục tiêu; mô tả thay đổi + cách test.

## 11. Cấm tuyệt đối
- ❌ Hardcode secret / anon key trong code.
- ❌ Đặt `service_role` key ở frontend.
- ❌ Dùng từ "Tenant".
- ❌ Cho `marketplace` và `workspace` import chéo table.
- ❌ Tự thêm tính năng ngoài PRD mà không hỏi.
- ❌ Mock cứng dữ liệu trong component khi đã có bảng thật (MVP phải chạy dữ liệu thật).
