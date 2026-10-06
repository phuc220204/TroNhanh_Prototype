/**
 * Chuyển link dạng ĐƯỜNG DẪN sang dạng HASH trước khi router khởi tạo.
 *
 * App dùng `createHashRouter`: route thật là `/#/chu-tro/goi-dich-vu`. Nhưng có
 * link đi vào bằng đường dẫn thường — `returnUrl`/`cancelUrl` của payOS khi mua
 * gói SaaS (`/chu-tro/goi-dich-vu?saas=…`, kể cả link payOS của đơn đã tạo từ
 * trước), hoặc link người dùng tự dán. `vercel.json` rewrite mọi đường dẫn về
 * `index.html`; file này đổi `/chu-tro/x?y` → `/#/chu-tro/x?y` để HashRouter
 * mở đúng trang thay vì trang chủ.
 *
 * Bỏ qua gốc `/`: Supabase OAuth quay về `/?code=…` và phải để nguyên
 * `window.location.search` cho `detectSessionInUrl` (xem `AuthContext.tsx`).
 *
 * PHẢI là import đầu tiên trong `main.tsx` — router đọc URL ngay khi module
 * `routes` được nạp.
 */
const { pathname, search, hash } = window.location;

if (pathname !== "/" && pathname !== "/index.html" && !hash) {
  window.history.replaceState(null, "", `/#${pathname}${search}`);
}

export {};
