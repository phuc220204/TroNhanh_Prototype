import { expect, test, type Page } from "@playwright/test";
import { getListingCosts } from "../../src/marketplace/utils/listingCosts";
import { mergeEditedListingMetadata } from "../../src/marketplace/utils/listingMetadata";
import { ACCOUNTS, go, login, url } from "./helpers";

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))).toEqual(await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.clientWidth,
  })));
}

test.describe("Hồi quy OC1 không ghi dữ liệu", () => {
  test("chi phí dùng cột chuẩn và giữ điều kiện đặt cọc dạng chữ của tin cũ", () => {
    expect(getListingCosts({
      description: "Phòng gần trường",
      electricity_price: 3500,
      water_price: 15000,
      water_unit: "cubic",
      service_price: 0,
      deposit: 4500000,
      metadata: { costs: { water: "100000", waterUnit: "person", deposit: "1 tháng tiền phòng" } },
    })).toMatchObject({
      electric: "3.500 đ/kWh",
      water: "15.000 đ/m³",
      service: "0 đ/tháng",
      deposit: "4.500.000 đ",
    });

    expect(getListingCosts({
      description: "Phòng gần trường",
      water_price: null,
      deposit: null,
      metadata: { costs: { water: "15.000", waterUnit: "cubic", deposit: "1 tháng tiền phòng" } },
    })).toMatchObject({
      water: "15.000 đ/m³",
      deposit: "1 tháng tiền phòng",
    });

    const editedMetadata = mergeEditedListingMetadata(
      { costs: { deposit: "1 tháng tiền phòng", other: "Giữ xe miễn phí" } },
      { costs: { water: "15.000", waterUnit: "cubic", deposit: "" } },
      "1 tháng tiền phòng",
    );
    expect(getListingCosts({ description: "Đã sửa tiêu đề", deposit: null, metadata: editedMetadata }))
      .toMatchObject({ deposit: "1 tháng tiền phòng", other: "Giữ xe miễn phí" });
    const clearedMetadata = mergeEditedListingMetadata(
      { costs: { deposit: "1 tháng tiền phòng", other: "Giữ xe miễn phí" } },
      { costs: { deposit: "" } },
      "",
    );
    expect(getListingCosts({ description: "Đã sửa tiêu đề", deposit: null, metadata: clearedMetadata }))
      .toMatchObject({ deposit: "Chưa cập nhật", other: "Giữ xe miễn phí" });
  });

  test("chỉ sửa tiêu đề vẫn giữ phone, nước m³ và đặt cọc cũ", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");
    const row = page.getByTestId("my-listing-row")
      .filter({ hasText: "Studio Full Nội Thất gần ĐH RMIT" }).first();
    await expect(row).toBeVisible();
    const listingId = await row.getAttribute("data-listing-id");
    expect(listingId).toBeTruthy();

    // Chỉ thay response đọc của một tin; mọi thao tác ghi vẫn không được gọi.
    await page.route("**/rest/v1/rental_listings?*", async (route) => {
      const queriedId = new URL(route.request().url()).searchParams.get("id");
      if (queriedId !== `eq.${listingId}`) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const payload = await response.json();
      const listing = Array.isArray(payload) ? payload[0] : payload;
      expect(listing?.title, `Không tải được tin gốc (HTTP ${response.status()})`).toBeTruthy();
      await route.fulfill({ response, json: {
        ...listing,
        contact_phone: "0901234567",
        electricity_price: 3500,
        water_price: 15000,
        water_unit: "cubic",
        deposit: null,
        metadata: {
          ...(listing.metadata ?? {}),
          costs: { deposit: "1 tháng tiền phòng", other: "Giữ xe miễn phí" },
        },
        listing_media: [0, 1, 2].map((sortOrder) => ({
          id: `e2e-media-${sortOrder}`,
          storage_path: `e2e/${listingId}/${sortOrder}.webp`,
          sort_order: sortOrder,
        })),
      } });
    });

    await row.getByRole("button", { name: "Chỉnh sửa" }).click();
    await expect(page.locator("#listing-phone")).toHaveValue("0901234567");
    const updatedTitle = `${await page.locator("#listing-title").inputValue()} cập nhật`;
    await page.locator("#listing-title").fill(updatedTitle);
    await page.getByTestId("listing-next-btn").click();
    await expect(page.locator("#listing-description")).toBeVisible();
    await page.getByTestId("listing-next-btn").click();
    await expect(page.getByTestId("photo-item")).toHaveCount(3);
    await page.getByTestId("listing-next-btn").click();
    await expect(page.getByRole("combobox", { name: "Đơn vị tiền nước" })).toHaveValue("cubic");
    await expect(page.locator("#listing-water")).toHaveValue("15000");
    await expect(page.getByText("Điều kiện đặt cọc cũ đang được giữ: 1 tháng tiền phòng")).toBeVisible();

    let submitted: any;
    await page.route("**/rest/v1/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.continue();
        return;
      }
      if (new URL(route.request().url()).pathname.endsWith("/rpc/update_listing_with_details")) {
        submitted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: "application/json", body: '"PendingApproval"' });
        return;
      }
      await route.abort();
      throw new Error(`Thao tác ghi ngoài dự kiến: ${route.request().url()}`);
    });
    await page.getByTestId("listing-submit-btn").click();
    await expect(page.getByTestId("listing-success")).toBeVisible();
    expect(submitted.p_listing.title).toBe(updatedTitle);
    expect(submitted.p_listing.contact_phone).toBe("0901234567");
    expect(submitted.p_listing.water_price).toBe(15000);
    expect(submitted.p_listing.water_unit).toBe("cubic");
    expect(submitted.p_listing.metadata.costs.deposit).toBe("1 tháng tiền phòng");
    expect(submitted.p_listing.metadata.costs.other).toBe("Giữ xe miễn phí");
  });

  test("người bán có thể chủ động xóa điều kiện đặt cọc dạng chữ của tin cũ", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");
    const row = page.getByTestId("my-listing-row")
      .filter({ hasText: "Studio Full Nội Thất gần ĐH RMIT" }).first();
    await expect(row).toBeVisible();
    const listingId = await row.getAttribute("data-listing-id");
    expect(listingId).toBeTruthy();

    await page.route("**/rest/v1/rental_listings?*", async (route) => {
      const queriedId = new URL(route.request().url()).searchParams.get("id");
      if (queriedId !== `eq.${listingId}`) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const payload = await response.json();
      const listing = Array.isArray(payload) ? payload[0] : payload;
      expect(listing?.title, `Không tải được tin gốc (HTTP ${response.status()})`).toBeTruthy();
      await route.fulfill({ response, json: {
        ...listing,
        contact_phone: "0901234567",
        electricity_price: 3500,
        water_price: 15000,
        water_unit: "cubic",
        deposit: null,
        metadata: { ...(listing.metadata ?? {}), costs: { deposit: "1 tháng tiền phòng" } },
        listing_media: [0, 1, 2].map((sortOrder) => ({
          id: `e2e-media-${sortOrder}`,
          storage_path: `e2e/${listingId}/${sortOrder}.webp`,
          sort_order: sortOrder,
        })),
      } });
    });

    await row.getByRole("button", { name: "Chỉnh sửa" }).click();
    await page.getByTestId("listing-next-btn").click();
    await page.getByTestId("listing-next-btn").click();
    await page.getByTestId("listing-next-btn").click();
    await expect(page.getByText("Điều kiện đặt cọc cũ đang được giữ: 1 tháng tiền phòng")).toBeVisible();
    await page.getByTestId("toggle-legacy-deposit-btn").click();
    await expect(page.getByText("Điều kiện đặt cọc cũ sẽ được xóa khi bạn lưu tin.")).toBeVisible();

    let submitted: any;
    await page.route("**/rest/v1/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.continue();
        return;
      }
      if (new URL(route.request().url()).pathname.endsWith("/rpc/update_listing_with_details")) {
        submitted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: "application/json", body: '"PendingApproval"' });
        return;
      }
      await route.abort();
      throw new Error(`Thao tác ghi ngoài dự kiến: ${route.request().url()}`);
    });
    await page.getByTestId("listing-submit-btn").click();
    await expect(page.getByTestId("listing-success")).toBeVisible();
    expect(submitted.p_listing.deposit).toBeNull();
    expect(submitted.p_listing.metadata.costs.deposit).toBe("");
  });

  test("giao diện quản lý không mời thanh toán Boost giả lập", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");
    await expect(page.getByTestId("my-listing-row").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Đẩy tin VIP" })).toHaveCount(0);
    await expect(page.getByText("Tin VIP nổi bật")).toHaveCount(0);
    await expect(page.getByText("Xác nhận thanh toán (giả lập)")).toHaveCount(0);
  });

  test("xóa tin có xác nhận, hoàn tác khi RPC lỗi và chặn double click", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");
    const row = page.getByTestId("my-listing-row")
      .filter({ hasText: "Studio Full Nội Thất gần ĐH RMIT" }).first();
    await expect(row).toBeVisible();
    const listingId = await row.getAttribute("data-listing-id");
    expect(listingId).toBeTruthy();

    let deleteCalls = 0;
    await page.route("**/rest/v1/rpc/delete_listing", async (route) => {
      deleteCalls += 1;
      expect(route.request().postDataJSON().p_listing_id).toBe(listingId);
      if (deleteCalls === 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({ code: "42501", message: "FORBIDDEN" }),
        });
      } else {
        await route.fulfill({ status: 204 });
      }
    });

    await row.getByRole("button", { name: "Xóa tin" }).click();
    await expect(page.getByRole("heading", { name: "Xác nhận xóa tin" })).toBeVisible();
    await expect(page.getByTestId("confirm-delete-listing")).toBeEnabled();
    await page.getByTestId("confirm-delete-listing").click();
    await expect(page.getByTestId("confirm-delete-listing")).toBeDisabled();
    await expect(page.getByTestId("my-listing-row").filter({ hasText: "Studio Full Nội Thất gần ĐH RMIT" }).first()).toBeVisible();
    await expect(page.getByTestId("confirm-delete-listing")).toBeEnabled();
    expect(deleteCalls).toBe(1);

    await page.getByTestId("confirm-delete-listing").click();
    await expect(page.getByRole("heading", { name: "Xác nhận xóa tin" })).toHaveCount(0);
    await expect(page.locator(`[data-listing-id="${listingId}"]`)).toHaveCount(0);
    await expect(page.getByText("Đã xóa tin đăng thành công")).toBeVisible();
    expect(deleteCalls).toBe(2);
  });

  test("bỏ ghim và xóa tiền cọc gửi null thay vì âm thầm giữ giá trị cũ", async ({ page }) => {
    await login(page, ACCOUNTS.sellerA);
    await go(page, "/tai-khoan/tin-cho-thue");
    const row = page.getByTestId("my-listing-row")
      .filter({ hasText: "Studio Full Nội Thất gần ĐH RMIT" }).first();
    await expect(row).toBeVisible();
    const listingId = await row.getAttribute("data-listing-id");
    expect(listingId).toBeTruthy();

    await page.route("**/rest/v1/rental_listings?*", async (route) => {
      const queriedId = new URL(route.request().url()).searchParams.get("id");
      if (queriedId !== `eq.${listingId}`) {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      const payload = await response.json();
      const listing = Array.isArray(payload) ? payload[0] : payload;
      expect(listing?.title, `Không tải được tin gốc (HTTP ${response.status()})`).toBeTruthy();
      await route.fulfill({ response, json: {
        ...listing,
        contact_phone: "0901234567",
        electricity_price: 3500,
        water_price: 15000,
        water_unit: "cubic",
        deposit: 4500000,
        latitude: 10.7712,
        longitude: 106.6823,
        metadata: {
          ...(listing.metadata ?? {}),
          coords: { lat: 10.7712, lng: 106.6823, address: listing.address },
          costs: { deposit: "4500000" },
        },
        listing_media: [0, 1, 2].map((sortOrder) => ({
          id: `e2e-media-${sortOrder}`,
          storage_path: `e2e/${listingId}/${sortOrder}.webp`,
          sort_order: sortOrder,
        })),
      } });
    });

    await row.getByRole("button", { name: "Chỉnh sửa" }).click();
    await expect(page.getByTestId("clear-listing-pin-btn")).toBeVisible();
    await page.getByTestId("clear-listing-pin-btn").click();
    await expect(page.getByText("Chưa ghim vị trí")).toBeVisible();
    await page.getByTestId("listing-next-btn").click();
    await page.getByTestId("listing-next-btn").click();
    await page.getByTestId("listing-next-btn").click();
    await expect(page.locator("#listing-deposit")).toHaveValue("4500000");
    await page.locator("#listing-deposit").fill("");

    let submitted: any;
    await page.route("**/rest/v1/**", async (route) => {
      if (route.request().method() === "GET") {
        await route.continue();
        return;
      }
      if (new URL(route.request().url()).pathname.endsWith("/rpc/update_listing_with_details")) {
        submitted = route.request().postDataJSON();
        await route.fulfill({ status: 200, contentType: "application/json", body: '"PendingApproval"' });
        return;
      }
      await route.abort();
      throw new Error(`Thao tác ghi ngoài dự kiến: ${route.request().url()}`);
    });
    await page.getByTestId("listing-submit-btn").click();
    await expect(page.getByTestId("listing-success")).toBeVisible();
    expect(submitted.p_listing.deposit).toBeNull();
    expect(submitted.p_listing.latitude).toBeNull();
    expect(submitted.p_listing.longitude).toBeNull();
    expect(submitted.p_listing.metadata.coords).toBeNull();
  });

  test("ô đăng nhập và đăng ký nhận đủ dữ liệu gõ từ bàn phím", async ({ page }) => {
    await go(page, "/dang-nhap");
    await page.getByTestId("login-identifier").pressSequentially("nguoidung@example.com");
    await page.getByTestId("login-password").pressSequentially("MatKhau@123");
    await expect(page.getByTestId("login-identifier")).toHaveValue("nguoidung@example.com");
    await expect(page.getByTestId("login-password")).toHaveValue("MatKhau@123");

    await go(page, "/dang-ky");
    await page.getByTestId("register-fullname").pressSequentially("Nguyễn Văn A");
    await page.getByTestId("register-phone").pressSequentially("0901234567");
    await page.getByTestId("register-email").pressSequentially("nguoidung@example.com");
    await page.getByTestId("register-password").pressSequentially("MatKhau@123");
    await expect(page.getByTestId("register-fullname")).toHaveValue("Nguyễn Văn A");
    await expect(page.getByTestId("register-phone")).toHaveValue("0901234567");
    await expect(page.getByTestId("register-email")).toHaveValue("nguoidung@example.com");
    await expect(page.getByTestId("register-password")).toHaveValue("MatKhau@123");
  });

  test("hero chuyển đủ ba bộ lọc sang trang kết quả", async ({ page }) => {
    await go(page, "/");
    await page.getByRole("textbox", { name: "Vị trí" }).fill("RMIT");
    await page.getByRole("button", { name: "Loại phòng" }).click();
    await page.getByRole("option", { name: "Phòng trọ", exact: true }).click();
    await page.getByRole("button", { name: "Khoảng giá" }).click();
    await page.getByRole("option", { name: "4 – 6 triệu", exact: true }).click();
    await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();

    await expect(page).toHaveURL(/#\/tim-phong\?/);
    const hashQuery = new URL(page.url()).hash.split("?")[1] ?? "";
    const params = new URLSearchParams(hashQuery);
    expect(params.get("loc")).toBe("RMIT");
    expect(params.get("type")).toBe("Phòng trọ");
    expect(params.get("price")).toBe("4 – 6 triệu");
    await expect(page.getByText("RMIT", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Phòng trọ", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("4 – 6 triệu", { exact: true }).first()).toBeVisible();
  });

  test("tìm Quận 7 khớp địa chỉ tin dù district đã là tên phường mới", async ({ page }) => {
    const locationClauses: string[] = [];
    page.on("request", (request) => {
      const requestUrl = new URL(request.url());
      if (requestUrl.pathname.endsWith("/rental_listings")) {
        locationClauses.push(requestUrl.searchParams.get("or") ?? "");
      }
    });
    const query = new URLSearchParams({ loc: "Quận 7", type: "Căn hộ dịch vụ", price: "4 – 6 triệu" });
    await go(page, `/tim-phong?${query}`);
    await expect(page.getByTestId("search-results-loading")).toBeHidden();
    await expect(page.getByRole("link", { name: /Studio Full Nội Thất gần ĐH RMIT/ }).first()).toBeVisible();
    expect(locationClauses.some((clause) => clause.includes("address.ilike."))).toBe(true);
  });

  test("sắp xếp giá tăng dần dùng đúng giá số", async ({ page }) => {
    await go(page, "/tim-phong");
    await expect(page.getByTestId("search-results-loading")).toBeHidden();
    await page.getByTestId("search-sort").selectOption("price-asc");
    await expect(page.getByTestId("search-results-loading")).toBeHidden();

    const prices = await page.getByTestId("listing-card").evaluateAll((cards) =>
      cards.map((card) => Number((card as HTMLElement).dataset.price)),
    );
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((left, right) => left - right));
    await expect(page.getByText("Chế độ xem bản đồ")).toHaveCount(0);
  });

  test("API tìm phòng lỗi thì báo lỗi và cho thử lại, không báo sai là 0 phòng", async ({ page }) => {
    let requestCount = 0;
    let allowSuccess = false;
    await page.route("**/rest/v1/rental_listings?*", async (route) => {
      requestCount += 1;
      if (!allowSuccess) {
        await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "SERVICE_UNAVAILABLE" }) });
        return;
      }
      await route.continue();
    });

    await go(page, "/tim-phong");
    await expect(page.getByTestId("search-results-error")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Tìm thấy 0 phòng phù hợp/ })).toHaveCount(0);
    allowSuccess = true;
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(page.getByTestId("search-results-error")).toHaveCount(0);
    await expect(page.getByTestId("listing-card").first()).toBeVisible();
    expect(requestCount).toBeGreaterThanOrEqual(2);
  });

  test("thư viện ảnh giữ focus bên trong và trả focus khi đóng", async ({ page }) => {
    await go(page, "/tim-phong");
    await expect(page.getByTestId("search-results-loading")).toBeHidden();
    await page.getByTestId("listing-card").first().click();
    const opener = page.getByRole("button", { name: "Xem tất cả ảnh" });
    await opener.click();

    const dialog = page.getByRole("dialog", { name: "Xem ảnh phòng" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Đóng thư viện ảnh" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("button", { name: /Xem ảnh \d+/ }).last()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    const contactOpener = page.getByTestId("listing-phone-btn");
    await contactOpener.click();
    const contactDialog = page.getByRole("dialog", { name: "Thông tin liên hệ chủ phòng" });
    await expect(contactDialog).toBeVisible();
    await expect(contactDialog.getByRole("button", { name: "Đóng" })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(contactDialog.getByRole("button", { name: "Đăng nhập" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(contactDialog).toBeHidden();
    await expect(contactOpener).toBeFocused();
  });

  test("redirect xác thực được giữ qua liên kết và chặn host ngoài", async ({ page }) => {
    await page.goto(`${url("/dang-nhap")}?redirect=${encodeURIComponent("/yeu-thich")}`);
    const registerHref = await page.getByRole("link", { name: "Đăng ký ngay" }).getAttribute("href");
    expect(registerHref).toContain(encodeURIComponent("/yeu-thich"));

    await page.getByRole("link", { name: "Đăng ký ngay" }).click();
    await expect(page).toHaveURL(/redirect=%2Fyeu-thich/);
    const loginHref = await page.getByRole("link", { name: "Đăng nhập" }).getAttribute("href");
    expect(loginHref).toContain(encodeURIComponent("/yeu-thich"));

    await page.goto(`${url("/dang-nhap")}?redirect=${encodeURIComponent("https://example.com/")}`);
    const safeRegisterHref = await page.getByRole("link", { name: "Đăng ký ngay" }).getAttribute("href");
    expect(safeRegisterHref).not.toContain("example.com");
  });

  test("tài khoản và tin nhắn mobile không tràn, có bottom navigation", async ({ page }) => {
    await login(page, ACCOUNTS.renterA);
    await page.setViewportSize({ width: 320, height: 900 });

    await go(page, "/tai-khoan");
    await expectNoHorizontalOverflow(page);

    await go(page, "/tin-nhan");
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId("mobile-tab-bar")).toBeVisible();
  });

  for (const width of [320, 768, 946, 1024]) {
    test(`không tràn ngang ở viewport ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/tim-phong", "/dang-nhap"]) {
        await go(page, path);
        await expectNoHorizontalOverflow(page);
      }
    });
  }
});
