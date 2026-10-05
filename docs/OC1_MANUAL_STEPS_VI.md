# Các bước cần làm bằng tay để hoàn tất OC1

> **Cập nhật 06/10/2026 — thay thế các bước về biến `VITE_*` của Boost bên dưới.**
> Frontend không còn đọc `VITE_ENABLE_BOOST_CHECKOUT`, `VITE_PAYOS_TEST_MODE`,
> `VITE_PAYOS_TEST_SELLER_ID` (có thể xóa trên Vercel). Trang đăng tin và Quản lý
> tin hỏi Edge Function `payos-boost-packages`; **bật/tắt Boost cho toàn hệ thống
> chỉ bằng secret Supabase `PAYOS_CHECKOUT_ENABLED`** (`true`/khác `true`), không
> cần build lại frontend. Chế độ test (allowlist seller, CORS localhost) đã bị gỡ.
> Link payOS hết hạn sau 15 phút; đơn chưa trả khác gói/giá hoặc quá 10 phút tự
> chuyển `CANCELLED` và được thay bằng đơn mới (tiền trả vào đơn cũ vẫn được ghi nhận).

Cập nhật 29/09/2026. Làm theo thứ tự dưới đây trên đúng Supabase/Vercel đang phục vụ `https://tronhanh.vercel.app/`. Mã đã sửa ở nhánh `codex/fix-oc1-market-ready`; website công khai chưa tự nhận các thay đổi này. Vì migration đã siết quyền ghi DB trước khi frontend mới lên Vercel, tránh tạo/sửa tin trên site live cho tới khi deploy frontend tương thích; các thao tác ghi cũ có thể bị từ chối.

## 1. Chuẩn bị quyền và bản xem trước

1. Mở Supabase Dashboard của dự án hiện tại. Lấy **Project ref** từ Project Settings → General hoặc từ URL dashboard; đối chiếu Project URL với `VITE_SUPABASE_URL` của Vercel. Không gửi khóa `service_role`, mật khẩu database hoặc Google Client Secret qua chat và không commit chúng vào Git.
2. Mở Vercel Dashboard → project `tronhanh` → Settings → Git và ghi lại **Production Branch**. Trên máy hiện tại, nhánh đang sửa là `codex/fix-oc1-market-ready`, remote là `origin`. Chạy `git status --short` và `git diff --check`; mở `git diff` để rà các file đang sửa, mở riêng file chưa được Git theo dõi. Không dùng `git add -A` khi chưa phân biệt file của mình với file người khác. Chỉ stage các thay đổi đã xác nhận thuộc OC1 (`git add -p` cho file đã theo dõi, `git add <đường_dẫn_file>` cho file mới), rồi chạy `git diff --cached --check`, `git diff --cached --stat`, `git commit -m "fix: address OC1 marketplace findings"` và `git push -u origin codex/fix-oc1-market-ready`. Nếu Git báo thiếu quyền hoặc cần xác nhận tài khoản, đăng nhập qua công cụ Git của bạn; không dán token vào terminal/chat. Mở preview deployment rồi kiểm tra Home, tìm kiếm và giao diện đăng nhập/đăng tin; **chưa submit tin** trước khi migration lên DB. Chỉ đưa vào Production Branch sau khi migration bên dưới chạy xong; frontend mới gọi các RPC mới nên thứ tự này quan trọng.
3. Trạng thái ngày 29/09: Supabase CLI đã login/link đúng project; bảy migration OC1/payOS liên quan đã được áp dụng lên remote và có kiểm tra sau push. Máy thiếu Docker/Podman nên chưa chạy được Postgres local/full `db dump`; frontend Vercel chưa được cập nhật. Kiểm tra chỉ-đọc ghi nhận 1 đơn PayOS `PAID` 15 ngày/2.000đ trên tin `Active`, với payment và Boost còn hiệu lực; nhánh trả tiền trước khi duyệt vẫn cần smoke test riêng. Không chạy lại migration cũ; chỉ dùng `migration list` để xác nhận trạng thái.

## 2. Database migration — đã áp dụng đến ngày 29/09/2026

