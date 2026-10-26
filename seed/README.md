# Tin cho thuê demo EXE201

10 tin minh họa, 10 chủ demo, **50 ảnh WebP**. Không phải phòng cho thuê thật. Không dùng để nhận cọc hoặc giao dịch.

## Yêu cầu và cấu hình

- Node.js **22.18+ hoặc 24+** (native TypeScript stripping), dependency hiện có của repo.
- Chạy từ thư mục gốc repo. Script không import Supabase client frontend, không cần build Vite.
- Tạo `.env.demo-listings.local` (đã được gitignore) theo các tên trong `.env.example`. Không gửi hoặc commit key/mật khẩu.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`: cùng một Supabase project đã có đầy đủ migration.
- `DEMO_ACCOUNT_PASSWORD`: mật khẩu hiện tại của các tài khoản demo và admin demo. Script không tạo account hoặc đổi mật khẩu trên production.
- `DEMO_MODERATOR_EMAIL=admin@tronhanh.demo`: phải tồn tại và có role Admin/Moderator nếu tin cần duyệt.
- Chế độ nhiều chủ: đặt `DEMO_LANDLORD_EMAILS` thành allowlist dưới đây. Mỗi tin dùng `landlordEmail` trong JSON; không được thiếu chủ nào trong allowlist.

```dotenv
DEMO_LANDLORD_EMAILS=nguyen.van.a@tronhanh.demo,nguyen.van.b@tronhanh.demo,nguyen.van.c@tronhanh.demo,nguyen.van.d@tronhanh.demo,nguyen.van.e@tronhanh.demo,nguyen.van.f@tronhanh.demo,nguyen.van.g@tronhanh.demo,nguyen.van.h@tronhanh.demo,nguyen.van.i@tronhanh.demo,nguyen.van.j@tronhanh.demo
```

Chế độ một chủ: bỏ trống `DEMO_LANDLORD_EMAILS`, đặt `DEMO_LANDLORD_EMAIL` thành email demo có sẵn; toàn bộ 10 tin dùng chủ đó. Không đổi allowlist/chế độ giữa các lần seed và remove, vì script sẽ từ chối thay đổi chủ của tin đã có.

Profile chủ demo phải có `full_name` và `contact_phone`. Tên và số liên hệ được lấy từ profile, không nằm trong bộ JSON. Nếu thiếu account/profile/liên hệ, script báo lỗi, không tự bịa hoặc ghi đè dữ liệu.

## Cách chạy

```sh
npm run typecheck:seed
npm run test:seed
npm run seed:demo-listings -- --env-file .env.demo-listings.local --dry-run
npm run seed:demo-listings -- --env-file .env.demo-listings.local
# Chạy lại phải báo skipped=10, không thêm tin hoặc ảnh.
npm run seed:demo-listings -- --env-file .env.demo-listings.local
```

Nếu không truyền `--env-file`, script đọc `.env`, biến môi trường process được ưu tiên. Khi truyền file cụ thể, giá trị trong file đó được ưu tiên để không nhầm URL production được kế thừa từ shell. Dry-run vẫn cần URL + anon/service key và đọc account/profile/tin; **không đăng nhập, upload, tạo/sửa/xóa dữ liệu**. Dry-run không yêu cầu mật khẩu.

Mỗi dòng stdout là JSON: `target` cho biết project, `listing` báo `created`, `resumed`, `skipped` hoặc `failed`, cuối cùng là `summary`. Có ID và route của tin thành công. Có ít nhất một tin lỗi thì exit code 1; lỗi một tin không dừng chín tin còn lại. Không log token, password hoặc lỗi thô từ provider.

## Luồng và phạm vi

- Đọc `auth.users` bằng Admin Auth API, `profiles`, `user_roles` để kiểm tra tài khoản.
- Tạo Draft qua `create_listing_with_details`; ID do DB cấp. Sau đó upload ảnh, gọi `update_listing_with_details`, `submit_draft_listing`; nếu cần, admin demo gọi `moderate_listing` cho đúng tin trong batch. Không đổi `platform_settings`.
- Bảng nghiệp vụ: `rental_listings`, `listing_amenities`, `listing_media`; RPC ghi thêm role Seller/audit theo đúng app. Không tạo dữ liệu SaaS, không ghi boost/payment/subscription, không gắn nhãn xác minh.
- Bucket: `listing-images`, đường dẫn `{sellerId}/{listingId}/{imageId}.webp`. DB chỉ giữ `storage_path`; URL được app derive. Image ID suy ra từ checksum ảnh để chạy lại không upload trùng; `upsert: false`.
- Bộ seed nhận diện bằng `metadata.demoSeedSet=exe201-rental-demo-v1`, `metadata.listingKey`, đúng chủ, đúng tiêu đề `[DEMO]` và câu cảnh báo đầu mô tả. Không nhận quyền sở hữu chỉ dựa vào tiền tố `[DEMO]`.
- Draft bị gián đoạn được tiếp tục; tin Active đủ ảnh còn hạn được bỏ qua. Không tự hiện lại tin Hidden/Rejected/Expired/Rented. Có trùng khóa, title collision không marker, ảnh lạ hoặc ownership khác thì báo lỗi, không ghi đè.
- Khóa tiến trình ở thư mục temp, theo URL project, dùng chung cho seed/remove. Không chạy đồng thời từ nhiều máy. Nếu kill cứng để lại lock, kiểm tra tiến trình đã dừng rồi mới xóa file `tronhanh-demo-<hash>.lock`; script không tự phá lock.

## Dọn sau buổi báo cáo

```sh
npm run seed:demo-listings:remove -- --env-file .env.demo-listings.local --dry-run
npm run seed:demo-listings:remove -- --env-file .env.demo-listings.local
```

Chỉ xử lý bộ seed nêu trên và allowlist chủ đã chọn. Gọi `delete_listing` để `Hidden` + `deleted_at`, rồi xóa đúng object ảnh của tin. Giữ `listing_media` làm manifest để lần remove sau thử dọn ảnh lại nếu Storage từng lỗi. Không xóa account/bucket, tin có `[DEMO]` khác hay ảnh ngoài manifest. Ảnh lạ trong thư mục tin khiến cleanup từ chối để người vận hành kiểm tra. Seed sau khi remove tạo một bộ mới, không khôi phục tin đã xóa mềm.

## Kiểm thử tích hợp riêng trên local

Test `tests/seed/demo-listings.integration.test.ts` **chỉ cho phép** `http://127.0.0.1:54421`; không dùng DB local mặc định ở 54321 vì có thể là project khác. Test tự tạo account/profile/role fixture **chỉ trong local test**, dùng mật khẩu từ env và bật duyệt thủ công trong DB test để kiểm tra RPC moderation.

