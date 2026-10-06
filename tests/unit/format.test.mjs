import test from "node:test";
import assert from "node:assert/strict";
import {
  addDaysToISODate,
  addMonthsToISODate,
  formatDate,
  formatPeriod,
  formatVnd,
  formatVndShort,
  toLocalISODate,
  toLocalPeriod,
} from "../../src/shared/utils/format.ts";

test("local ISO date never shifts to the previous day (UTC+7 before 7am)", () => {
  const earlyMorning = new Date(2026, 9, 10, 1, 30);
  assert.equal(toLocalISODate(earlyMorning), "2026-10-10");
  assert.equal(toLocalPeriod(new Date(2026, 10, 1, 0, 5)), "2026-11");
});

test("adding months keeps the same day and clamps month ends", () => {
  assert.equal(addMonthsToISODate("2026-10-10", 6), "2027-04-10");
  assert.equal(addMonthsToISODate("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonthsToISODate("2028-01-31", 1), "2028-02-29");
  assert.equal(addMonthsToISODate("2026-10-10", 12), "2027-10-10");
  assert.equal(addDaysToISODate("2026-12-30", 5), "2027-01-04");
});

test("dates and periods are shown in Vietnamese formats, never raw ISO", () => {
  assert.equal(formatDate("2026-10-05"), "05/10/2026");
  assert.equal(formatDate(null), "—");
  assert.equal(formatDate("garbage"), "—");
  assert.equal(formatPeriod("2026-10"), "Tháng 10/2026");
  assert.equal(formatPeriod("2026-03"), "Tháng 3/2026");
});

test("money formats", () => {
  assert.equal(formatVnd(5500000), "5.500.000đ");
  assert.equal(formatVnd("1200000"), "1.200.000đ");
  assert.equal(formatVnd(null), "0đ");
  assert.equal(formatVndShort(5500000), "5,5 triệu đ");
  assert.equal(formatVndShort(450000), "450.000đ");
});
