import { test, expect, type Page } from "@playwright/test";
import { ACCOUNTS, go, login, runTag } from "./helpers";

test.describe.configure({ mode: "serial" });

const tag = runTag("saas");
const propertyName = `SaaS ${tag}`;
const roomCode = `S${tag.slice(-5).toUpperCase()}`;
const occupantName = `Khách ${tag}`;

const roomCard = (page: Page) =>
  page.locator(`[data-testid="room-card"][data-room-code="${roomCode}"]`);

async function selectProperty(page: Page, targetName: string): Promise<boolean> {
  const switcher = page.getByTestId("property-switcher");
  await expect(switcher).toBeVisible();
  await switcher.click();
  const option = page.getByTestId("property-option").filter({ hasText: targetName });
  if (!(await option.isVisible().catch(() => false))) return false;
  await option.click();
  await expect(switcher).toContainText(targetName);
  return true;
}

async function bestEffortCleanup(
  page: Page,
  targetPropertyName = propertyName,
  targetOccupantName = occupantName,
): Promise<void> {
  try {
    await go(page, "/chu-tro/quan-ly-phong?tab=occupants");
    if (await selectProperty(page, targetPropertyName)) {
      const occupantRow = page.getByRole("row").filter({ hasText: targetOccupantName });
      const endButton = occupantRow.getByTestId("end-contract-btn");
      if (await endButton.isVisible().catch(() => false)) {
        page.once("dialog", (dialog) => dialog.accept());
        await endButton.click();
        await expect(page.getByTestId("occupancy-toast")).toContainText("Đã kết thúc hợp đồng");
      }
    }
  } catch {
    // Still try to soft-delete the test property if ending the contract failed.
  }

  try {
    await go(page, "/chu-tro/quan-ly-phong?tab=settings");
    if (await selectProperty(page, targetPropertyName)) {
      const deleteButton = page.getByTestId("delete-property-btn");
      if (!(await deleteButton.isVisible().catch(() => false))) return;
      await deleteButton.click();
      await page.getByTestId("confirm-delete-property-btn").click();
      await expect(page.getByTestId("confirm-delete-property-btn")).toBeHidden();
    }
  } catch {
    // Cleanup is deliberately best-effort; the assertions below remain primary.
  }
}

test("tạo phòng, thêm khách, hiện khách trên thẻ phòng, kết thúc HĐ và dọn khu test", async ({ page }) => {
  await login(page, ACCOUNTS.sellerA);

  try {
    await go(page, "/chu-tro/quan-ly-phong");
    await page.getByTestId("add-property-btn").click();
    await page.getByTestId("add-property-name").fill(propertyName);
    await page.getByTestId("add-property-address").fill("Địa chỉ kiểm thử SaaS");
    await page.getByTestId("add-property-submit").click();
    await expect(page.getByTestId("add-property-submit")).toBeHidden();

    await page.getByTestId("add-room-btn").click();
    await page.getByTestId("add-room-code").fill(roomCode);
    await page.getByTestId("add-room-area").fill("22");
    await page.getByTestId("add-room-price").fill("3000000");
    await page.getByTestId("add-room-save-btn").click();
    await expect(page.getByTestId("add-room-save-btn")).toBeHidden();
    await expect(roomCard(page)).toHaveCount(1);

    await go(page, "/chu-tro/quan-ly-phong?tab=occupants");
    expect(await selectProperty(page, propertyName)).toBe(true);
    await page.getByTestId("add-occupant-btn").click();
    await page.getByTestId("occupant-name-input").fill(occupantName);
    await page.getByTestId("contract-rent-input").fill("3000000");
    await page.getByTestId("occupancy-submit-btn").click();
    await expect(page.getByTestId("occupancy-submit-btn")).toBeHidden();
    await expect(page.getByTestId("occupancy-toast")).toContainText("Thêm người ở và tạo hợp đồng thành công");
    await expect(page.getByText(occupantName, { exact: true })).toBeVisible();

    // This cross-check exercises the nested PostgREST relation used by room cards.
    await go(page, "/chu-tro/quan-ly-phong");
    expect(await selectProperty(page, propertyName)).toBe(true);
    await expect(roomCard(page).getByText(occupantName, { exact: false })).toBeVisible();
    await expect(roomCard(page)).toContainText("Đang thuê");

    await go(page, "/chu-tro/quan-ly-phong?tab=occupants");
    expect(await selectProperty(page, propertyName)).toBe(true);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("end-contract-btn").click();
    await expect(page.getByTestId("occupancy-toast")).toContainText("Đã kết thúc hợp đồng thành công");
    await expect(page.getByTestId("end-contract-btn")).toHaveCount(0);

    await go(page, "/chu-tro/quan-ly-phong");
    expect(await selectProperty(page, propertyName)).toBe(true);
    await expect(roomCard(page)).toContainText("Trống");
    await expect(roomCard(page).getByText(occupantName, { exact: false })).toHaveCount(0);
  } finally {
    await bestEffortCleanup(page);
  }
});
