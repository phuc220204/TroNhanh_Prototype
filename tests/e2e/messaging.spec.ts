import { test, expect, type Browser, type Page } from "@playwright/test";
import { ACCOUNTS, go, login, runTag } from "./helpers";

/**
 * Nhắn tin in-app — spec DUY NHẤT cần **hai browser context**.
 *
 * Một context = một phiên đăng nhập độc lập. Không thể mô phỏng bằng một page:
 * điều cần chứng minh là tin nhắn của A **tới được máy của B**, mà cả hai phía
 * đều nằm sau RLS `conversations`/`messages` — chỉ hai participant đọc được.
 * Cùng một context thì chỉ chứng minh được "state trong React đúng".
 *
 * Kèm BR-030 (không nhắn tin cho tin của chính mình) và BR-019 (mở lại đúng một
 * cuộc trò chuyện thay vì tạo thread mới mỗi lần bấm).
 */

/** Mở một context riêng, đăng nhập, trả về page. */
async function newSession(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext({ locale: "vi-VN" });
  const page = await context.newPage();
  await login(page, email);
  return page;
}

test.describe("Nhắn tin", () => {
  test("A gửi thì B nhận được trong hộp thư của mình", async ({ browser }) => {
    const body = `Chào anh, phòng còn trống không? ${runTag("msg")}`;

    // ── Phía A: người thuê, liên hệ một tin đăng bất kỳ ──
    const renter = await newSession(browser, ACCOUNTS.renterA);
    await go(renter, "/tat-ca-phong");
    const card = renter.getByTestId("listing-card").first();
    await expect(card).toBeVisible();
    await card.click();

    await renter.getByTestId("listing-chat-btn").click();
    await expect(renter).toHaveURL(/#\/tin-nhan/);

    await renter.getByTestId("message-input").fill(body);
    await renter.getByTestId("message-send-btn").click();
    await expect(renter.getByText(body)).toBeVisible();

    // ── Phía B: chủ tin đăng, phiên hoàn toàn khác ──
    const seller = await newSession(browser, ACCOUNTS.sellerA);
    await go(seller, "/tin-nhan");

    const thread = seller.getByTestId("conversation-item").first();
    await expect(thread).toBeVisible();
    await thread.click();
    await expect(seller.getByText(body)).toBeVisible();

    await renter.context().close();
    await seller.context().close();
  });

  test("BR-019: bấm liên hệ lần thứ hai dùng lại đúng cuộc trò chuyện cũ", async ({ browser }) => {
    const renter = await newSession(browser, ACCOUNTS.renterA);

    await go(renter, "/tin-nhan");
    const before = await renter.getByTestId("conversation-item").count();

    await go(renter, "/tat-ca-phong");
    await renter.getByTestId("listing-card").first().click();
    await renter.getByTestId("listing-chat-btn").click();
    await expect(renter).toHaveURL(/#\/tin-nhan/);

    await go(renter, "/tin-nhan");
    // NEGATIVE: số thread KHÔNG được tăng. Nếu tăng thì mỗi lần bấm "Gửi tin
    // nhắn" đẻ ra một thread mới, và lịch sử trao đổi bị chia vụn ra nhiều chỗ.
    await expect(renter.getByTestId("conversation-item")).toHaveCount(before);

    await renter.context().close();
  });

  test("NEGATIVE: BR-030 — không nhắn tin được cho tin đăng của chính mình", async ({ browser }) => {
    const seller = await newSession(browser, ACCOUNTS.sellerA);

    await go(seller, "/tai-khoan/tin-cho-thue");
    const row = seller.getByTestId("my-listing-row").first();
    await expect(row).toBeVisible();
    const listingId = await row.getAttribute("data-listing-id");
    expect(listingId).toBeTruthy();

    await go(seller, `/phong/${listingId}`);
    await seller.getByTestId("listing-chat-btn").click();

    // Phải KHÔNG mở được cuộc trò chuyện. Biên thật là `SELF_CONTACT_FORBIDDEN`
    // trong RPC `start_conversation`; ở đây kiểm hệ quả nhìn thấy được.
    await expect(seller).not.toHaveURL(/#\/tin-nhan\/[0-9a-f-]{36}/);

    await seller.context().close();
  });
});
