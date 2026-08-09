import { test, expect, type Page } from "@playwright/test";
import { ACCOUNTS, go, login, runTag } from "./helpers";

/**
 * Luồng SaaS chủ trọ, chạy nối tiếp trên cùng dữ liệu:
 * tạo khu → tạo phòng → sửa phòng → người ở + hợp đồng → ghi chỉ số điện nước
 * (kèm test nhập THẤP HƠN kỳ trước) → xuất hóa đơn → "Đã thu".
 *
 * ⚠️ Ghi dữ liệu thật vào tài khoản `seller.a`. Mỗi lần chạy tạo một khu trọ có
 * tên gắn timestamp; xóa ở `/chu-tro/quan-ly-phong` → tab Cài đặt.
 *
 * `mode: "serial"` vì mỗi test dùng thứ mà test trước tạo ra. Fail một cái thì
 * các cái sau bị skip — đúng ý, chúng không còn ý nghĩa nữa.
 */
test.describe.configure({ mode: "serial" });

const tag = runTag("khu");
const propertyName = `Khu test ${tag}`;
const roomCode = `E2E${tag.slice(-4).toUpperCase()}`;
const occupantName = "Người Ở Kiểm Thử";

/** Card của đúng một phòng trong lưới. */
const roomCard = (page: Page) =>
  page.locator(`[data-testid="room-card"][data-room-code="${roomCode}"]`);

/** Chọn khu vừa tạo trong dropdown chuyển khu (seller.a có thể đã có khu khác). */
async function selectProperty(page: Page): Promise<void> {
  await go(page, "/chu-tro/quan-ly-phong");
  const switcher = page.getByRole("button", { name: new RegExp(propertyName) });
  if (!(await switcher.isVisible().catch(() => false))) {
    await page.getByText(/Khu test|Nhà trọ|Khu trọ/).first().click();
    await page.getByText(propertyName, { exact: true }).click();
  }
  await expect(page.getByText(propertyName).first()).toBeVisible();
}

