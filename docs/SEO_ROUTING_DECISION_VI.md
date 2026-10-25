# SEO: có nên chuyển hash router (`/#/...`) sang browser router (`/...`)?

Cập nhật: 16/10/2026 · Trạng thái: **chờ chủ dự án quyết**

## Hiện trạng (sau PR này)

- `index.html`: đã bỏ `noindex, nofollow`; có `canonical`, Open Graph, Twitter card và ảnh `public/brand/og-image.png` (1200×630).
- Đã thêm `public/robots.txt` và `public/sitemap.xml`. Sitemap chỉ có trang gốc.
- **Giới hạn còn lại:** app dùng `createHashRouter`. Với Google, Zalo và Facebook, mọi đường dẫn `/#/phong/abc`, `/#/tin-nhu-cau`, `/#/bang-gia` đều là **một URL duy nhất `/`**. Phần sau `#` không được gửi lên máy chủ và không được index riêng. Hệ quả:
  - Google chỉ biết trang chủ; không có trang tin cho thuê nào xuất hiện trên kết quả tìm kiếm.
  - Chia sẻ link một phòng lên Zalo/Facebook hiện thẻ chung của trang chủ, không có ảnh, tiêu đề hay giá của phòng.

## Chuyển sang browser router tốn bao nhiêu?

Kiểm trên `main` ngày 16/10/2026:

| Hạng mục | Hiện trạng | Việc phải làm |
|---|---|---|
| Rewrite trên Vercel | `vercel.json` đã rewrite mọi đường dẫn về `index.html` | Không cần làm gì |
| Return URL của payOS (Boost, gói, đẩy tin nhu cầu) | **Đã** là đường dẫn thường (`/tai-khoan/tin-cho-thue?boost=…`, `/chu-tro/goi-dich-vu?saas=…`) | Không cần làm gì; `path-to-hash-redirect.ts` hết vai trò |
| Google OAuth | `redirectTo = origin + "/"`, PKCE đọc `?code` | Không đổi |
| Quên mật khẩu (#20) | Quay về `/?reset=1`, rồi `path-to-hash` thêm `#/dat-lai-mat-khau` | Đổi thành `redirectTo = /dat-lai-mat-khau` trực tiếp |
| Link cũ đã chia sẻ hoặc bookmark `/#/phong/x` | Đang chạy | **Bắt buộc** đảo `path-to-hash-redirect.ts` thành *hash → path* (`/#/x` → `/x`) để link cũ không chết |
| `href="#/…"` viết tay | 1 chỗ trên `main` (`ModerationRow.tsx`), thêm ở các PR đang mở: #18 (`LegalConsentCheckbox`), #19 (`ReportModerationPage`), #21 (`PricingPage`), #22 (`RouteErrorScreen`) | Đổi sang `<Link>` hoặc đường dẫn thường |
| E2E | 7 chỗ dùng `/#/` trong `tests/` | Đổi URL |
| Supabase Auth → Redirect URLs | `https://tronhanh.vercel.app/` | Thêm `https://tronhanh.vercel.app/**` (và `http://localhost:5173/**`) trên Dashboard |

**Ước lượng:** 1 PR khoảng 15–20 file, rủi ro **trung bình**. Phần dễ vỡ nhất là ba luồng đi qua redirect (Google OAuth, quên mật khẩu, quay về từ payOS). Cả ba đều kiểm được trên localhost và bản preview.

## Lợi ích theo từng mức

| Mức | Làm gì | Google | Zalo/Facebook khi chia sẻ link phòng |
|---|---|---|---|
| 0 — đã xong (PR này) | Bỏ noindex + OG chung | Index trang chủ | Thẻ chung có logo |
| 1 — browser router | Chuyển router + `document.title` theo trang + sitemap tĩnh có `/tim-phong`, `/tin-nhu-cau`, `/bang-gia` | Google chạy JS nên **index được từng trang**, kể cả `/phong/:id` khi có trong sitemap | Vẫn là thẻ chung: bot Zalo/Facebook **không chạy JS** |
| 2 — preview từng tin | Vercel Edge Middleware cho `/phong/:id`: đọc `public_rental_listings` bằng anon key (view đã allow-list cột, không có SĐT) rồi chèn `og:title`, `og:image`, giá vào HTML. Thêm sitemap động liệt kê tin Active | Tốt hơn (meta có sẵn trong HTML) | **Thẻ có ảnh, tên và giá phòng.** Với chợ phòng trọ, đây là kênh lan truyền chính |

Mức 2 cần mức 1 trước: Middleware không đọc được phần sau `#`.

## Đề xuất

1. **Merge PR này ngay.** Không có rủi ro; chỉ là meta tĩnh và file tĩnh.
2. **Làm mức 1 sau khi các PR #16–#23 đã merge.** Nhiều PR trong số đó sửa đúng các file liên quan đến router và `href="#/…"`; làm trước sẽ xung đột.
3. **Mức 2 làm ngay sau mức 1**, vì chia sẻ link phòng qua Zalo là hành vi chính của người tìm trọ.
4. **Không cần SSR toàn bộ** (Next.js, Remix). Mức 1 + mức 2 đủ cho một marketplace quy mô hiện tại, và giữ nguyên kiến trúc Vite SPA.
