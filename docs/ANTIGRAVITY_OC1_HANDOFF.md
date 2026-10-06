# Bàn giao OC1 cho Antigravity — Trọ Nhanh

> **Cập nhật 06/10/2026 — thay thế các bước về biến `VITE_*` của Boost bên dưới.**
> Frontend không còn đọc `VITE_ENABLE_BOOST_CHECKOUT`, `VITE_PAYOS_TEST_MODE`,
> `VITE_PAYOS_TEST_SELLER_ID` (có thể xóa trên Vercel). Trang đăng tin và Quản lý
> tin hỏi Edge Function `payos-boost-packages`; **bật/tắt Boost cho toàn hệ thống
> chỉ bằng secret Supabase `PAYOS_CHECKOUT_ENABLED`** (`true`/khác `true`), không
> cần build lại frontend. Chế độ test (allowlist seller, CORS localhost) đã bị gỡ.
> Link payOS hết hạn sau 15 phút; đơn chưa trả khác gói/giá hoặc quá 10 phút tự
> chuyển `CANCELLED` và được thay bằng đơn mới (tiền trả vào đơn cũ vẫn được ghi nhận).

Cập nhật: 29/09/2026. Repo: `C:\Users\Admin\Desktop\Tronhanh-prototype\TroNhanh_Prototype`, nhánh `codex/fix-oc1-market-ready`. Báo cáo gốc: `C:\Users\Admin\.codex\attachments\85c854a8-b7fb-45c3-89cb-3f0b590a4b10\Văn bản đã dán.txt`. Goal objective: `C:\Users\Admin\.codex\attachments\95a395dc-9a3c-4cf7-8fbc-f2f52b6bae2b\goal-objective.md`.

## Cập nhật bắt buộc đọc trước — 29/09/2026

Phần này thay thế các câu trạng thái cũ bên dưới nếu có mâu thuẫn.

- **Mã local:** đã có luồng đăng tin 5 bước. Bước 5 cho chọn đăng thường hoặc Boost; khi chọn Boost, tin được lưu và gửi `PendingApproval`, sau đó chuyển sang PayOS ngay. Tin không xuất hiện công khai trước khi moderator duyệt.
- **Xác nhận tiền:** webhook có chữ ký hợp lệ mới tạo một payment. Với tin `PendingApproval`, đơn thành `PAID_PENDING_APPROVAL`: tiền đã nhận nhưng chưa có quyền ưu tiên. Moderator duyệt thì đơn thành `PAID`, thời hạn Boost mới bắt đầu. Từ chối giữ credit để seller sửa/gửi duyệt lại; xóa tin có credit đã trả chuyển đơn sang `NEEDS_REVIEW` để đối soát, không âm thầm hoàn/cho mất tiền.
- **Chống thanh toán nhầm:** mỗi tin chỉ tiếp tục một đơn chưa thanh toán; nếu người dùng đổi số ngày sau khi có đơn mở, backend trả lỗi rõ ràng thay vì cấp link của gói cũ. Chỉ Edge Function với service role gọi được RPC nội bộ. URL quay lại PayOS không được coi là thanh toán thành công.
- **Supabase remote:** đã áp dụng `20260929130000_pay_before_listing_approval.sql` và `20260929140000_fix_utility_reading_upsert.sql`, ngoài năm migration OC1/payOS trước đó. Migration sau sửa lỗi runtime `42P10` ở RPC ghi chỉ số điện/nước vì UPSERT phải khớp partial unique index `deleted_at is null`.
- **PayOS remote:** `payos-create-checkout` đã deploy lại sau bảo vệ package đơn mở. Bốn Edge Functions phải vẫn là `ACTIVE`; kiểm tra bằng `pnpm.cmd exec supabase functions list`. Không lưu hoặc gửi ba khóa PayOS trong Git/chat/frontend. Checkout chỉ được allowlist ở backend khi test mode; giá test server-side đang là `[1000,2000,5000]`.
- **Không có giao dịch thật do assistant tạo.** Kiểm tra remote ngày 29/09 cho thấy một giao dịch test do phía dự án tạo ngày 28/09 đã đạt `PAID` cho tin `Active` (15 ngày/2.000đ), có payment, verified flag và Boost còn hiệu lực. payOS không có sandbox riêng. Nhánh mới trả tiền trước khi duyệt chưa có giao dịch thật; khi test, chỉ tạo một giao dịch có giám sát và đối soát bằng `orderCode`, `boost_orders`, `payments` và moderator approval.

