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
 * Ngoại lệ ở gốc (1): link đặt lại mật khẩu `/?reset=1&code=…` — giữ query,
 * chỉ thêm `#/dat-lai-mat-khau`.
 *
 * Ngoại lệ ở gốc (2): link payOS của đơn Boost tạo TRƯỚC khi đổi `returnUrl` vẫn
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

// `!hash.startsWith("#/")`: link hết hạn có thể quay về kèm `#error=…` — bỏ phần
// đó, trang đặt lại mật khẩu tự báo "link không còn hiệu lực" khi không có phiên.
if (isRoot && !hash.startsWith("#/") && new URLSearchParams(search).get("reset") === "1") {
  // Link "Quên mật khẩu" quay về `/?reset=1&code=…`. GIỮ query (supabase-js cần
  // `code` ở `location.search` để đổi lấy phiên) và chỉ thêm hash để HashRouter
  // mở trang đặt lại mật khẩu. Xem password-reset-service.ts.
  window.history.replaceState(null, "", `/${search}#/dat-lai-mat-khau`);
} else if (isRoot && !hash && (boostResult === "return" || boostResult === "cancel")) {
  window.history.replaceState(null, "", `/#${BOOST_RETURN_PATH}${search}`);
} else if (!isRoot && !hash) {
  window.history.replaceState(null, "", `/#${pathname}${search}`);
}

export {};
