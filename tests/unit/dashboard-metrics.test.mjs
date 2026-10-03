import test from "node:test";
import assert from "node:assert/strict";
import { aggregateDashboardMetrics } from "../../src/workspace/services/dashboard-metrics.ts";

test("aggregates physical occupancy, unpaid balances, monthly receipts and current-period invoices", () => {
  const now = new Date(2026, 9, 15, 12);
  const rooms = [
    { status: "Rented", contracts: [{ status: "Active", occupancies: [{ occupant_count: 2 }, { occupant_count: 1 }] }] },
    { status: "Rented", contracts: [{ status: "Active", occupancies: [{ occupant_count: 1 }] }, { status: "Expired", occupancies: [{ occupant_count: 1 }] }] },
    { status: "Available", contracts: [] },
    { status: "Hidden", contracts: [] },
  ];
  const invoices = [
    {
      id: "partial", room_id: "r1", total_amount: 1000, status: "PartiallyPaid", period: "2026-10",
      payments: [
        { amount: 300, paid_at: new Date(2026, 9, 4, 12).toISOString(), purpose: "RentInvoice" },
        { amount: 50, paid_at: new Date(2026, 9, 4, 12).toISOString(), purpose: "Boost" },
      ],
    },
    {
      id: "paid", room_id: "r2", total_amount: 400, status: "Paid", period: "2026-10",
      payments: [{ amount: 400, paid_at: new Date(2026, 9, 5, 12).toISOString(), purpose: "RentInvoice" }],
    },
    {
      id: "overdue", room_id: "r2", total_amount: 900, status: "Overdue", period: "2026-09",
      payments: [{ amount: 100, paid_at: new Date(2026, 8, 4, 12).toISOString(), purpose: "RentInvoice" }],
    },
  ];

  const metrics = aggregateDashboardMetrics(rooms, invoices, now);
  assert.equal(metrics.period, "2026-10");
  assert.equal(metrics.totalRoomsCount, 4);
  assert.equal(metrics.rentedRoomsCount, 2);
  assert.equal(metrics.occupantCount, 4);
  assert.equal(metrics.emptyRoomsCount, 1);
  assert.equal(metrics.unpaidInvoiceCount, 2);
  assert.equal(metrics.unpaidInvoiceAmount, 1500);
  assert.equal(metrics.collectedThisMonth, 700);
  assert.equal(metrics.invoiceCountThisPeriod, 2);
  assert.equal(metrics.invoiceAmountThisPeriod, 1400);
});

test("returns honest zero values for a real empty dashboard", () => {
  const metrics = aggregateDashboardMetrics([], [], new Date(2026, 0, 5));
  assert.equal(metrics.totalRoomsCount, 0);
  assert.equal(metrics.occupantCount, 0);
  assert.equal(metrics.unpaidInvoiceAmount, 0);
  assert.equal(metrics.collectedThisMonth, 0);
  assert.equal(metrics.invoiceCountThisPeriod, 0);
  assert.equal(metrics.invoiceAmountThisPeriod, 0);
  assert.equal(metrics.period, "2026-01");
});
