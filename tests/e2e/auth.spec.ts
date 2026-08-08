import { test, expect } from "@playwright/test";
import { ACCOUNTS, DEMO_PASSWORD, go, login, logout, url } from "./helpers";

/**
 * Đăng ký → tự đăng nhập → reload giữ session → đăng xuất, và `?redirect=`.
 *
 * ⚠️ Test "đăng ký" tạo tài khoản THẬT trên Supabase remote. Yêu cầu:
 *   - Email confirmation phải TẮT (Auth → Providers → Email), nếu không
 *     `signUp` không trả session và test đứng ở màn "kiểm tra email".
 *   - Chạy nhiều lần liên tiếp sẽ đụng rate limit của Supabase. Email có gắn
 *     timestamp nên không trùng, nhưng đừng chạy vòng lặp.
 * Dọn tài khoản rác: xem `tests/e2e/README.md`.
 */
test.describe("Xác thực", () => {
  test("đăng ký tạo phiên ngay, reload vẫn còn, đăng xuất thì mất", async ({ page }) => {
    const stamp = Date.now().toString(36);
    const email = `e2e.${stamp}@tronhanh.test`;

    await go(page, "/dang-ky");
    await page.getByTestId("register-fullname").fill("Người Dùng E2E");
    await page.getByTestId("register-phone").fill("0900000000");
    await page.getByTestId("register-email").fill(email);
    await page.getByTestId("register-password").fill(DEMO_PASSWORD);
    await page.getByTestId("register-submit").click();

    const banner = page.getByTestId("register-success");
    await expect(banner).toBeVisible();
    // Phân biệt HAI nhánh thành công: có session thì vào thẳng app, còn phải xác
    // thực email thì đứng lại. Nếu banner nhắc "kiểm tra email" nghĩa là email
    // confirmation đang BẬT — sửa cấu hình Supabase chứ không sửa test.
    await expect(banner).not.toContainText("kiểm tra email");

    // Đăng ký xong phải VÀO ĐƯỢC ứng dụng (RegisterPage tự điều hướng về "/").
    await expect(page.getByTestId("account-menu-trigger")).toBeVisible();

    // Reload: đây là chỗ từng hỏng khi guard dùng `isLoading` đơn độc — cả cây
    // route bị unmount và người dùng bị đá về trang đăng nhập.
    await page.reload();
    await expect(page.getByTestId("account-menu-trigger")).toBeVisible();

    await logout(page);

    // NEGATIVE: sau khi đăng xuất, vào trang cần đăng nhập phải KHÔNG vào được.
    await go(page, "/tai-khoan");
    await expect(page.getByTestId("account-menu-trigger")).toBeHidden();
  });

  test("sai mật khẩu hiện lỗi tiếng Việt và KHÔNG tạo phiên", async ({ page }) => {
    await go(page, "/dang-nhap");
    await page.getByTestId("login-email").fill(ACCOUNTS.renterA);
    await page.getByTestId("login-password").fill("sai-mat-khau-hoan-toan");
    await page.getByTestId("login-submit").click();

    const error = page.getByTestId("login-error");
    await expect(error).toBeVisible();

    // §7: không lộ văn bản kỹ thuật của Supabase ra UI.
    await expect(error).not.toContainText("Invalid login credentials");
    await expect(error).toContainText("mật khẩu");

    // NEGATIVE: không có phiên nào được tạo.
    await expect(page.getByTestId("account-menu-trigger")).toBeHidden();
  });

  test("?redirect= đưa về đúng trang đã yêu cầu sau khi đăng nhập", async ({ page }) => {
    await page.goto(`${url("/dang-nhap")}?redirect=${encodeURIComponent("/yeu-thich")}`);
    await page.getByTestId("login-email").fill(ACCOUNTS.renterA);
    await page.getByTestId("login-password").fill(DEMO_PASSWORD);
    await page.getByTestId("login-submit").click();

    await expect(page).toHaveURL(/#\/yeu-thich/);
  });

  test("NEGATIVE: ?redirect= sang host ngoài bị bỏ qua (open redirect)", async ({ page }) => {
    // `toSafeRedirect()` chỉ chấp nhận đường dẫn nội bộ. Nếu chặn này hỏng thì
    // một link đăng nhập giả mạo đẩy user sang site khác NGAY SAU khi họ vừa gõ
    // mật khẩu — đúng thời điểm nguy hiểm nhất.
    await page.goto(`${url("/dang-nhap")}?redirect=${encodeURIComponent("https://example.com/")}`);
    await login(page, ACCOUNTS.renterA);

    expect(page.url()).toContain("localhost:5173");
    await expect(page).not.toHaveURL(/example\.com/);
  });
});