Chuẩn bị một thư mục Supabase riêng ngoài repo, copy `supabase/migrations` và `config.toml`, đổi project ID thành `tronhanh_demo_listings_test`, đổi dải cổng 54320–54329 thành 54420–54429, đặt `db.seed.sql_paths=[]`. Chạy Supabase CLI `start --workdir <thư-mục-test>`. Không link hoặc reset production.

Tạo `.env.demo-listings-test.local` từ thông tin `supabase status --workdir <thư-mục-test>`, thêm allowlist và một mật khẩu fixture local. Sau đó:

```sh
node --env-file=.env.demo-listings-test.local --experimental-strip-types --test tests/seed/demo-listings.integration.test.ts
```

Kiểm tra: dry-run không đổi DB; tiếp tục Draft có một ảnh; 10 tin Active qua RPC, 50 ảnh, ảnh public tải được; bộ lọc mã phường và khoảng giá; seed lại không thêm; remove dry-run không đổi; remove hai lần hết tin/ảnh; tin cũ cùng chủ và tin của chủ khác giữ nguyên.

Muốn xem UI local: chạy seed một lần sau test, đặt Vite URL/anon key của project local và mở trang tìm phòng. Sau khi local đạt mới seed production; không chạy remove production để thử.

## Nguồn ảnh và nội dung

Mỗi tin có `sourcePageUrl`, mỗi ảnh có `sourceUrl`, kích thước, dung lượng và SHA-256 trong JSON. Ảnh tải từ gallery công khai Lozido, không hotlink khi chạy app, không bỏ watermark. Loại ảnh screenshot có thông tin liên hệ, card quảng cáo và collage; giữ ảnh phòng/khu sinh hoạt.

WebP được export cạnh dài tối đa 1600px, quality 82, bỏ metadata EXIF. Không có địa chỉ số nhà hay SĐT nguồn trong JSON. Giá, vị trí phường và nội dung là kịch bản hư cấu có cảnh báo, không thể hiện căn phòng trong ảnh thực sự cho thuê ở địa điểm đó. Chỉ dùng fixture cho demo môn học; không gỡ nhãn DEMO để biến thành tin thật.

Không có schema migration mới. Không đưa service key vào biến `VITE_*`, bundle frontend hoặc Git. Không đăng nhập/ghi dữ liệu production nếu chưa cấu hình env đúng project.
