import { test, expect } from "@playwright/test";
import { ACCOUNTS, go, login } from "./helpers";

test("dashboard Admin có thứ bậc rõ, đủ lối tắt và không tràn ở mobile/tablet", async ({ page }) => {
  await login(page, ACCOUNTS.admin);
  await go(page, "/quan-tri");

  await expect(page.getByTestId("admin-dashboard-welcome")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tổng quan quản trị" })).toBeVisible();
  await expect(page.getByTestId("admin-dashboard-primary-action")).toBeVisible();
  await expect(page.getByTestId("admin-kpi-pending_listings")).toBeVisible();
  await expect(page.getByTestId("admin-kpi-active_listings")).toBeVisible();
  await expect(page.getByTestId("admin-kpi-reported_reviews")).toBeVisible();
  await expect(page.getByTestId("admin-kpi-total_users")).toBeVisible();
  await expect(page.getByTestId("admin-quick-kiem-duyet-tin")).toBeVisible();
  await expect(page.getByTestId("admin-quick-danh-gia")).toBeVisible();
  await expect(page.getByTestId("admin-quick-cai-dat")).toBeVisible();

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByTestId("admin-dashboard")).toBeVisible();
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow, `dashboard bị tràn ngang ở ${width}px`).toBe(false);
    if (width < 768) {
      await expect(page.getByTestId("admin-mobile-nav")).toBeVisible();
      await expect(page.getByTestId("admin-signout")).toBeVisible();
    } else {
      await expect(page.getByTestId("admin-sidebar")).toBeVisible();
      await expect(page.getByTestId("admin-nav-dashboard")).toHaveAttribute("aria-current", "page");
    }
  }
});
