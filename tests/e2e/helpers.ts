import { expect, type Page } from "@playwright/test";

/**
 * Tiện ích dùng chung cho 7 spec.
 *
 * NGUYÊN TẮC CHỌN SELECTOR: codebase có **zero `className`** (§8.1 CLAUDE.md —
 * mọi style là inline object), nên `data-testid` là selector ổn định duy nhất.
 * Ngoại lệ được phép: `[name="..."]` của field Formik — cũng là hợp đồng, không
 * phải style. Tuyệt đối không chọn theo văn bản tiếng Việt cho ĐIỀU KHIỂN
 * (nút/tab): copy đổi thường xuyên hơn testid. Assert theo văn bản thì được —
 * đó chính là thứ ta muốn kiểm.
 */

export const DEMO_PASSWORD = "TroNhanh@2026";

export const ACCOUNTS = {
  /** Seller có dữ liệu nghiệp vụ (khu, phòng, hóa đơn) sau khi seed. */
  sellerA: "seller.a@tronhanh.demo",
  /** Seller thứ hai — tồn tại để chứng minh cô lập RLS (BR-007). */
  sellerB: "seller.b@tronhanh.demo",
  renterA: "renter.a@tronhanh.demo",
  admin: "admin@tronhanh.demo",
} as const;

/**
 * App dùng **hash router** (`createHashRouter`), nên mọi đường dẫn là `/#/...`.
 * Gọi `page.goto("/chu-tro")` sẽ trúng route `*` và bị redirect về `/`.
 */
export function url(path: string): string {
  return `/#${path.startsWith("/") ? path : `/${path}`}`;
}

export async function go(page: Page, path: string): Promise<void> {
  await page.goto(url(path));
}

/**
 * Đăng nhập qua UI thật.
 *
 * Cố ý KHÔNG dùng `storageState` dựng sẵn: session của Supabase có `expires_at`,
 * nên state lưu từ lần chạy trước sẽ hết hạn và spec fail ở một chỗ chẳng liên
 * quan gì tới thứ nó định kiểm. Đi qua form đăng nhập chậm hơn vài giây nhưng
 * mỗi lần chạy đều bắt đầu từ trạng thái xác định.
 */
export async function login(
  page: Page,
  email: string,
  password: string = DEMO_PASSWORD,
): Promise<void> {
  await go(page, "/dang-nhap");
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();

  // Bằng chứng phiên đã được tạo: navbar đổi từ nút "Đăng nhập" sang nút tài khoản.
  // Chờ URL đổi là KHÔNG đủ — điều hướng xảy ra trước khi AuthContext kịp phát.
  await expect(page.getByTestId("account-menu-trigger")).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByTestId("account-menu-trigger").click();
  await page.getByTestId("account-menu-signout").click();
  await expect(page.getByTestId("navbar-login-btn")).toBeVisible();
}

/** `true` nếu đang có phiên đăng nhập (dùng cho assertion negative). */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return page.getByTestId("account-menu-trigger").isVisible();
}

/**
 * Ảnh PNG 1×1 hợp lệ, dựng trong bộ nhớ.
 *
 * Không đọc file từ đĩa: bộ test phải chạy được trên máy vừa clone repo, mà
 * commit ảnh nhị phân vào repo chỉ để test upload là thêm rác vĩnh viễn.
 */
export function tinyPng(name: string) {
  return {
    name,
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  };
}

/** Chuỗi duy nhất cho một lần chạy — để tìm lại đúng bản ghi spec vừa tạo. */
export function runTag(prefix: string): string {
  return `${prefix}-e2e-${Date.now().toString(36)}`;
}
