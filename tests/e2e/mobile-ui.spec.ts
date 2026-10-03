import { expect, test } from "@playwright/test";
import { go } from "./helpers";

test.describe("UI mobile không ghi dữ liệu", () => {
  test("bộ lọc khu vực không tràn và dùng được ở viewport 320px", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await go(page, "/tin-nhu-cau");

    const viewport = await page.evaluate(() => document.documentElement.clientWidth);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport);

    await page.getByTestId("demand-area-province").click();
    await page.getByTestId("demand-area-province-search").fill("Hồ Chí Minh");
    await page.getByTestId("demand-area-province-option").first().click();
    await page.getByTestId("demand-area-ward").click();
    await expect(page.getByTestId("demand-area-ward-option").first()).toBeVisible();

    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport);
  });

  test("trang nhu cầu giữ bố cục trong viewport 390px và 768px", async ({ page }) => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await go(page, "/tin-nhu-cau");
      await expect(page.getByTestId("demand-area-province")).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });

  test("menu mobile mở/đóng và bộ lọc tìm phòng vẫn hoạt động", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, "/tin-nhu-cau");
    await page.getByTestId("mobile-menu-trigger").click();
    await expect(page.getByTestId("mobile-navigation-menu")).toBeVisible();
    await page.getByTestId("mobile-menu-close").click();
    await expect(page.getByTestId("mobile-navigation-menu")).toHaveCount(0);

    await go(page, "/tim-phong");
    await page.getByTestId("search-mobile-filter-trigger").click();
    await expect(page.getByTestId("search-mobile-filter-sheet")).toBeVisible();
    await page.getByTestId("search-mobile-filter-close").click();
    await expect(page.getByTestId("search-mobile-filter-sheet")).toHaveCount(0);
  });

  test("nút lưu tin có vùng chạm tối thiểu 44×44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await go(page, "/tim-phong");

    const saveButton = page.getByTestId("save-listing-btn").first();
    await expect(saveButton).toBeVisible();
    const bounds = await saveButton.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  });
});
