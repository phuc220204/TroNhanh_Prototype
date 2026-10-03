const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOCAL_PAYOS_TEST_ORIGINS = new Set(["http://localhost:5173", "http://127.0.0.1:5173"]);

export function getPayosCorsOrigin(requestOrigin, siteOrigin, testMode) {
  if (!requestOrigin || requestOrigin === siteOrigin) return siteOrigin;
  if (testMode === "true" && LOCAL_PAYOS_TEST_ORIGINS.has(requestOrigin)) return requestOrigin;
  return null;
}

export function isBoostTestSeller(testSellerId, sellerId) {
  return typeof testSellerId === "string"
    && UUID_PATTERN.test(testSellerId)
    && typeof sellerId === "string"
    && UUID_PATTERN.test(sellerId)
    && testSellerId.toLowerCase() === sellerId.toLowerCase();
}

export function canPayosSellerCheckout(testMode, testSellerId, sellerId) {
  if (testMode === "false") return !testSellerId;
  if (testMode !== "true") return false;
  return isBoostTestSeller(testSellerId, sellerId);
}

export function canShowBoostAction(checkoutEnabled, testMode, testSellerId, sellerId) {
  if (!checkoutEnabled) return false;
  if (testMode === "true") return isBoostTestSeller(testSellerId, sellerId);
  if (testMode === "false") return !testSellerId && typeof sellerId === "string";
  return false;
}