### Còn lại để thật sự market-ready

1. Deploy frontend local mới lên Vercel rồi smoke test live: Home/listing, tìm kiếm, đăng tin, sửa tin và moderation. Bản `https://tronhanh.vercel.app/` quan sát trước đó vẫn là bundle/UI cũ; không được coi là đã nhận các sửa local.
2. Trước khi dùng PayOS trên Vercel, đặt `VITE_ENABLE_BOOST_CHECKOUT`, `VITE_PAYOS_TEST_MODE` và `VITE_PAYOS_TEST_SELLER_ID` trên Vercel; backend cần giữ `PAYOS_TEST_MODE=true` cùng allowlist tương ứng. Không đưa secret PayOS vào `VITE_*`.
3. Chủ dự án tự thực hiện một thanh toán thật nếu muốn test. Sau webhook, moderator phải duyệt đúng tin để xác nhận `PAID_PENDING_APPROVAL → PAID` và bắt đầu Boost. Sau test, tắt checkout, bỏ allowlist và hoàn giá về `[20000,35000,60000]` theo `docs/OC1_PAYOS_INTEGRATION_VI.md`.
4. Các việc ngoài quyền code vẫn mở: cấu hình custom Supabase Auth domain/Google OAuth, cung cấp thông tin liên hệ-pháp lý thật, và xác nhận UX/dữ liệu live sau deploy.

Tài liệu thao tác tay: `docs/OC1_MANUAL_STEPS_VI.md`. Luồng PayOS và checklist đối soát: `docs/OC1_PAYOS_INTEGRATION_VI.md`. Worktree có nhiều thay đổi có sẵn của chủ dự án; không reset, không `git add -A`, chỉ stage diff đã rà soát.

> Cập nhật 01/10/2026: backend Boost đã được mở công khai, giá server-side đã
> khôi phục `[20000,35000,60000]`, test mode/allowlist đã gỡ. Frontend Vercel
> chưa được deploy vì CLI trên máy chưa đăng nhập; xem
> `docs/PAYOS_PUBLIC_LAUNCH_VI.md` trước khi release.

## Mục tiêu và tiến độ

Sửa 22 lỗi TRN-001 đến TRN-022 trong báo cáo OC1 để demo live ổn định và tiến gần mức market-ready. Ước lượng hiện tại: **18/22 mục đã sửa ở mã nguồn (khoảng 82%)**; 4 mục còn phụ thuộc dữ liệu/cấu hình/kiểm thử production. Đây **không phải tỷ lệ đã xác nhận trên URL Vercel**: ngày 27/09 đã áp dụng đủ năm migration Supabase, nhưng frontend hiện tại vẫn chưa được deploy lên Vercel.

**Bằng chứng live (24/09 và kiểm tra lại 28/09/2026):** mở `https://tronhanh.vercel.app/#/` bằng trình duyệt thấy footer vẫn có `1900 123 456`, địa chỉ Bitexco, ©2024, social trỏ homepage chung và câu “100% tin đăng được ... kiểm duyệt”. Lần kiểm tra 28/09, trang chủ cũng hiển thị trạng thái chưa có tin phòng công khai và chưa có nhu cầu. Kiểm tra trước đó ngày 24/09 cho thấy `#/tim-phong?loc=` có nút Bản đồ và đứng ở “Đang tìm kiếm phòng phù hợp...” với 0 phòng. Bundle khi đó là `/assets/index-yFTwEboB.js`, trong khi build hiện tại tạo `/assets/index-C8kFsnoW.js` (hash chỉ là dấu hiệu phiên bản; nội dung UI cũ mới là bằng chứng chính). Truy vấn REST **chỉ đọc** qua anon key đến đúng Supabase URL mà bundle live chứa trả `Content-Range: 0-0/25` cho tin `Active` chưa xóa mềm. Vậy trạng thái 0/loading trên live **không chứng minh database rỗng**; cần deploy rồi smoke test lại. Không công bố bản live hiện tại là đã sửa/đạt demo.

