import assert from "node:assert/strict";
import test from "node:test";
import {
  canPayosSellerCheckout,
  canShowBoostAction,
  getPayosCorsOrigin,
  isBoostTestSeller,
} from "../../supabase/functions/_shared/boost-access.mjs";

const testSellerId = "11111111-1111-4111-8111-111111111111";
const otherSellerId = "22222222-2222-4222-8222-222222222222";

test("test access matches only the configured valid seller UUID", () => {
  assert.equal(isBoostTestSeller(testSellerId, testSellerId), true);
  assert.equal(isBoostTestSeller(testSellerId.toUpperCase(), testSellerId), true);
  assert.equal(isBoostTestSeller(testSellerId, otherSellerId), false);
  assert.equal(isBoostTestSeller("not-a-uuid", "not-a-uuid"), false);
});

test("backend fails closed for missing or invalid mode and test seller", () => {
  assert.equal(canPayosSellerCheckout(undefined, undefined, testSellerId), false);
  assert.equal(canPayosSellerCheckout("unexpected", testSellerId, testSellerId), false);
  assert.equal(canPayosSellerCheckout("true", undefined, testSellerId), false);
  assert.equal(canPayosSellerCheckout("true", testSellerId, otherSellerId), false);
  assert.equal(canPayosSellerCheckout("true", testSellerId, testSellerId), true);
  assert.equal(canPayosSellerCheckout("false", undefined, otherSellerId), true);
  assert.equal(canPayosSellerCheckout("false", testSellerId, otherSellerId), false);
});

test("frontend hides checkout for everyone except the test seller", () => {
  assert.equal(canShowBoostAction(false, "true", testSellerId, testSellerId), false);
  assert.equal(canShowBoostAction(true, "true", testSellerId, testSellerId), true);
  assert.equal(canShowBoostAction(true, "true", testSellerId, otherSellerId), false);
  assert.equal(canShowBoostAction(true, "true", "invalid", testSellerId), false);
  assert.equal(canShowBoostAction(true, undefined, undefined, otherSellerId), false);
  assert.equal(canShowBoostAction(true, "unexpected", undefined, otherSellerId), false);
  assert.equal(canShowBoostAction(true, "false", undefined, otherSellerId), true);
  assert.equal(canShowBoostAction(true, "false", testSellerId, otherSellerId), false);
});

test("localhost CORS is allowed only for explicit PayOS test origins in test mode", () => {
  const siteOrigin = "https://tronhanh.vercel.app";
  assert.equal(getPayosCorsOrigin("http://localhost:5173", siteOrigin, "true"), "http://localhost:5173");
  assert.equal(getPayosCorsOrigin("http://127.0.0.1:5173", siteOrigin, "true"), "http://127.0.0.1:5173");
  assert.equal(getPayosCorsOrigin("http://localhost:5173", siteOrigin, "false"), null);
  assert.equal(getPayosCorsOrigin("https://attacker.example", siteOrigin, "true"), null);
  assert.equal(getPayosCorsOrigin(siteOrigin, siteOrigin, "false"), siteOrigin);
  assert.equal(getPayosCorsOrigin(null, siteOrigin, "true"), siteOrigin);
});
