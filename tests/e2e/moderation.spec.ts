import { test, expect, type Page } from "@playwright/test";
import { ACCOUNTS, go, login, logout, runTag, tinyPng } from "./helpers";

/**
 * Vòng đời kiểm duyệt: bật Thủ công → seller đăng tin → tin KHÔNG lên public →
 * moderator từ chối (không lý do bị chặn, có lý do thì được) → seller gửi lại →
 * moderator duyệt → tin lên public.
 *
 * ⚠️ Spec này ĐỔI CẤU HÌNH TOÀN NỀN TẢNG (`platform_settings.auto_approve`).
 * `afterAll` trả lại "Tự động". Nếu spec chết giữa chừng, kiểm tay ở
 * `/quan-tri/cai-dat` trước khi chạy tiếp — để sót "Thủ công" sẽ làm
 * `listing.spec` rẽ nhánh khác và người đọc kết quả không hiểu vì sao.
 *
 * Đây cũng là lý do `playwright.config.ts` để `workers: 1`.
 */

async function setModeration(page: Page, mode: "auto" | "manual"): Promise<void> {
  await go(page, "/quan-tri/cai-dat");
  const toggle = page.getByTestId("auto-approve-toggle");
  await expect(toggle).toBeVisible();
  // `aria-checked=true` ⇔ đang Thủ công (nút hiển thị chế độ ĐANG áp dụng).
  const wantChecked = mode === "manual" ? "true" : "false";
  if ((await toggle.getAttribute("aria-checked")) !== wantChecked) {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", wantChecked);
  }
}

/** Đăng nhanh một tin hợp lệ, trả về tiêu đề. */
async function postListing(page: Page, title: string): Promise<void> {
  await go(page, "/dang-tin-cho-thue");
  await page.locator('[name="title"]').fill(title);
  await page.locator('[name="address"]').fill("Số 9 Đường Kiểm Duyệt");
  await page.locator('[name="area"]').fill("22");
  await page.locator('[name="price"]').fill("2800000");
  await page.locator('[name="phone"]').fill("0912345678");
  await page.getByTestId("listing-next-btn").click();

  await page.locator('[name="description"]').fill("Tin dùng cho kiểm thử luồng kiểm duyệt.");
  await page.getByTestId("listing-next-btn").click();

  await page.getByTestId("photo-upload-input").setInputFiles([
    tinyPng("m1.png"), tinyPng("m2.png"), tinyPng("m3.png"),
  ]);
  await expect(page.getByTestId("photo-item")).toHaveCount(3);
  await page.getByTestId("listing-next-btn").click();

  await page.locator('[name="electric"]').fill("3500");
  await page.locator('[name="water"]').fill("100000");
  await page.getByTestId("listing-submit-btn").click();
  await expect(page.getByTestId("listing-success")).toBeVisible({ timeout: 60_000 });
}

test.describe.configure({ mode: "serial" });

test.describe("Kiểm duyệt tin đăng", () => {
  const title = `Tin chờ duyệt ${runTag("kd")}`;

  test.afterAll(async ({ browser }) => {
    // Trả cấu hình về mặc định dù test trước đó pass hay fail.
    const page = await browser.newPage();
    await login(page, ACCOUNTS.admin);
    await setModeration(page, "auto");
    await page.close();
  });

  test("bật Thủ công thì tin mới KHÔNG lên trang công khai", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await setModeration(page, "manual");
    await logout(page);

    await login(page, ACCOUNTS.sellerA);
    await postListing(page, title);

    await go(page, "/tai-khoan/tin-cho-thue");
    const row = page.getByTestId("my-listing-row").filter({ hasText: title });
    await expect(row).toHaveAttribute("data-listing-status", "PendingApproval");

    // NEGATIVE: chưa duyệt thì tuyệt đối không được xuất hiện ở marketplace.
    await go(page, "/tat-ca-phong");
    await expect(page.getByTestId("listing-card").filter({ hasText: title })).toHaveCount(0);
  });

  test("từ chối KHÔNG lý do bị chặn; có lý do thì tin về Rejected", async ({ page }) => {
    await login(page, ACCOUNTS.admin);
    await go(page, "/quan-tri/kiem-duyet-tin");

    const row = page.getByTestId("moderation-row").filter({ hasText: title });
    await expect(row).toHaveCount(1);
    await row.getByTestId("moderation-reject-btn").click();

    const confirm = page.getByTestId("moderation-reject-confirm-btn");
    const reason = page.getByTestId("moderation-reason-input");
    await expect(reason).toBeVisible();

    // NEGATIVE: lý do rỗng thì không được từ chối — lý do là thứ seller đọc để
    // biết phải sửa gì, thiếu nó thì tin bị chặn mà không ai giải thích.
    await expect(confirm).toBeDisabled();

    await reason.fill("Ảnh không phải ảnh phòng thật.");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(row).toHaveCount(0);
  });

  test("seller thấy lý do, gửi lại; moderator duyệt thì tin lên public", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");

    const row = page.getByTestId("my-listing-row").filter({ hasText: title });
    await expect(row).toHaveAttribute("data-listing-status", "Rejected");
    await expect(row.getByTestId("listing-rejection-notice")).toContainText("ảnh phòng thật");

    // "Sửa & gửi lại" mở form SỬA (không tự gửi lại). Đi hết 4 bước rồi lưu —
    // BR-003: sửa field quan trọng của tin đưa nó về PendingApproval.
    await row.getByTestId("listing-resubmit-btn").click();
    await expect(page.locator('[name="title"]')).toHaveValue(title);
    await page.getByTestId("listing-next-btn").click();
    await page.locator('[name="description"]').fill("Đã sửa lại theo yêu cầu của kiểm duyệt viên.");
    await page.getByTestId("listing-next-btn").click();
    // Ảnh cũ được nạp sẵn ở chế độ sửa nên bước ảnh đã đủ điều kiện.
    await expect(page.getByTestId("photo-item")).toHaveCount(3);
    await page.getByTestId("listing-next-btn").click();
    await page.getByTestId("listing-submit-btn").click();
    await expect(page.getByTestId("listing-success")).toBeVisible({ timeout: 60_000 });

    await go(page, "/tai-khoan/tin-cho-thue");
    const resubmitted = page.getByTestId("my-listing-row").filter({ hasText: title });
    await expect(resubmitted).toHaveAttribute("data-listing-status", "PendingApproval");
    await logout(page);

    await login(page, ACCOUNTS.admin);
    await go(page, "/quan-tri/kiem-duyet-tin");
    const modRow = page.getByTestId("moderation-row").filter({ hasText: title });
    await expect(modRow).toHaveCount(1);
    await modRow.getByTestId("moderation-approve-btn").click();
    await expect(modRow).toHaveCount(0);
    await logout(page);

    await go(page, "/tat-ca-phong");
    await expect(page.getByTestId("listing-card").filter({ hasText: title })).toHaveCount(1);
  });

  test("NEGATIVE: seller không vào được trang kiểm duyệt", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/quan-tri/kiem-duyet-tin");

    // `RequireRole` render màn 403 tiếng Việt, KHÔNG redirect — redirect làm
    // Moderator thật tưởng mình bị đăng xuất.
    await expect(page.getByTestId("moderation-row")).toHaveCount(0);
    await expect(page.getByText(/không có quyền/i)).toBeVisible();
  });
});