- Đã sửa tại mã: TRN-001..009, TRN-011..012, TRN-014..015, TRN-017..021. TRN-003 được xử lý bằng cách ẩn nút bản đồ placeholder như báo cáo cho phép. TRN-017 có cảnh báo rời form, chưa có autosave qua reload.
- Còn một phần: TRN-010 (đã tắt auto approval mặc định, bỏ claim/badge giả, đưa tin ảnh sai về chờ duyệt trong migration; cần triển khai và smoke test workflow moderation), TRN-013 (đã sửa đề xuất cùng khu vực và viết migration xóa mềm seed trùng; cần chạy migration và kiểm tra dữ liệu thật), TRN-016 (redirect OAuth trong app đã sửa; custom Auth domain, consent branding và redirect URI phải cấu hình trên Supabase/Google), TRN-022 (đã bỏ hotline/địa chỉ giả, năm động; cần chủ dự án cung cấp liên hệ/pháp lý chính thức nếu muốn hiện trên site).

## Bốn mục OC1 còn mở và điều kiện đóng

| Mục | Đã làm trong repo | Chỉ được đánh dấu hoàn thành sau khi |
| --- | --- | --- |
| TRN-010 kiểm duyệt | Tắt auto-approve mặc định; migration đưa tin ảnh sai về chờ duyệt. Đã xác minh `auto_approve_listings=false` và “Cho thuê Dĩ An” ở `PendingApproval` | Deploy frontend; tạo tin mới → PendingApproval, moderator duyệt → Active; sửa nội dung/ảnh → quay lại chờ duyệt; rà ảnh thật |
| TRN-013 dữ liệu trùng/gợi ý | Gợi ý theo khu vực; migration đã soft-delete đúng 4 bản seed dư | Deploy frontend, đối chiếu tin và gợi ý trên live; xác nhận không ảnh hưởng tin thật |
| TRN-016 OAuth branding | Giữ redirect trong app | Có domain thương hiệu và quyền cấu hình Supabase/Google; consent screen/callback mới hiển thị đúng và đăng nhập Google quay về trang trước |
| TRN-022 liên hệ/pháp lý | Bỏ hotline/địa chỉ giả, dùng năm động | Chủ dự án cung cấp và xác minh email, điện thoại, địa chỉ/tên pháp lý thật (nếu công bố); kiểm footer live |

Ngoài bốn mục này, **payOS là hạng mục bổ sung**, không tính vào 18/22: checkout UI, giới hạn seller test, bốn functions, webhook và schema đã có. Năm migration đã áp dụng; bốn functions đều `ACTIVE`; Supabase có đủ 7 secrets. PayOS webhook đã đăng ký, `code=00`, payload mẫu hợp lệ nhận 2xx; không phát sinh boost order/payment. Kill switch `PAYOS_CHECKOUT_ENABLED=false`, frontend `VITE_ENABLE_BOOST_CHECKOUT=false`; frontend chưa deploy Vercel và chưa có giao dịch thật. Giá DB tạm `[1000,2000,5000]`. Market-ready vẫn cần deploy và smoke test toàn bộ mã OC1 trên URL thật; 82% chỉ là mức sửa TRN trong repo, không phải tỷ lệ production đạt chuẩn.

## Các thay đổi quan trọng

