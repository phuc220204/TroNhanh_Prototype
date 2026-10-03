import test from "node:test";
import assert from "node:assert/strict";
import { isEmailIdentifier, normalizeVietnamPhone } from "../../src/shared/utils/phone.ts";

test("normalizes common Vietnamese mobile number formats to E.164", () => {
  assert.equal(normalizeVietnamPhone("0912 345 678"), "+84912345678");
  assert.equal(normalizeVietnamPhone("+84 912-345-678"), "+84912345678");
  assert.equal(normalizeVietnamPhone("0084 912 345 678"), "+84912345678");
});

test("rejects invalid, incomplete, and landline numbers", () => {
  assert.equal(normalizeVietnamPhone("091234567"), null);
  assert.equal(normalizeVietnamPhone("0212345678"), null);
  assert.equal(normalizeVietnamPhone("not a phone"), null);
});

test("distinguishes legacy email login identifiers", () => {
  assert.equal(isEmailIdentifier("old.account@example.com"), true);
  assert.equal(isEmailIdentifier("0912345678"), false);
});
