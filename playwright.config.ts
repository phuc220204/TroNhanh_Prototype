import { defineConfig, devices } from "@playwright/test";

/**
 * Cấu hình E2E — xem `tests/e2e/README.md` trước khi chạy lần đầu.
 *
 * ⚠️ `workers: 1` và `fullyParallel: false` là CỐ Ý, không phải chưa tối ưu.
 * Bảy spec dùng chung 4 tài khoản demo và ghi vào cùng một database remote. Chạy
 * song song thì `moderation.spec` bật "kiểm duyệt Thủ công" trong khi
 * `listing.spec` đang chờ tin của mình lên Active — và spec hỏng vì lý do không
 * nằm trong chính nó. Đó là loại flake tốn nhiều giờ nhất để tìm.
 *
 * ⚠️ Không có `retries`. Retry che flake, mà flake ở đây gần như luôn là bug
 * thật (race giữa React Query và điều hướng). Muốn xem lại thì mở trace.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],

  use: {
    baseURL: "http://localhost:5173",
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 15_000,
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  webServer: {
    command: "pnpm dev",
    port: 5173,
    // Đừng đổi port khỏi 5173: Google Cloud Console khai redirect URI cố định
    // theo port đó, đổi là luồng đăng nhập Google chết.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
