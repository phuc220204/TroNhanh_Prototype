import { test, expect, type Page } from "@playwright/test";

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

async function mockAuthSignup(page: Page) {
  const seen: { signup: Record<string, unknown> | null; update: Record<string, unknown> | null } = {
    signup: null,
    update: null,
  };
  let currentUser: Record<string, unknown> = {};

  await page.route("**/auth/v1/signup*", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    seen.signup = route.request().postDataJSON() as Record<string, unknown>;
    const body = seen.signup;
    const userId = "00000000-0000-4000-8000-000000000001";
    const now = Math.floor(Date.now() / 1000);
    currentUser = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: body.phone ? "phone" : "email", providers: [body.phone ? "phone" : "email"] },
      user_metadata: body.data ?? {},
      created_at: new Date().toISOString(),
      ...(typeof body.email === "string" ? { email: body.email, email_confirmed_at: new Date().toISOString() } : {}),
      ...(typeof body.phone === "string" ? { phone: body.phone, phone_confirmed_at: new Date().toISOString() } : {}),
      identities: [],
      is_anonymous: false,
    };
    const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      aud: "authenticated", role: "authenticated", sub: userId, iat: now, exp: now + 3600,
      ...(typeof body.email === "string" ? { email: body.email } : {}),
      ...(typeof body.phone === "string" ? { phone: body.phone } : {}),
    })}.mock-signature`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: accessToken,
        token_type: "bearer",
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: "mock-refresh-token",
        user: currentUser,
      }),
    });
  });

  await page.route("**/auth/v1/user*", async (route) => {
    if (route.request().method() !== "GET") {
      seen.update = route.request().postDataJSON() as Record<string, unknown>;
      currentUser = { ...currentUser, email: seen.update.email };
      await route.fulfill({ status: 200, json: currentUser });
      return;
    }
    await route.fulfill({ status: 200, json: currentUser });
  });

  await page.route("**/rest/v1/profiles*", async (route) => {
    if (route.request().method() === "PATCH") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, json: [] });
      return;
    }
    await route.continue();
  });

  return seen;
}

async function fillRequiredFields(page: Page) {
  await page.getByTestId("register-fullname").fill("Người dùng thử");
  await page.getByTestId("register-password").fill("demo-password");
}

async function mockPasswordSignin(page: Page) {
  const seen: { credentials: Record<string, unknown> | null } = { credentials: null };
  let user: Record<string, unknown> = {};
  await page.route("**/auth/v1/token*", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    seen.credentials = route.request().postDataJSON() as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    const userId = "00000000-0000-4000-8000-000000000002";
    user = {
      id: userId,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { provider: "email", providers: ["email", "phone"] },
      user_metadata: { full_name: "Tài khoản kiểm thử" },
      created_at: new Date().toISOString(),
      ...(typeof seen.credentials.email === "string" ? { email: seen.credentials.email } : {}),
      ...(typeof seen.credentials.phone === "string" ? { phone: seen.credentials.phone } : {}),
      identities: [],
      is_anonymous: false,
    };
    const accessToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
      aud: "authenticated", role: "authenticated", sub: userId, iat: now, exp: now + 3600,
    })}.mock-signature`;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: "mock-refresh-token",
      user,
    }) });
  });
  await page.route("**/auth/v1/user*", async (route) => route.fulfill({ status: 200, json: user }));
  await page.route("**/rest/v1/profiles*", async (route) => route.fulfill({ status: 200, json: [] }));
  return seen;
}

test.describe("Đăng ký không OTP (Supabase Auth được mock)", () => {
  test("email-only tạo tài khoản bằng email", async ({ page }) => {
    const seen = await mockAuthSignup(page);
    await page.goto("/#/dang-ky");
    await fillRequiredFields(page);
    await page.getByTestId("register-email").fill("email-only@example.test");
    await expect(page.getByTestId("register-otp")).toHaveCount(0);
    await page.getByTestId("register-submit").click();

    await expect.poll(() => seen.signup).not.toBeNull();
    expect(seen.signup?.email).toBe("email-only@example.test");
    expect(seen.signup?.phone).toBeUndefined();
    expect(seen.update).toBeNull();
    await expect(page).toHaveURL(/#\/$/);
  });

  test("phone-only tạo tài khoản bằng SĐT mà không qua màn OTP", async ({ page }) => {
    const seen = await mockAuthSignup(page);
    await page.goto("/#/dang-ky");
    await fillRequiredFields(page);
    await page.getByTestId("register-phone").fill("0912 345 678");
    await expect(page.getByTestId("register-otp")).toHaveCount(0);
    await page.getByTestId("register-submit").click();

    await expect.poll(() => seen.signup).not.toBeNull();
    expect(seen.signup?.phone).toBe("+84912345678");
    expect(seen.signup?.email).toBeUndefined();
    expect(seen.update).toBeNull();
    await expect(page).toHaveURL(/#\/$/);
  });

  test("nhập cả hai sẽ tạo bằng SĐT rồi gắn email", async ({ page }) => {
    const seen = await mockAuthSignup(page);
    await page.goto("/#/dang-ky");
    await fillRequiredFields(page);
    await page.getByTestId("register-phone").fill("0901 234 567");
    await page.getByTestId("register-email").fill("both@example.test");
    await page.getByTestId("register-submit").click();

    await expect.poll(() => seen.update).not.toBeNull();
    expect(seen.signup?.phone).toBe("+84901234567");
    expect(seen.signup?.email).toBeUndefined();
    expect(seen.update?.email).toBe("both@example.test");
    await expect(page).toHaveURL(/#\/$/);
  });

  test("chặn khi thiếu cả email lẫn SĐT", async ({ page }) => {
    const seen = await mockAuthSignup(page);
    await page.goto("/#/dang-ky");
    await fillRequiredFields(page);
    await page.getByTestId("register-submit").click();

    await expect(page.getByTestId("register-error")).toContainText("ít nhất email hoặc số điện thoại");
    expect(seen.signup).toBeNull();
  });

  test("đăng nhập email + mật khẩu và giữ Google", async ({ page }) => {
    const seen = await mockPasswordSignin(page);
    await page.goto("/#/dang-nhap");
    await page.getByTestId("login-identifier").fill("legacy@example.test");
    await page.getByTestId("login-password").fill("demo-password");
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
    await page.getByTestId("login-submit").click();

    await expect.poll(() => seen.credentials).not.toBeNull();
    expect(seen.credentials?.email).toBe("legacy@example.test");
    expect(seen.credentials?.phone).toBeUndefined();
    await expect(page).toHaveURL(/#\/$/);
  });

  test("đăng nhập SĐT + mật khẩu", async ({ page }) => {
    const seen = await mockPasswordSignin(page);
    await page.goto("/#/dang-nhap");
    await page.getByTestId("login-identifier").fill("0912 345 678");
    await page.getByTestId("login-password").fill("demo-password");
    await page.getByTestId("login-submit").click();

    await expect.poll(() => seen.credentials).not.toBeNull();
    expect(seen.credentials?.phone).toBe("+84912345678");
    expect(seen.credentials?.email).toBeUndefined();
    await expect(page).toHaveURL(/#\/$/);
  });
});
