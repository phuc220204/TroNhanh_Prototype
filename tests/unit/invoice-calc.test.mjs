import test from "node:test";
import assert from "node:assert/strict";
import {
  addMonthsClamped,
  categoryOfItem,
  computeRentAmount,
  computeRentProration,
  defaultBillingRange,
  formatProration,
  groupItemsByCategory,
  summarizeByCategory,
} from "../../src/workspace/services/invoice-calc.ts";

test("addMonthsClamped kẹp về ngày cuối tháng như Postgres", () => {
  assert.equal(addMonthsClamped("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsClamped("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsClamped("2026-11-15", 2), "2027-01-15");
});

test("tháng trọn vẹn = 1 tháng 0 ngày", () => {
  assert.deepEqual(computeRentProration("2026-11-01", "2026-11-30"), { months: 1, days: 0, quantity: 1 });
  assert.deepEqual(computeRentProration("2026-02-01", "2026-02-28"), { months: 1, days: 0, quantity: 1 });
});

test("khớp kết quả RPC create_invoice_v2 trên DB: 31/12–31/01 = 1 tháng 1 ngày", () => {
  assert.deepEqual(computeRentProration("2029-12-31", "2030-01-31"), { months: 1, days: 1, quantity: 1.0333 });
  assert.equal(computeRentAmount(2_800_000, "2029-12-31", "2030-01-31"), 2_893_333);
});

test("nửa tháng đầu khi mới vào ở", () => {
  const proration = computeRentProration("2026-11-16", "2026-11-30");
  assert.deepEqual(proration, { months: 0, days: 15, quantity: 0.5 });
  assert.equal(computeRentAmount(3_000_000, "2026-11-16", "2026-11-30"), 1_500_000);
  assert.equal(formatProration(proration), "15 ngày");
});

test("khoảng ngày sai trả 0, không ra tiền âm", () => {
  assert.deepEqual(computeRentProration("2026-12-01", "2026-11-01"), { months: 0, days: 0, quantity: 0 });
  assert.equal(computeRentAmount(3_000_000, "", "2026-11-01"), 0);
});

test("defaultBillingRange = ngày đầu → ngày cuối tháng", () => {
  assert.deepEqual(defaultBillingRange("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(defaultBillingRange("2026-12"), { from: "2026-12-01", to: "2026-12-31" });
});

test("hóa đơn cũ chưa có fee_category suy theo type", () => {
  assert.equal(categoryOfItem({ type: "Rent" }), "Rent");
  assert.equal(categoryOfItem({ type: "Electricity" }), "Service");
  assert.equal(categoryOfItem({ type: "Other" }), "Adjustment");
  assert.equal(categoryOfItem({ type: "Service", fee_category: "PassThrough" }), "PassThrough");
});

test("summarizeByCategory tách doanh thu khỏi thu hộ", () => {
  const items = [
    { fee_category: "Rent", amount: 3_000_000 },
    { fee_category: "Service", amount: "180000" },
    { fee_category: "PassThrough", amount: 30_000 },
    { fee_category: "Adjustment", amount: -100_000 },
  ];
  const totals = summarizeByCategory(items);
  assert.equal(totals.total, 3_110_000);
  assert.equal(totals.PassThrough, 30_000);
  assert.equal(totals.revenue, 3_080_000);
  assert.deepEqual(groupItemsByCategory(items).map((g) => g.category), ["Rent", "Service", "PassThrough", "Adjustment"]);
});

test("mô tả dòng hóa đơn v2 và hóa đơn cũ", async () => {
  const { invoiceItemLabel, invoiceItemDetail } = await import("../../src/workspace/services/invoice-calc.ts");
  const rent = { type: "Rent", fee_category: "Rent", quantity: 1.0333, unit_price: 3800000, meta: { months: 1, days: 1, from: "2026-10-31", to: "2026-12-01" } };
  assert.equal(invoiceItemLabel(rent), "Tiền phòng");
  assert.equal(invoiceItemDetail(rent), "1 tháng 1 ngày × 3.800.000đ (31/10/2026 – 01/12/2026)");

  const elec = { type: "Electricity", fee_category: "Service", description: "Tiền điện", quantity: 35, unit_price: 3500, unit: "kWh", meta: { previous: 120, current: 155 } };
  assert.equal(invoiceItemDetail(elec), "Chỉ số 120 → 155 = 35 kWh × 3.500đ");

  const parking = { type: "Service", fee_category: "PassThrough", description: "Giữ xe", quantity: 2, unit_price: 120000, unit: "Tháng" };
  assert.equal(invoiceItemLabel(parking), "Giữ xe");
  assert.equal(invoiceItemDetail(parking), "2 Tháng × 120.000đ");

  const discount = { type: "Other", fee_category: "Adjustment", description: "Giảm Tết", quantity: 1, unit_price: -100000 };
  assert.equal(invoiceItemLabel(discount), "Giảm Tết");
  assert.equal(invoiceItemDetail(discount), null);

  assert.equal(invoiceItemLabel({ type: "Water", description: null }), "Tiền nước");
});

test("cột Đơn giá / Mức sử dụng của bản in", async () => {
  const { invoiceItemColumns } = await import("../../src/workspace/services/invoice-calc.ts");
  assert.deepEqual(
    invoiceItemColumns({ type: "Rent", fee_category: "Rent", quantity: 1.0333, unit_price: 3800000, meta: { months: 1, days: 1, from: "2026-10-31", to: "2026-11-30" } }),
    { unitPriceText: "3.800.000đ/tháng", usageText: "1 tháng 1 ngày (31/10/2026 – 30/11/2026)" },
  );
  assert.deepEqual(
    invoiceItemColumns({ type: "Electricity", fee_category: "Service", quantity: 35, unit_price: 3500, unit: "kWh", meta: { previous: 242, current: 277 } }),
    { unitPriceText: "3.500đ/kWh", usageText: "35 kWh (242 → 277)" },
  );
  assert.deepEqual(
    invoiceItemColumns({ type: "Service", fee_category: "PassThrough", quantity: 2, unit_price: 120000, unit: "Tháng" }),
    { unitPriceText: "120.000đ/Tháng", usageText: "2 Tháng" },
  );
  assert.deepEqual(invoiceItemColumns({ type: "Other", fee_category: "Adjustment", amount: -1 }), { unitPriceText: "", usageText: "" });
});

test("buildDraftInvoiceItems: tổng khớp Tạm tính, bỏ dòng điều chỉnh 0đ", async () => {
  const { buildDraftInvoiceItems, summarizeByCategory } = await import("../../src/workspace/services/invoice-calc.ts");
  const items = buildDraftInvoiceItems({
    rentPrice: 2_800_000, billingFrom: "2029-12-31", billingTo: "2030-01-31",
    services: [
      { serviceId: "s1", name: "Phí dịch vụ", unit: "Tháng", feeCategory: "Service", meterType: null, quantity: 1, unitPrice: 100_000, amount: 100_000 },
      { serviceId: "s2", name: "Tiền rác", unit: "Tháng", feeCategory: "PassThrough", meterType: null, quantity: 1, unitPrice: 30_000, amount: 30_000 },
    ],
    adjustments: [{ reason: "Giảm Tết", amount: -100_000 }, { reason: "trống", amount: 0 }],
  });
  assert.equal(items.length, 4);
  const totals = summarizeByCategory(items);
  assert.equal(totals.total, 2_893_333 + 100_000 + 30_000 - 100_000);
  assert.equal(totals.PassThrough, 30_000);
  assert.deepEqual(items[0].meta, { months: 1, days: 1, from: "2029-12-31", to: "2030-01-31" });
});
