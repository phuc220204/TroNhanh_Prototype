import test from "node:test";
import assert from "node:assert/strict";
import { contractDuration } from "../../src/workspace/services/contract-duration.ts";

test("thời hạn hợp đồng", () => {
  assert.equal(contractDuration("2026-07-12", "2027-07-12"), "12 tháng");
  assert.equal(contractDuration("2026-01-31", "2026-02-28"), "1 tháng");
  assert.equal(contractDuration("2026-07-01", "2027-01-16"), "6 tháng 15 ngày");
  assert.equal(contractDuration("2026-07-01", "2026-07-20"), "19 ngày");
  assert.equal(contractDuration("2026-07-01", "2026-06-01"), "0 ngày");
});