- Search/Home: hero và chip đẩy đủ query; trang kết quả khởi tạo từ URL, lọc và sort theo giá/diện tích số; ẩn map placeholder; loading skeleton; responsive tablet. Từ khóa vị trí so cả địa chỉ: dữ liệu live có 2 tin ghi “Quận 7” trong `address` nhưng không ghi trong `title`/`district`, nên chỉ so hai cột cũ sẽ báo sai 0. Khi truy vấn tìm phòng lỗi, UI báo lỗi và có nút thử lại thay vì báo sai 0 phòng; truy vấn có timeout 15 giây để không kẹt spinner vô hạn. Home bỏ KPI và cam kết không có dữ liệu chứng minh.
- Auth: bỏ `AnimatePresence mode=wait` ở `src/routes/Root.tsx` vì nó remount form và làm mất ký tự gõ; test nhập phím đã qua. Login/Register/OAuth giữ redirect nội bộ, chặn URL ngoài.
- Đăng/sửa tin: prefill phone, đơn vị nước; model chi phí chuẩn và formatter legacy; validation client/server; cảnh báo rời form; vị trí chỉ ghim sau thao tác xác nhận và có nút Bỏ ghim. Metadata `coords: null` ngăn tọa độ legacy tự xuất hiện lại sau reload. Form nháp được miễn ràng buộc server đầy đủ.
- Sau rà soát cuối: cập nhật tin giữ metadata cũ, nhất là điều kiện đặt cọc dạng chữ như “1 tháng tiền phòng”; màn chi tiết đọc cả metadata JSONB và dữ liệu legacy trong mô tả. Nếu muốn bỏ điều kiện chữ cũ, form hiện rõ điều kiện và có nút “Xóa điều kiện cũ”/“Hoàn tác”; chỉ để trống ô tiền cọc không làm mất dữ liệu. Logic chi phí đã tách thành utility. E2E chặn RPC ghi bằng mock để kiểm tra cả payload giữ và xóa cọc; vẫn cần smoke test thật trên database test sau migration.
- Luồng đăng tin không còn tự mở màn thanh toán VIP với giá/QR giả rồi boost một tin đang chờ duyệt. Màn thành công dùng thông báo trung tính, không tuyên bố tin đã xuất bản ngay. Sau rà soát, nút và modal Boost giả lập trong quản lý cũng đã gỡ; search không còn ưu tiên `boost_expire_at`, detail/card không gắn badge VIP từ dữ liệu cũ. Migration `20260923110000_disable_unpaid_boost.sql` vô hiệu hóa RPC đã từng tự tạo dòng `payments` giả. Chỉ mở lại Boost khi có xác nhận thanh toán thật ở server.
- Luồng payOS trong repo: quản lý tin có CTA/checkout modal chỉ khi Vite flag bật; packages/checkout yêu cầu seller đã đăng nhập. `PAYOS_TEST_MODE=true` buộc seller UID khớp allowlist backend; `VITE_PAYOS_TEST_MODE=true` + cùng UID chỉ hiện CTA cho seller thử. Thiếu/sai mode sẽ đóng checkout. Bảng gói/giá đọc server-side, đơn/link do Edge Function tạo; callback kiểm tra trạng thái từ server, query URL không là bằng chứng thanh toán. Webhook hợp lệ mới ghi payment và thời hạn Boost. Webhook mẫu đã xác thực; vẫn giữ `PAYOS_CHECKOUT_ENABLED=false` và frontend flag `false` đến khi deploy frontend/UID test được xác minh và sẵn sàng cho đúng một giao dịch thật có giám sát.
- Quản lý/detail: modal xác nhận xóa, chống double click, toast không bị timer cũ tắt sớm; xóa lạc quan có rollback và đọc lại server nếu RPC lỗi. Bỏ KPI giả, badge xác minh giả; chi phí một nguồn dữ liệu; gợi ý cùng khu vực; responsive và cải thiện nhãn accessibility/focus trap. Gallery ảnh và modal số điện thoại đều giữ/trả focus, hỗ trợ Escape; thumbnail điều khiển được bằng bàn phím. Form ảnh đã bỏ lời hứa “tăng 300% liên hệ” thiếu nguồn.
- Gỡ UI demo/reviewer, banner seed và RPC demo; route `#/styleguide` chỉ có trong dev, không đóng gói vào production; thay ghi thẳng DB bằng RPC giới hạn quyền. SQL trong `supabase/migrations/20260923010000_production_security_cleanup.sql` còn chặn việc cấp lại trial nếu bất kỳ gói cũ của cùng tài khoản từng ở trạng thái khác `NONE` (schema cũ cho phép nhiều row); dọn seed trong `20260923090000_cleanup_duplicate_demo_listings.sql`; migration `20260923100000_review_listing_content_edits.sql` bắt tin đã duyệt quay về chờ duyệt khi thay ảnh/tiện ích/nội dung, kể cả khi tin đang ẩn. RPC mới cũng xử lý đúng việc **xóa giá trị tùy chọn** (tiền cọc/điện/nước/dịch vụ, giờ giới nghiêm, mã khu vực, tọa độ) khi client gửi `null`; RPC cũ giữ lại giá trị cũ. Migration này cấm ghi đè file Storage và chỉ cho xóa file không còn được tin chưa xóa mềm tham chiếu; upload ảnh dùng UUID mới, `upsert: false`. Seed reviewer dành cho môi trường test: `supabase/tests/review_fixture.sql`.
- Trigger validation chạy khi `status` đổi sang `PendingApproval`/`Active`; tin Draft/Hidden cũ vẫn ẩn hoặc xóa được dù thiếu trường. Cả năm migration đã chạy thành công trên Postgres Supabase ngày 27/09/2026; post-check xác nhận đúng phạm vi dữ liệu đã preview. CLI chỉ cảnh báo không cache `pg-delta` catalog vì thiếu Docker, không ảnh hưởng migrations.

