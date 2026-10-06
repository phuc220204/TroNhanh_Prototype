import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeRoomStatus,
  normalizeInvoiceStatus,
  normalizeContractStatus,
  normalizeLinkStatus,
  ROOM_STATUS_META,
  INVOICE_STATUS_META,
  LINK_STATUS_META,
} from "../../src/shared/utils/statusMaps.ts";

test("DB values and canonical keys both normalize", () => {
  assert.equal(normalizeRoomStatus("Rented"), "rented");
  assert.equal(normalizeRoomStatus("rented"), "rented");
  assert.equal(normalizeInvoiceStatus("PartiallyPaid"), "partiallyPaid");
  assert.equal(normalizeContractStatus("Terminated"), "terminated");
  assert.equal(normalizeLinkStatus("Pending"), "pending");
});

test("unknown values are not silently guessed", () => {
  // BR-002: không có "Repairing" — trước đây map tay rơi về "Trống".
  assert.equal(normalizeRoomStatus("Repairing"), null);
  assert.equal(normalizeInvoiceStatus(undefined), null);
  assert.equal(normalizeLinkStatus(null), "none");
});

test("labels come from one vocabulary", () => {
  assert.equal(ROOM_STATUS_META[normalizeRoomStatus("Hidden")].label, "Đã ẩn");
  assert.equal(INVOICE_STATUS_META[normalizeInvoiceStatus("Paid")].label, "Đã thanh toán");
  assert.equal(LINK_STATUS_META[normalizeLinkStatus("Confirmed")].label, "Đã liên kết");
});
