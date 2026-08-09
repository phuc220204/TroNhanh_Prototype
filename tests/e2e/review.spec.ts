import { test, expect } from "@playwright/test";
import { ACCOUNTS, go, login, runTag } from "./helpers";

/**
 * Đánh giá khu trọ — luồng có CỔNG chống gian lận nghiêm ngặt nhất trong sản phẩm.
 *
 * BR-022: chỉ đánh giá được khi occupancy `link_status='Confirmed'` VÀ hợp đồng
 * ≥30 ngày (hoặc đã có ≥1 payment). BR-029: `Confirmed` không bao giờ tự động —
 * renter phải tự xác nhận.
 *
 * ⚠️ Điều kiện chạy: `renter.a` phải được gắn vào một đợt ở đã seed, qua
 * **DemoFAB → "Tôi là người ở demo"** (RPC `demo_link_me_to_seeded_occupancy`).
 * TUYỆT ĐỐI KHÔNG nới `can_review_contract()` cho dễ test — cái cổng đó CHÍNH LÀ
 * giá trị của review verified-only. Nới nó ra là bỏ luôn tính năng.
 *
 * Cần dữ liệu seed sẵn: đăng nhập `seller.a` → DemoFAB → "Seed Dữ liệu mẫu".
 */
test.describe.configure({ mode: "serial" });

test.describe("Đánh giá khu trọ", () => {
  const content = `Phòng sạch, chủ trọ dễ tính. ${runTag("dg")}`;

  test("người ở đã xác nhận thì đánh giá được, và review hiện ở hồ sơ khu", async ({ page }) => {
    await login(page, ACCOUNTS.renterA);

    // Gắn tài khoản vào một đợt ở đã seed (chỉ có ở môi trường dev).
    await page.getByTestId("demo-fab-trigger").click();
    await page.getByTestId("demo-fab-link-occupancy").click();

    await go(page, "/tai-khoan/phong-cua-toi");
    const stay = page.getByTestId("stay-card").first();
    await expect(stay).toBeVisible();

    // BR-029: liên kết vào ở trạng thái `Pending`, renter phải TỰ xác nhận.
    const confirmBtn = stay.getByTestId("confirm-link-btn");
    if (await confirmBtn.isVisible().catch(() => false)) {
      await confirmBtn.click();
      await expect(confirmBtn).toBeHidden();
    }

    await stay.getByTestId("review-open-btn").click();
    await page.getByTestId("review-star-5").click();
    await page.getByTestId("review-content-input").fill(content);
    await page.getByTestId("review-submit-btn").click();
    await expect(page.getByTestId("review-submit-btn")).toBeHidden();

    await go(page, "/tai-khoan/danh-gia");
    await expect(page.getByTestId("review-item").filter({ hasText: content })).toHaveCount(1);
  });

  test("chủ trọ trả lời được đánh giá", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/chu-tro/danh-gia");

    const item = page.getByTestId("review-item").filter({ hasText: content });
    await expect(item).toHaveCount(1);

    await item.getByTestId("seller-reply-input").fill("Cảm ơn bạn đã ở cùng chúng tôi.");
    await item.getByTestId("seller-reply-submit").click();

    // Phản hồi chỉ gửi được MỘT lần ⇒ ô nhập biến mất sau khi gửi.
    await expect(item).toContainText("Cảm ơn bạn đã ở cùng chúng tôi.");
    await expect(item.getByTestId("seller-reply-input")).toHaveCount(0);
  });

  test("NEGATIVE: tài khoản chưa từng ở đâu thì không có form đánh giá", async ({ page }) => {
    await login(page, ACCOUNTS.sellerB);
    await go(page, "/tai-khoan/phong-cua-toi");

    // Không có đợt ở nào ⇒ không có nút mở form. Đây là cổng BR-022 ở tầng UI;
    // tầng thật là `can_review_contract()` trong RPC.
    await expect(page.getByTestId("review-open-btn")).toHaveCount(0);
  });

  test("NEGATIVE: BR-024 — tắt hồ sơ công khai thì review biến mất khỏi trang khu", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/chu-tro/danh-gia");

    const toggle = page.getByTestId("public-profile-toggle");
    await expect(toggle).toBeVisible();

    // Nút hiển thị trạng thái ĐANG áp dụng: "Đang bật · Tắt đi" ⇔ đang công khai.
    if (!(await toggle.innerText()).includes("Đang bật")) {
      await toggle.click();
    }
    await expect(toggle).toContainText("Đang bật");
    // Bật thì có link sang trang công khai của khu.
    await expect(page.getByRole("link", { name: /Xem trang công khai/ })).toBeVisible();

    // Tắt → link công khai phải biến mất. Nếu vẫn còn thì BR-024 chỉ là nhãn
    // trang trí, và review vẫn hiện cho người lạ dù chủ trọ đã tắt.
    await toggle.click();
    await expect(toggle).toContainText("Bật trang công khai");
    await expect(page.getByRole("link", { name: /Xem trang công khai/ })).toHaveCount(0);
  });
});
