import { test, expect } from "@playwright/test";
import { ACCOUNTS, go, login, runTag } from "./helpers";

/**
 * Tin nhu cầu — cả hai loại `RoomWanted` và `RoommateWanted`.
 *
 * Điều thực sự cần chứng minh ở đây KHÔNG phải "form submit chạy được", mà là
 * **card hiển thị dữ liệu người dùng vừa nhập**. Bản T22 từng render một danh
 * sách chuỗi cứng cho mọi tin, nên tin nào cũng "gần ĐH Bách Khoa, ngân sách
 * 3–5 triệu". Form vẫn chạy, submit vẫn thành công, và không có gì báo sai.
 * Vì vậy mỗi test dưới đây đăng bằng giá trị KHÁC mặc định rồi assert đúng giá
 * trị đó xuất hiện.
 */

/** Chuỗi cứng của bản T22 cũ. Còn hit nào = mock quay lại. */
const HARDCODED_STRINGS = [
  "ĐH Bách Khoa",
  "Vạn Hạnh Mall",
  "Nguyễn Văn A",
  "Trần Thị B",
  "3 - 5 triệu",
  "Sinh viên năm 2",
  "Gần trường",
];

test.describe("Tin nhu cầu", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ACCOUNTS.renterA);
  });

  test("đăng RoomWanted — card hiện đúng quận và ngân sách đã nhập", async ({ page }) => {
    const title = `Cần phòng khu Bình Thạnh ${runTag("nc")}`;

    await go(page, "/dang-tin-nhu-cau");
    await page.getByTestId("demand-kind-room-wanted").click();
    await page.getByTestId("demand-title-input").fill(title);
    // Quận CỐ Ý không phải mặc định của form, để phân biệt "hiện dữ liệu thật"
    // với "hiện giá trị khởi tạo".
    await page.getByTestId("demand-district-chip").filter({ hasText: "Bình Thạnh" }).click();
    await page.getByTestId("demand-description-input").fill("Tin do bộ test E2E tạo.");
    await page.getByTestId("demand-submit-btn").click();

    await go(page, "/tin-nhu-cau");
    const card = page.getByTestId("demand-post-card").filter({ hasText: title });
    await expect(card).toHaveCount(1);
    await expect(card.getByTestId("demand-kind-badge")).toHaveText("Tìm phòng");
    await expect(card).toContainText("Bình Thạnh");
  });

  test("đăng RoommateWanted — badge và số người là dữ liệu thật", async ({ page }) => {
    const title = `Tìm bạn ở ghép ${runTag("og")}`;

    await go(page, "/dang-tin-nhu-cau");
    await page.getByTestId("demand-kind-roommate-wanted").click();
    await page.getByTestId("demand-title-input").fill(title);
    await page.getByTestId("demand-district-chip").filter({ hasText: "Quận 3" }).click();
    await page.getByTestId("demand-description-input").fill("Tin ở ghép do bộ test E2E tạo.");
    await page.getByTestId("demand-submit-btn").click();

    await go(page, "/tin-nhu-cau");
    const card = page.getByTestId("demand-post-card").filter({ hasText: title });
    await expect(card).toHaveCount(1);
    // Hai loại tin phải hiện KHÁC nhau — cùng badge nghĩa là `kind` bị bỏ qua.
    await expect(card.getByTestId("demand-kind-badge")).toHaveText("Ở ghép");
    await expect(card).toContainText("Cần");
  });

  test("NEGATIVE: không còn chuỗi hardcode nào của bản mock cũ", async ({ page }) => {
    await go(page, "/tin-nhu-cau");
    const list = page.getByTestId("demand-post-card");
    await expect(list.first()).toBeVisible();

    const text = await list.allTextContents().then((parts) => parts.join("\n"));
    for (const needle of HARDCODED_STRINGS) {
      expect(text, `Chuỗi mock "${needle}" đã quay lại danh sách tin nhu cầu`).not.toContain(needle);
    }
  });

  test("NEGATIVE: BR-030 — không hiện nút liên hệ trên tin của chính mình", async ({ page }) => {
    const title = `Tin của chính tôi ${runTag("self")}`;

    await go(page, "/dang-tin-nhu-cau");
    await page.getByTestId("demand-kind-room-wanted").click();
    await page.getByTestId("demand-title-input").fill(title);
    await page.getByTestId("demand-district-chip").filter({ hasText: "Quận 7" }).click();
    await page.getByTestId("demand-submit-btn").click();

    await go(page, "/tin-nhu-cau");
    const mine = page.getByTestId("demand-post-card").filter({ hasText: title });
    await expect(mine).toHaveCount(1);
    await expect(mine.getByTestId("demand-contact-btn")).toHaveCount(0);
  });
});
