# Báo cáo seed EXE201 — 27/10/2026

## Kết quả

- Production `tronhanh.vercel.app`: tạo **10/10 tin Active**, 50 ảnh WebP. Chạy lần hai **skipped=10**, không tạo trùng.
- Giữ nguyên 46 tin đã tồn tại trước lần chạy (đối chiếu ID và updated_at). Không chạy remove trên production.
- Đã đồng bộ metadata.curfew/costs theo form thật, giữ nguyên ID/ảnh.
- Local riêng cổng 54421: kiểm thử tạo tiếp từ Draft có một ảnh, moderation RPC, filter mã phường/giá, rerun, dry-run và remove hai lần đều pass; các tin ngoài batch không thay đổi.
- Unit tests 7/7, integration lifecycle 1/1, typecheck:seed và production build pass. Build dùng pnpm 10.28.0 tương thích cấu hình pnpm.overrides hiện có; không thay dependency/lockfile của chủ repo.
- Bổ sung cách trình bày ngắn gọn: tiêu đề không có tiền tố, mô tả bỏ hai đoạn cảnh báo dài, giữ nhãn Tin minh họa ở card/chi tiết. Marker dữ liệu và script cleanup không thay đổi. Thay đổi giao diện có hiệu lực sau khi deploy nhánh chứa PR.

## Danh sách tin production

Mỗi tin lần đầu `created`, lần chạy lại `skipped`. Giá là kịch bản minh họa, không phải chào thuê thật.

| Chủ demo | Tin / ID | Giá tháng | Diện tích | Ảnh |
|---|---|---:|---:|---:|
| nguyen.van.a@tronhanh.demo | [[DEMO] Phòng gác sàn gỗ, góc bếp riêng tại Linh Xuân](https://tronhanh.vercel.app/#/phong/aa103571-b007-4771-8cbe-0ff4256e7319) — `aa103571-b007-4771-8cbe-0ff4256e7319` | 2.400.000đ | 20m² | 4 |
| nguyen.van.b@tronhanh.demo | [[DEMO] Phòng sáng thoáng, có gác và bếp tại Hiệp Bình](https://tronhanh.vercel.app/#/phong/f52df026-b195-48c0-829c-81ab9a974fbd) — `f52df026-b195-48c0-829c-81ab9a974fbd` | 2.800.000đ | 22m² | 3 |
| nguyen.van.c@tronhanh.demo | [[DEMO] Phòng gác riêng gọn gàng tại Tam Bình](https://tronhanh.vercel.app/#/phong/071f787f-407a-4860-a59b-e8a5ec0d347f) — `071f787f-407a-4860-a59b-e8a5ec0d347f` | 2.200.000đ | 18m² | 5 |
| nguyen.van.d@tronhanh.demo | [[DEMO] Phòng cửa sổ lớn, góc sinh hoạt tại Long Trường](https://tronhanh.vercel.app/#/phong/e04c55be-2084-449a-bbf2-7b83121abd7a) — `e04c55be-2084-449a-bbf2-7b83121abd7a` | 3.200.000đ | 25m² | 5 |
| nguyen.van.e@tronhanh.demo | [[DEMO] Phòng gác thoáng, bếp gọn tại Tăng Nhơn Phú](https://tronhanh.vercel.app/#/phong/519393d3-3568-4af6-8dbe-25732a4ead2d) — `519393d3-3568-4af6-8dbe-25732a4ead2d` | 2.600.000đ | 23m² | 5 |
| nguyen.van.f@tronhanh.demo | [[DEMO] Căn hộ mini có gác, nội thất gọn tại Linh Xuân](https://tronhanh.vercel.app/#/phong/52385c1d-6788-4833-a89f-e2cfe3611773) — `52385c1d-6788-4833-a89f-e2cfe3611773` | 4.500.000đ | 30m² | 5 |
| nguyen.van.g@tronhanh.demo | [[DEMO] Căn hộ mini sáng, gác ngủ và bếp tại Long Bình](https://tronhanh.vercel.app/#/phong/d07dec13-f62e-493c-8ae7-343bebad81f3) — `d07dec13-f62e-493c-8ae7-343bebad81f3` | 4.100.000đ | 28m² | 5 |
| nguyen.van.h@tronhanh.demo | [[DEMO] Căn hộ mini ấm cúng, có sẵn giường tại Hiệp Bình](https://tronhanh.vercel.app/#/phong/62fdd43c-984f-40a5-a466-dc0ec6ee15df) — `62fdd43c-984f-40a5-a466-dc0ec6ee15df` | 3.800.000đ | 26m² | 5 |
| nguyen.van.i@tronhanh.demo | [[DEMO] Chỗ ở ký túc xá chia sẻ tại Tăng Nhơn Phú](https://tronhanh.vercel.app/#/phong/f439a89a-bc96-41de-b310-9e9530fde28f) — `f439a89a-bc96-41de-b310-9e9530fde28f` | 1.800.000đ | 24m² | 6 |
| nguyen.van.j@tronhanh.demo | [[DEMO] Chỗ ở khoang riêng, bếp chung tại Long Bình](https://tronhanh.vercel.app/#/phong/011010d9-14c5-4846-b13c-c37bbce2bd9b) — `011010d9-14c5-4846-b13c-c37bbce2bd9b` | 1.900.000đ | 30m² | 7 |

## Bảng, bucket và đường ghi

- `rental_listings`, `listing_amenities`, `listing_media`; `profiles`/`user_roles` dùng để đọc và kiểm tra, RPC tạo role Seller/audit theo app.
- RPC: `create_listing_with_details`, `update_listing_with_details`, `submit_draft_listing`, `moderate_listing`, `delete_listing`.
- Bucket `listing-images`; storage_path `{sellerId}/{listingId}/{imageId}.webp`, không lưu URL trong listing_media.
- Không sửa schema/migration, RLS, cấu hình duyệt production, boost/payment hay dữ liệu SaaS.

## File thêm/sửa

- Hai entrypoint `scripts/seedDemoListings.ts`, `scripts/removeDemoListings.ts`; ba module data/runtime/workflow cùng thư mục.
- `seed/demoListings.json`, `seed/images/` (50 WebP), `seed/README.md`, báo cáo này.
- `tests/seed/demo-listings.test.ts`, `tests/seed/demo-listings.integration.test.ts`, `tsconfig.seed.json`.
- `.env.example` thêm tên biến, `package.json` thêm bốn npm scripts. Không có dependency mới hoặc secret trong Git.

## Dọn sau buổi báo cáo

Chạy từ worktree nhánh `feature/demo-rental-listings` với file env đã gitignore:

```sh
npm run seed:demo-listings:remove -- --env-file .env.demo-listings-production.local --dry-run
npm run seed:demo-listings:remove -- --env-file .env.demo-listings-production.local
```

Chỉ dọn batch `exe201-rental-demo-v1` dưới allowlist chủ demo. Giữ file JSON/ảnh fixture và allowlist như lúc seed để kiểm tra ownership và đường dẫn.