1. Repo đã có `supabase/config.toml`, **không chạy `supabase init` lần nữa**. Project ref chủ dự án cung cấp là `ropzrnlasbkznoxqaqtp`, trùng URL Supabase đang dùng trong app. Trong terminal tại gốc repo, chạy `pnpm exec supabase login`, sau đó `pnpm exec supabase link --project-ref ropzrnlasbkznoxqaqtp`. CLI có thể hỏi mật khẩu database; nhập trực tiếp vào prompt, không ghi vào file/command. Publishable key không thay thế được quyền đăng nhập CLI.
2. Các migration OC1/payOS đã áp dụng gồm năm migration gốc `20260923010000` đến `20260924010000`, cộng `20260929130000_pay_before_listing_approval.sql` (giữ payment Boost chờ moderation) và `20260929140000_fix_utility_reading_upsert.sql` (sửa UPSERT chỉ số điện/nước). Đã áp dụng đủ; không cần chạy push lại. Chỉ chạy `pnpm.cmd exec supabase migration list --linked` để xác nhận.
3. Trước push đã chạy truy vấn **chỉ đọc** dưới đây. Migration thứ hai chỉ đánh dấu `deleted_at`, không xóa vật lý; tin bị ẩn khỏi marketplace. Preview xác nhận đúng 4 bản sao seed và 1 tin Active “Cho thuê Dĩ An”; post-push đã xác minh đủ 4 soft-delete và tin đó ở `PendingApproval`. Nếu thay đổi migration trong tương lai, xem lại phạm vi trước khi áp dụng.

```sql
with ranked as (
  select id, title, seller_id,
         row_number() over (
           partition by title, property_type, price, district, area, address, description
           order by created_at, id
         ) as duplicate_rank
  from public.rental_listings
  where deleted_at is null
    and title in (
      'Studio Full Nội Thất gần ĐH RMIT',
      'Duplex Ban Công View Đẹp, Full Nội Thất',
      'Căn Hộ Mini Full Nội Thất Thủ Đức',
      'Phòng Master Rộng, Có Ban Công Riêng'
    )
)
select title, count(*) filter (where duplicate_rank > 1) as will_soft_delete
from ranked group by title order by title;

select id, title, status
from public.rental_listings
where deleted_at is null and status = 'Active'
  and lower(btrim(title)) = lower('Cho thuê Dĩ An');
```

4. Rà các Boost lịch sử bằng truy vấn **chỉ đọc** dưới đây. Bản cũ có thể đã tạo `payments` với `purpose='Boost'` mà không nhận tiền thật; số liệu tồn tại không phải bằng chứng đã thanh toán. Ngày 27/09 có 6 dòng lịch sử; ghi nhận và **không xóa/sửa** chúng trong migration payOS. Frontend mới không gắn badge/ưu tiên VIP từ chúng.

```sql
select count(*) as boost_payment_rows from public.payments where purpose = 'Boost';
select count(*) as listings_with_future_boost
from public.rental_listings
where deleted_at is null and boost_expire_at > now();
```

5. Trạng thái 27/09/2026: project Free Plan không có backup Dashboard. Chủ dự án xác nhận không cần full backup và cho phép tiếp tục. Supabase CLI `db dump` thất bại vì máy thiếu Docker; thay vào đó đã lưu snapshot JSON giới hạn tại `C:\Users\Admin\Documents\TroNhanh-backup-2026-09-27\pre-migration-affected-rows.json`. Snapshot không phải full backup và không tự khôi phục toàn project.
6. **Đã áp dụng năm migration** bằng `pnpm.cmd exec supabase db push --linked --yes`. CLI báo hoàn tất; cảnh báo duy nhất là không cache được catalog do thiếu Docker, không ảnh hưởng migration. Đã chạy `pnpm.cmd db:types`, `pnpm.cmd typecheck`, `pnpm.cmd typecheck:strict` và `pnpm.cmd test:payos` (6/6 qua). Không dùng `db reset --linked` trên dự án thật.
7. Đã kiểm tra DB sau migration: `auto_approve_listings=false`; bốn dòng seed được xóa mềm; “Cho thuê Dĩ An” ở `PendingApproval`; 6 payment Boost lịch sử còn nguyên; bảng `boost_orders` và cột `boost_payment_verified` đã tồn tại. Checkout cũ đã bị khóa.