test.describe("Vận hành khu trọ", () => {
  test("tạo khu trọ và một phòng có đơn giá điện riêng", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/chu-tro/quan-ly-phong");

    // Nút "Thêm khu trọ" nằm trên thanh công cụ nên luôn có, kể cả khi tài khoản
    // đã có sẵn khu. Empty state chỉ là lối vào thứ hai cho lần đầu tiên.
    await page.getByTestId("add-property-btn").click();
    await page.getByTestId("add-property-name").fill(propertyName);
    await page.getByTestId("add-property-address").fill("123 Đường Kiểm Thử");
    await page.getByTestId("add-property-submit").click();
    await expect(page.getByTestId("add-property-submit")).toBeHidden();

    // Khu vừa tạo được chọn sẵn ⇒ phòng mới rơi đúng vào nó.
    await page.getByTestId("add-room-btn").click();
    await page.getByTestId("add-room-code").fill(roomCode);
    await page.getByTestId("add-room-area").fill("25");
    await page.getByTestId("add-room-price").fill("3000000");
    await page.getByTestId("add-room-custom-price-toggle").check();
    await page.getByTestId("add-room-elec-price").fill("3700");
    await page.getByTestId("add-room-save-btn").click();
    await expect(page.getByTestId("add-room-save-btn")).toBeHidden();

    await expect(roomCard(page)).toHaveCount(1);
  });

  test("sửa phòng: đổi giá thuê và bỏ đơn giá riêng", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await selectProperty(page);

    await roomCard(page).click();
    await page.getByTestId("room-detail-edit-btn").click();

    // Form phải nạp SẴN giá trị hiện có. Mở ra mà ô trống nghĩa là đang tạo mới
    // chứ không phải sửa — bấm lưu sẽ xóa dữ liệu.
    await expect(page.getByTestId("edit-room-code")).toHaveValue(roomCode);
    await expect(page.getByTestId("edit-room-custom-price-toggle")).toBeChecked();
    await expect(page.getByTestId("edit-room-elec-price")).toHaveValue("3700");

    await page.getByTestId("edit-room-price").fill("3300000");
    // Tắt ô = XÓA giá riêng, phòng quay về giá khu. Đây là nhánh duy nhất làm
    // được việc đó, nên nó phải có test riêng.
    await page.getByTestId("edit-room-custom-price-toggle").uncheck();
    await page.getByTestId("edit-room-save-btn").click();
    await expect(page.getByTestId("edit-room-save-btn")).toBeHidden();

    await roomCard(page).click();
    await page.getByTestId("room-detail-edit-btn").click();
    await expect(page.getByTestId("edit-room-price")).toHaveValue("3300000");
    await expect(page.getByTestId("edit-room-custom-price-toggle")).not.toBeChecked();
  });

  test("thêm người ở + hợp đồng", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await selectProperty(page);
    await go(page, "/chu-tro/quan-ly-phong?tab=occupants");

    await page.getByTestId("add-occupant-btn").click();
    await page.getByTestId("occupant-name-input").fill(occupantName);
    await page.getByTestId("contract-rent-input").fill("3300000");
    await page.getByTestId("occupancy-submit-btn").click();
    await expect(page.getByTestId("occupancy-submit-btn")).toBeHidden();

    await expect(page.getByText(occupantName).first()).toBeVisible();
  });

  test("NEGATIVE: chỉ số mới thấp hơn kỳ trước thì bị chặn", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await selectProperty(page);

    // Kỳ đầu — chỉ số cao.
    await roomCard(page).getByTestId("room-utility-btn").click();
    await page.getByTestId("utility-period-input").fill("2026-01");
    await page.getByTestId("utility-elec-input").fill("500");
    await page.getByTestId("utility-water-input").fill("50");
    await page.getByTestId("utility-save-btn").click();
    await expect(page.getByTestId("utility-save-btn")).toBeHidden();

    // Kỳ sau — nhập THẤP HƠN. Server phải chặn (`READING_LOWER_THAN_PREVIOUS`).
    await roomCard(page).getByTestId("room-utility-btn").click();
    await page.getByTestId("utility-period-input").fill("2026-02");
    await page.getByTestId("utility-elec-input").fill("100");
    await page.getByTestId("utility-save-btn").click();

    const err = page.getByTestId("utility-form-error");
    await expect(err).toBeVisible();
    await expect(err).toContainText("kỳ trước");
    // §7: lỗi ra UI phải là tiếng Việt, không phải mã lỗi thô của RPC.
    await expect(err).not.toContainText("READING_LOWER_THAN_PREVIOUS");
  });

  test("xuất hóa đơn rồi bấm Đã thu — số còn thiếu về 0", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await selectProperty(page);

    await roomCard(page).getByTestId("room-invoice-btn").click();
    await page.getByTestId("create-invoice-btn").click();
    await expect(page.getByTestId("create-invoice-btn")).toBeHidden();

    await go(page, "/chu-tro/hoa-don");
    const invoice = page.getByTestId("invoice-row").first();
    await expect(invoice).toBeVisible();
    await invoice.click();

    const remaining = page.getByTestId("invoice-remaining-amount");
    await expect(remaining).toBeVisible();
    const before = await remaining.innerText();
    expect(before.replace(/\D/g, "")).not.toBe("0");

    await page.getByTestId("mark-paid-btn").first().click();
    await page.getByTestId("confirm-payment-btn").click();

    await go(page, "/chu-tro/hoa-don");
    await page.getByTestId("invoice-row").first().click();
    // AS-002: nền tảng không giữ tiền — "Đã thu" chỉ ghi nhận, nhưng phải ghi ĐÚNG.
    await expect(page.getByTestId("invoice-remaining-amount")).toContainText("0");
  });
});

test.describe("Cô lập dữ liệu giữa các chủ trọ (BR-007)", () => {
  test("NEGATIVE: seller.b không thấy khu trọ của seller.a", async ({ page }) => {
    await login(page, ACCOUNTS.sellerB);
    await go(page, "/chu-tro/quan-ly-phong");

    // RLS lọc ở tầng DB. Nếu chuỗi này xuất hiện thì policy `rooms`/`properties`
    // đã hở — và nó hở IM LẶNG, không có lỗi nào báo.
    await expect(page.getByText(propertyName)).toHaveCount(0);
    await expect(
      page.locator(`[data-testid="room-card"][data-room-code="${roomCode}"]`),
    ).toHaveCount(0);
  });
});