## Kiểm chứng đã có

- `pnpm typecheck` và `pnpm typecheck:strict` đã qua sau các sửa cuối, gồm thay đổi upload ảnh.
- Kiểm tra lại 28/09/2026: `pnpm.cmd typecheck`, `pnpm.cmd typecheck:strict`, `pnpm.cmd test:payos` (6/6) và `pnpm.cmd build` đều qua. Build báo chunk lớn nhất 536.9 KB; không làm build thất bại. `dist/` đã được khôi phục để không đưa artifact do kiểm tra tạo ra vào thay đổi OC1.
- `pnpm.cmd exec supabase migration list --linked` ngày 28/09 cho thấy cả năm migration OC1/PayOS đã áp dụng trên project được link (local timestamp khớp remote); lệnh chỉ đọc, không push migration.
- `pnpm exec playwright test tests/e2e/oc1-regression.spec.ts --project=chromium`: **18/18 passed** ngày 24/09/2026. Bộ này không ghi dữ liệu; có định dạng chi phí/đặt cọc legacy, payload sửa tiêu đề (mock RPC), ca chủ động xóa điều kiện cọc dạng chữ, ca bỏ ghim + xóa tiền cọc dạng số gửi `null`, quản lý không còn CTA Boost giả lập, xóa tin giả lập RPC lỗi rồi thử lại, nhập phím auth, query filter và Quận 7 qua địa chỉ, sort, lỗi API và nút thử lại, focus gallery/modal điện thoại, redirect, responsive 320/768/946/1024 và account/messages mobile.
- Truy vấn **chỉ đọc** trên Supabase công khai ngày 24/09 xác nhận đúng bốn tiêu đề seed đã biết, mỗi tiêu đề có 2 bản sao trùng đủ các trường trong khóa phân nhóm của migration; dự kiến migration sẽ xóa mềm 4 bản sao. Tin “Cho thuê Dĩ An” hiện đang Active; migration sẽ chuyển về PendingApproval. Dữ liệu này có thể thay đổi trước lúc đẩy migration, nên vẫn phải xem trước ngay lúc triển khai.
- REST công khai cùng project trả 25 tin Active trong lúc UI live tìm kiếm đứng loading/0 phòng; đây là một gate bổ sung sau deploy. Đối chiếu số tin `Active` chưa xóa mềm trong SQL Editor/API với tổng kết quả không lọc trên website, rồi xem lỗi Network nếu lệch. Sau migration số 25 có thể thay đổi; không dùng nó làm expected count cố định.
- Đã thử thêm đúng kiểu truy vấn danh sách mà frontend dùng (tin cùng `listing_amenities` và `listing_media`, sắp theo `created_at`, tối đa 50): HTTP 200, nhận đủ 25 dòng trong khoảng 0,77 giây qua REST công khai. Điều này loại trừ giả thuyết truy vấn dữ liệu nền bị rỗng hoặc treo tại thời điểm kiểm tra; nguyên nhân chính xác trong bundle live cũ chưa được xác định. Sau deploy vẫn phải kiểm tra UI, không suy từ API rằng giao diện đã ổn.
- Cùng lần đọc đó, các trường tiêu đề/địa chỉ/mô tả/giá/diện tích/phone và cặp tọa độ của tin “Cho thuê Dĩ An” đều đạt trigger validation mới; bước chuyển sang PendingApproval không bị chặn bởi dữ liệu đang thấy. Đây chỉ là kiểm tra dữ liệu đọc công khai, chưa thay cho chạy migration.
- Production build đã qua sau sửa tìm kiếm theo địa chỉ (`vite build --outDir C:\Users\Admin\AppData\Local\Temp\tronhanh-oc1-final-build-20260924-14`); bundle không còn chunk `StyleGuidePage` hay `BoostModal`. `dist/` là dữ liệu tracked: build ra thư mục tạm để tránh làm bẩn repo.
- Sau migration: `pnpm.cmd db:types`, `pnpm.cmd typecheck`, `pnpm.cmd typecheck:strict`, production Vite build ra thư mục tạm, `pnpm.cmd test:payos` **6/6**, read-only Playwright E2E **18/18 passed**. Build có cảnh báo chunk 536.9 KB. Smoke test HTTP xác nhận checkout vẫn trả `PAYMENT_NOT_AVAILABLE` và packages chặn request không xác thực. Chưa thử giao dịch thật.
- Chưa chạy toàn bộ E2E có ghi dữ liệu trên production. Chưa xác nhận migration hoạt động trên database production hoặc deploy Vercel mới.