## 3. Triển khai Vercel và kiểm tra các luồng chính

1. Trong Vercel → Settings → Environment Variables, đối chiếu `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` của môi trường Production với đúng project Supabase vừa migrate. Chỉ dùng anon/publishable key ở frontend.
2. Merge/đưa commit đã kiểm tra vào Production Branch và chờ deployment thành công; xác nhận URL công khai phục vụ commit mới trong mục Deployments. Nếu thay đổi biến môi trường, tạo deployment mới để build nhận giá trị mới.
3. Ở cửa sổ ẩn danh, kiểm tra: nhập email/password bằng bàn phím; hero truyền vị trí/loại/giá; sort giá đúng; không có map placeholder, banner seed, reviewer selector, KPI giả, nút Boost hoặc lời mời thanh toán giả; mở account/messages tại 320px và search tại 768/946/1024px. **Gate dữ liệu live:** sau khi chờ tải xong, `#/tim-phong` không được đứng vô hạn ở “Đang tìm kiếm...” hoặc báo 0 khi DB còn tin Active. Chạy `select count(*) from public.rental_listings where status = 'Active' and deleted_at is null;` trong SQL Editor rồi so với số kết quả không lọc trên website. Trước deploy ngày 24/09, API công khai trả 25 tin Active nhưng UI cũ vẫn đứng loading/0; sau migration con số có thể đổi. Nếu lệch, kiểm tra Vercel Deployment/Environment Variables và tab Network của trình duyệt trước khi công bố đã xong.
   Kiểm tra đăng ký bằng email thật: nếu production bật xác nhận email, hộp thư phải nhận link xác nhận và người dùng đăng nhập được sau khi bấm link. Không tắt xác nhận email production chỉ để bộ test demo đi qua.
4. Dùng **tài khoản test riêng** tạo một tin hợp lệ, xác nhận tin ở `PendingApproval`; dùng tài khoản moderator duyệt rồi kiểm tra tin lên marketplace. Sửa tiêu đề và xác nhận phone/đơn vị nước/chi phí giữ nguyên. Với tin cũ có cọc dạng chữ (ví dụ “1 tháng tiền phòng”), kiểm tra sửa tiêu đề vẫn giữ điều kiện; bấm **Xóa điều kiện cũ**, lưu và tải lại để chắc chắn điều kiện biến mất. Trong một lần sửa khác, xóa tiền cọc dạng số và bỏ ghim tọa độ, lưu, tải lại trang để xác nhận cả hai giá trị cũ thật sự biến mất (không chỉ trống tạm ở form). Duyệt lại, sau đó thay **một ảnh** và xác nhận tin quay về `PendingApproval`, không còn trong kết quả công khai. Duyệt lại, ẩn tin, sửa nội dung hoặc ảnh khi đang ẩn và xác nhận tin phải vào `PendingApproval` thay vì tự hiện lại; duyệt lần nữa rồi thử ẩn/hiện không sửa nội dung. Kiểm tra Storage không thể ghi đè/xóa trực tiếp một ảnh vẫn đang được tin tham chiếu; ảnh mới tên UUID khác vẫn upload được. Cuối cùng thử modal xóa và xóa tin test. Không chạy toàn bộ E2E có ghi dữ liệu trên production.

## 4. Google OAuth và tên thương hiệu

1. Trong Supabase Dashboard → Authentication → URL Configuration, đặt Site URL là `https://tronhanh.vercel.app/` và cho phép redirect URL này. App dùng hash router; OAuth callback về **origin có dấu `/` cuối**, không thêm `#/...`. Kiểm tra localhost theo cổng dev thực tế nếu cần thử local.
2. Trong Supabase Dashboard → Authentication → Providers → Google, lấy **Callback URL** hiện tại. Trong Google Auth Platform → Clients → OAuth Web client, thêm chính xác URL đó vào Authorized redirect URIs; thêm origin của website vào Authorized JavaScript origins. Trong Branding, đặt tên/logo Trọ Nhanh và làm quy trình xác minh nếu Google yêu cầu.
3. Để màn Google hiện domain thuộc thương hiệu thay vì `*.supabase.co`, cần có tên miền riêng và Supabase **Custom Domain add-on trên gói trả phí**. Trong Supabase Project Settings → General → Custom Domains, tạo subdomain như `auth.<tên_miền_của_bạn>`, cấu hình bản ghi DNS theo Dashboard và chờ xác minh SSL. **Trước khi kích hoạt**, thêm callback `https://auth.<tên_miền_của_bạn>/auth/v1/callback` vào Google OAuth client bên cạnh callback Supabase cũ. Sau khi kích hoạt, thử OAuth từ trang login và kiểm tra quay lại đúng trang ban đầu. Nếu chưa có domain/add-on, TRN-016 vẫn chưa thể coi là hoàn tất; branding Google chỉ cải thiện một phần.

