import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInvoiceDraft,
  buildInvoiceItems,
  computeUtilityAmount,
  computeUtilityLine,
  formatUtilityBreakdown,
} from "../../src/workspace/services/invoice-draft.ts";

const readings = [
  { type: "Electricity", period: "2026-10", previous_reading: 120, current_reading: 155, unit_price: 3500, deleted_at: null },
  { type: "Water", period: "2026-10", previous_reading: "10", current_reading: "14", unit_price: "20000", deleted_at: null },
  { type: "Electricity", period: "2026-09", previous_reading: 100, current_reading: 120, unit_price: 3500, deleted_at: null },
  { type: "Water", period: "2026-09", previous_reading: 0, current_reading: 999, unit_price: 20000, deleted_at: "2026-09-30" },
];

test("utility amount = (current - previous) × unit_price for the selected period", () => {
  assert.equal(computeUtilityAmount(readings, "Electricity", "2026-10"), 35 * 3500);
  assert.equal(computeUtilityAmount(readings, "Water", "2026-10"), 4 * 20000);
  assert.equal(computeUtilityAmount(readings, "Electricity", "2026-09"), 20 * 3500);
});

test("missing or deleted reading → hasReading false, amount 0 (no invented value)", () => {
  const water = computeUtilityLine(readings, "Water", "2026-09");
  assert.equal(water.hasReading, false);
  assert.equal(water.amount, 0);
  assert.equal(computeUtilityLine([], "Electricity", "2026-10").hasReading, false);
  assert.equal(formatUtilityBreakdown(water), "");
});

test("breakdown shows consumption × unit price", () => {
  const line = computeUtilityLine(readings, "Electricity", "2026-10");
  assert.match(formatUtilityBreakdown(line), /^35 kWh × 3\.500đ/);
});

test("draft takes rent + contract id from the Active contract; null when none", () => {
  const draft = buildInvoiceDraft({ contract: { id: "c1", rent_price: "3300000" }, readings, serviceFee: 150000 }, "2026-10");
  assert.equal(draft.contractId, "c1");
  assert.equal(draft.rent, 3300000);
  assert.equal(draft.serviceFee, 150000);
  assert.equal(draft.electricity.amount, 122500);

  const noContract = buildInvoiceDraft({ contract: null, readings: [], serviceFee: null }, "2026-10");
  assert.equal(noContract.contractId, null);
  assert.equal(noContract.rent, null);
  assert.equal(noContract.serviceFee, null);
});

test("service fee 0 stays 0 (free), not 'not configured'", () => {
  const draft = buildInvoiceDraft({ contract: null, readings: [], serviceFee: 0 }, "2026-10");
  assert.equal(draft.serviceFee, 0);
});

test("invoice items use formatted period and drop zero lines", () => {
  const draft = buildInvoiceDraft({ contract: { id: "c1", rent_price: 3000000 }, readings, serviceFee: 0 }, "2026-10");
  const items = buildInvoiceItems(draft, { rent: 3000000, electricity: draft.electricity.amount, water: 0, service: 0 });
  assert.deepEqual(items.map((i) => i.type), ["Rent", "Electricity"]);
  assert.equal(items[0].description, "Tiền nhà tháng 10/2026");
  assert.equal(items[1].description, "Tiền điện tháng 10/2026");
  assert.equal(items[1].quantity, 35);
  assert.equal(items[1].unit_price, 3500);
  for (const item of items) assert.equal(item.quantity * item.unit_price, item.amount);
});

test("manually edited utility amount is saved as 1 × amount", () => {
  const draft = buildInvoiceDraft({ contract: { id: "c1", rent_price: 3000000 }, readings, serviceFee: 100000 }, "2026-10");
  const items = buildInvoiceItems(draft, { rent: 3000000, electricity: 100000, water: 80000, service: 100000 });
  const electricity = items.find((i) => i.type === "Electricity");
  assert.equal(electricity.quantity, 1);
  assert.equal(electricity.unit_price, 100000);
  const water = items.find((i) => i.type === "Water");
  assert.equal(water.quantity, 4);
  assert.equal(items.find((i) => i.type === "Service").description, "Phí dịch vụ tháng 10/2026");
});