## Việc cần làm tiếp

1. Trạng thái Supabase 27/09, kiểm tra migration list lại 28/09: 5/5 migration đã áp dụng; 4 Edge Functions đều `ACTIVE`; 7 secret names hiện diện. Full backup không được tạo theo yêu cầu của chủ dự án (Free Plan); CLI dump thất bại do thiếu Docker. Đã lưu snapshot giới hạn `C:\Users\Admin\Documents\TroNhanh-backup-2026-09-27\pre-migration-affected-rows.json` ngoài repo. Dữ liệu sau push xác nhận phạm vi preview: 4 soft-delete, 1 tin PendingApproval, 6 Boost payments giữ nguyên, `auto_approve=false`, `boost_orders` và verified column tồn tại. Giá test `[1000,2000,5000]`, checkout tắt.
2. Smoke test thật luồng moderation, create/edit title only/thay ảnh/sửa tin đã ẩn/xóa tiền cọc và ghim tọa độ/delete trên môi trường test sau khi migration lên DB; bộ hồi quy hiện có đã kiểm tra payload bằng mock, không chạy test ghi dữ liệu trên production.
3. Xem diff và `git status`; giữ nguyên tất cả thay đổi đang có, không reset hoặc xóa file của người dùng. Commit/push chỉ khi phù hợp ngữ cảnh hoặc được yêu cầu.
4. Làm theo `docs/OC1_MANUAL_STEPS_VI.md` để đưa thay đổi local vào Production Branch/deploy Vercel, chạy smoke tests thật cho moderation/search và đối chiếu dữ liệu sau migration. Kiểm tra live ngày 28/09 vẫn cho thấy footer placeholder, nên frontend mới chưa được phục vụ. Nhánh hiện tại chưa có upstream; `vercel` CLI và `.vercel/project.json` chưa có trên máy. Không chạy lại migrations đã áp dụng; rà payment/boost lịch sử, không xóa tự động.
5. Cấu hình custom Supabase Auth domain, Google OAuth consent/redirect URI; lấy thông tin liên hệ/pháp lý thật từ chủ dự án. Xem `docs/OC1_DEPLOYMENT_CHECKLIST.md`.
6. PayOS: webhook đã đăng ký và payload mẫu 2xx được xác nhận. Còn lại: deploy frontend, cấu hình Vercel test UID đúng bằng `PAYOS_TEST_SELLER_ID` trong Supabase, kiểm tra kill switch vẫn tắt, rồi chỉ khi sẵn sàng mới chạy đúng một giao dịch thật có giám sát. Sau test khôi phục giá/cờ. Xem `docs/OC1_PAYOS_INTEGRATION_VI.md`.

## Lưu ý kỹ thuật

- Repo dùng PowerShell; `rg.exe` trong WindowsApps lỗi quyền ở phiên trước, có thể dùng `Get-ChildItem | Select-String` nếu lặp lại.
- `CLAUDE.md`: migration mới thay vì sửa migration cũ, không `console.log`, file chạm vào <600 dòng, chạy cả hai typecheck.
- `supabase/migrations/20260923010000_production_security_cleanup.sql` có policy `Public view active listings` với `deleted_at is null`, ngăn API công khai đọc tin đã xóa mềm; chỉ cho owner hiện lại tin từng được duyệt (`approved_at is not null`). Cần kiểm tra SQL trên DB thật.
- Không đưa password, Supabase key hoặc token vào file bàn giao. `tests/e2e/helpers.ts` có tài khoản demo cho test nhưng không nên coi là thông tin production.
