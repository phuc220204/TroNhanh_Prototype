import { test, expect, type Page } from "@playwright/test";
import { ACCOUNTS, go, login, runTag, tinyPng } from "./helpers";

/**
 * Đăng tin đầy đủ 4 bước + upload ảnh thật, rồi kiểm tin xuất hiện ở
 * `/tat-ca-phong` kèm ảnh đã upload. Thêm BR-014 (che SĐT với khách) và BR-005
 * (tin boost xếp trước).
 *
 * ⚠️ Spec này GHI DỮ LIỆU THẬT: mỗi lần chạy tạo 1 tin đăng + 3 ảnh trong
 * Supabase Storage của `seller.a`. Xem cách dọn ở `tests/e2e/README.md`.
 *
 * ⚠️ Kết quả phụ thuộc cấu hình kiểm duyệt: nếu `/quan-tri/cai-dat` đang để
 * **Thủ công**, tin mới ở `PendingApproval` và KHÔNG lên `/tat-ca-phong`. Spec
 * tự kiểm điều kiện đó thay vì fail với thông báo khó hiểu.
 */

/** Điền hết bước 1 → bước 4 và bấm đăng. Trả về tiêu đề tin vừa tạo. */
async function postListing(page: Page, title: string): Promise<string> {
  await go(page, "/chu-tro/dang-tin");

  // ── Bước 1: thông tin cơ bản ──
  // Field của Formik chọn theo `[name]` — hợp đồng của form, không phải style.
  await page.locator('[name="title"]').fill(title);
  await page.locator('[name="address"]').fill("Số 1 Đường Thử Nghiệm, Phường 1");
  await page.locator('[name="area"]').fill("28");
  await page.locator('[name="price"]').fill("3500000");
  await page.locator('[name="phone"]').fill("0912345678");
  await page.getByTestId("listing-next-btn").click();

  // ── Bước 2: mô tả + tiện ích ──
  await page.locator('[name="description"]').fill(
    "Phòng do bộ test E2E tạo ra. Có cửa sổ, wifi, giờ giấc tự do.",
  );
  await page.getByTestId("listing-next-btn").click();

  // ── Bước 3: ảnh — schema yêu cầu TỐI THIỂU 3 ảnh ──
  await page.getByTestId("photo-upload-input").setInputFiles([
    tinyPng("e2e-1.png"),
    tinyPng("e2e-2.png"),
    tinyPng("e2e-3.png"),
  ]);
  await expect(page.getByTestId("photo-item")).toHaveCount(3);
  await page.getByTestId("listing-next-btn").click();

  // ── Bước 4: chi phí ──
  await page.locator('[name="electric"]').fill("3500");
  await page.locator('[name="water"]').fill("100000");
  await page.getByTestId("listing-submit-btn").click();

  // Upload 3 ảnh lên Storage rồi mới gọi RPC ⇒ chờ lâu hơn mặc định.
  await expect(page.getByTestId("listing-success")).toBeVisible({ timeout: 60_000 });
  return title;
}

test.describe("Đăng tin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
  });

  test("đăng tin 4 bước, tin hiện trong danh sách của tôi với ảnh đã upload", async ({ page }) => {
    const title = `Phòng test tự động ${runTag("tin")}`;
    await postListing(page, title);

    // Tin phải nằm trong danh sách tin của chính seller, bất kể chế độ kiểm duyệt.
    await go(page, "/chu-tro/tin-dang");
    const row = page.getByTestId("my-listing-row").filter({ hasText: title });
    await expect(row).toHaveCount(1);

    // Ảnh phải là ảnh ĐÃ UPLOAD lên Supabase Storage, không phải ảnh mặc định.
    const src = await row.locator("img").first().getAttribute("src");
    expect(src).toBeTruthy();
    expect(src).toContain("/storage/v1/object/");

    // Nhánh phụ thuộc cấu hình kiểm duyệt — nêu rõ thay vì fail mù.
    const status = await row.getAttribute("data-listing-status");
    expect(["Active", "PendingApproval"]).toContain(status);

    if (status === "Active") {
      await go(page, "/tat-ca-phong");
      await expect(
        page.getByTestId("listing-card").filter({ hasText: title }),
      ).toHaveCount(1);
    }
  });

  test("NEGATIVE: thiếu ảnh thì không qua được bước 3", async ({ page }) => {
    await go(page, "/chu-tro/dang-tin");
    await page.locator('[name="title"]').fill("Tin thiếu ảnh dùng cho kiểm thử");
    await page.locator('[name="address"]').fill("Số 2 Đường Thử Nghiệm");
    await page.locator('[name="area"]').fill("20");
    await page.locator('[name="price"]').fill("2500000");
    await page.locator('[name="phone"]').fill("0912345678");
    await page.getByTestId("listing-next-btn").click();

    await page.locator('[name="description"]').fill("Mô tả đủ dài cho bước hai đi qua.");
    await page.getByTestId("listing-next-btn").click();

    // Chỉ 2 ảnh — dưới mức tối thiểu 3.
    await page.getByTestId("photo-upload-input").setInputFiles([
      tinyPng("e2e-1.png"),
      tinyPng("e2e-2.png"),
    ]);
    await page.getByTestId("listing-next-btn").click();

    // Vẫn phải đứng ở bước ảnh: nút của bước 4 chưa xuất hiện.
    await expect(page.getByTestId("photo-upload-input")).toBeVisible();
    await expect(page.getByTestId("listing-submit-btn")).toBeHidden();
  });
});

test.describe("Hiển thị công khai", () => {
  test("BR-014: khách chưa đăng nhập chỉ thấy SĐT bị che", async ({ page }) => {
    await go(page, "/tat-ca-phong");
    const cards = page.getByTestId("listing-card");
    // Không có tin nào thì không kiểm được gì — dừng có lý do, không pass giả.
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    await page.getByTestId("listing-phone-btn").click();
    const phone = page.getByTestId("listing-phone-value");
    await expect(phone).toBeVisible();
    await expect(phone).toContainText("****");
  });

  test("BR-014: đăng nhập rồi thì thấy đủ số", async ({ page }) => {
    await login(page, ACCOUNTS.renterA);
    await go(page, "/tat-ca-phong");
    const cards = page.getByTestId("listing-card");
    await expect(cards.first()).toBeVisible();
    await cards.first().click();

    await page.getByTestId("listing-phone-btn").click();
    const phone = page.getByTestId("listing-phone-value");
    await expect(phone).toBeVisible();
    // NEGATIVE của test trước: đã đăng nhập thì KHÔNG còn dấu che.
    await expect(phone).not.toContainText("****");
    await expect(phone).toHaveText(/^0\d{8,10}$/);
  });

  test("BR-005: tin còn hạn boost xếp trước mọi tin thường", async ({ page }) => {
    await go(page, "/tat-ca-phong");
    const cards = page.getByTestId("listing-card");
    await expect(cards.first()).toBeVisible();

    const badges = await cards.evaluateAll((nodes) =>
      nodes.map((n) => n.textContent?.includes("Nổi bật") ?? false),
    );
    const lastBoosted = badges.lastIndexOf(true);
    const firstPlain = badges.indexOf(false);

    // Không có tin boost nào thì luật không có gì để kiểm — bỏ qua, đừng pass giả.
    test.skip(lastBoosted === -1, "Chưa có tin nào đang boost");
    if (firstPlain !== -1) expect(lastBoosted).toBeLessThan(firstPlain);
  });
});
