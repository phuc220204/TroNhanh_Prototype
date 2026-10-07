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
 * Ngoại lệ ở gốc: link payOS của đơn Boost tạo TRƯỚC khi đổi `returnUrl` vẫn
 * quay về `/?boost=…`. Đưa thẳng về trang quản lý tin — nơi chủ tin vừa bấm
 * thanh toán — thay vì để rơi ở trang chủ. Nhánh OAuth (`/?code=…`) không có
 * `boost` nên không bị đụng.
 *
 * PHẢI là import đầu tiên trong `main.tsx` — router đọc URL ngay khi module
 * `routes` được nạp.
 */
const BOOST_RETURN_PATH = "/tai-khoan/tin-cho-thue";

const { pathname, search, hash } = window.location;
const isRoot = pathname === "/" || pathname === "/index.html";
const boostResult = new URLSearchParams(search).get("boost");

if (isRoot && !hash && (boostResult === "return" || boostResult === "cancel")) {
  window.history.replaceState(null, "", `/#${BOOST_RETURN_PATH}${search}`);
} else if (!isRoot && !hash) {
  window.history.replaceState(null, "", `/#${pathname}${search}`);
}

export {};