## 5. Thông tin liên hệ thật

1. Xác nhận nhóm thật sự quản lý được hộp thư `tronhanh2026@gmail.com` đang hiển thị ở footer và có người trả lời.
2. Cung cấp tên pháp lý/tên nhóm, số điện thoại và địa chỉ chính thức nếu muốn công bố. Chỉ thay dòng “Thông tin pháp lý, số điện thoại và địa chỉ sẽ được công bố...” trong `src/marketplace/pages/HomePage/HomeSupportSections.tsx` khi đã xác minh; không tự điền lại số tổng đài/địa chỉ mẫu.
3. Kiểm tra lại footer trên production: liên kết thật, năm hiện tại, email gửi được; xác nhận nội dung phù hợp tài liệu nộp OC1.

Nguồn hướng dẫn chính thức: [Supabase migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Supabase CLI workflow](https://supabase.com/docs/guides/local-development/cli-workflows), [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google), [Supabase custom domains](https://supabase.com/docs/guides/platform/custom-domains), [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [Vercel Git deployments](https://vercel.com/docs/git).

## 6. Hoàn thiện và xác minh payOS trước khi bật Boost

Boost vẫn đang tắt vì chưa xác nhận webhook và giao dịch thật. Ngày 27/09/2026 đã áp dụng năm migration, deploy đủ bốn Edge Functions (`ACTIVE`), thêm đủ bảy secrets và đổi giá test sang 1.000/2.000/5.000đ. Giá trị checkout đang `false`, test mode `true`; endpoint checkout trả `PAYMENT_NOT_AVAILABLE` như kỳ vọng. Lệnh deploy (không cần Docker) để tham khảo/redeploy:

```powershell
pnpm.cmd exec supabase functions deploy payos-boost-packages --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-create-checkout --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-check-status --no-verify-jwt --use-api
pnpm.cmd exec supabase functions deploy payos-webhook --no-verify-jwt --use-api
```

Đã hoàn tất ngày 27/09/2026: chủ dự án đăng nhập PayOS và đăng ký webhook `https://ropzrnlasbkznoxqaqtp.supabase.co/functions/v1/payos-webhook`. PayOS trả `code=00`, lưu đúng URL trên kênh “Test Trọ Nhanh” và chấp nhận payload mẫu; webhook đã xác minh chữ ký, trả 2xx, không tạo đơn hay payment. Không gửi ba khóa PayOS qua chat/Git/frontend.

Frontend Vercel chưa được deploy. Trên Vercel Production cần để `VITE_ENABLE_BOOST_CHECKOUT=false`, `VITE_PAYOS_TEST_MODE=true`, `VITE_PAYOS_TEST_SELLER_ID=<cùng UUID với PAYOS_TEST_SELLER_ID>`. Cần đưa code hiện tại vào Production Branch rồi deploy; `.env` local không ảnh hưởng site live.

Webhook mẫu đã qua; frontend Vercel vẫn chưa deploy. Chỉ sau khi code mới được deploy với checkout UI vẫn tắt và UID test đúng mới bật backend `PAYOS_CHECKOUT_ENABLED=true` cùng frontend `VITE_ENABLE_BOOST_CHECKOUT=true` để chạy đúng một giao dịch có giám sát cho UID seller test. payOS không có sandbox; đây là giao dịch tiền thật. Sau đối soát, tắt hai cờ checkout, giữ hai biến test mode là `true`, xóa hai biến UID test, khôi phục giá `20.000/35.000/60.000đ` và tạo deployment Vercel mới. Chưa mở checkout công khai; cần chủ dự án duyệt riêng.
