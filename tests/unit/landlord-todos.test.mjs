import test from "node:test";
import assert from "node:assert/strict";
import { buildLandlordTodos } from "../../src/workspace/services/landlord-todos.ts";
import { classifyContractEnd, formatContractEndLabel } from "../../src/workspace/services/contract-due.ts";

const now = new Date(2026, 9, 16, 9);
const property = { name: "Khu Phan Văn Trị" };

test("phân loại hợp đồng Active theo end_date: quá hạn, sắp hết hạn ≤30 ngày, còn xa", () => {
  assert.deepEqual(classifyContractEnd("2026-07-15", "Active", now), { state: "expired", daysUntilEnd: -93 });
  assert.deepEqual(classifyContractEnd("2026-10-16", "Active", now), { state: "expiringSoon", daysUntilEnd: 0 });
  assert.deepEqual(classifyContractEnd("2026-11-15", "Active", now), { state: "expiringSoon", daysUntilEnd: 30 });
  assert.equal(classifyContractEnd("2026-11-16", "Active", now), null);
  // Hợp đồng đã kết thúc không còn việc gì để nhắc.
  assert.equal(classifyContractEnd("2026-07-15", "Terminated", now), null);
  assert.equal(classifyContractEnd(null, "Active", now), null);
  assert.equal(formatContractEndLabel(-93), "Quá hạn 93 ngày");
  assert.equal(formatContractEndLabel(0), "Hết hạn hôm nay");
});

test("gom hợp đồng quá/sắp hết hạn và phòng đang thuê chưa có hóa đơn kỳ hiện tại", () => {
  const rooms = [
    {
      id: "p202", property_id: "k1", room_code: "P202", status: "Rented", properties: property,
      contracts: [{ id: "c202", status: "Active", end_date: "2026-07-15" }],
      invoices: [{ period: "2026-08" }],
    },
    {
      id: "p203", property_id: "k1", room_code: "P203", status: "Rented", properties: property,
      contracts: [{ id: "c203", status: "Active", end_date: "2026-06-20" }],
      invoices: [{ period: "2026-10" }],
    },
    {
      id: "p101", property_id: "k1", room_code: "P101", status: "Rented", properties: property,
      contracts: [{ id: "c101", status: "Active", end_date: "2026-11-01" }, { id: "old", status: "Terminated", end_date: "2025-01-01" }],
      invoices: [],
    },
    { id: "p301", property_id: "k1", room_code: "P301", status: "Available", properties: property, contracts: [], invoices: [] },
  ];

  const todos = buildLandlordTodos(rooms, now);
  assert.equal(todos.period, "2026-10");
  // Quá hạn lâu nhất trước.
  assert.deepEqual(todos.expiredContracts.map((c) => [c.roomCode, c.daysUntilEnd]), [["P203", -118], ["P202", -93]]);
  assert.deepEqual(todos.expiringContracts.map((c) => [c.roomCode, c.daysUntilEnd]), [["P101", 16]]);
  // P203 đã có hóa đơn tháng 10; phòng trống không cần hóa đơn.
  assert.deepEqual(todos.roomsWithoutInvoice.map((r) => r.roomCode), ["P202", "P101"]);
  assert.equal(todos.roomsWithoutInvoice[0].propertyName, "Khu Phan Văn Trị");
});

test("không có gì để nhắc ⇒ mọi danh sách rỗng", () => {
  const todos = buildLandlordTodos([
    { id: "r", property_id: "k", room_code: "A1", status: "Rented", contracts: [{ id: "c", status: "Active", end_date: "2027-06-30" }], invoices: [{ period: "2026-10" }] },
  ], now);
  assert.equal(todos.expiredContracts.length + todos.expiringContracts.length + todos.roomsWithoutInvoice.length, 0);
});
