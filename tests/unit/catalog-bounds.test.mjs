import assert from "node:assert/strict";
import test from "node:test";
import { parsePriceRangeLabel } from "../../src/shared/utils/catalog-bounds.ts";

test("price ranges assign shared boundaries to exactly one range", () => {
  assert.deepEqual(parsePriceRangeLabel("Dưới 2 triệu"), {
    priceMaxExclusive: 2_000_000,
  });
  assert.deepEqual(parsePriceRangeLabel("2 – 4 triệu"), {
    priceMin: 2_000_000,
    priceMaxExclusive: 4_000_000,
  });
  assert.deepEqual(parsePriceRangeLabel("4 – 6 triệu"), {
    priceMin: 4_000_000,
    priceMax: 6_000_000,
  });
  assert.deepEqual(parsePriceRangeLabel("Trên 6 triệu"), {
    priceMinExclusive: 6_000_000,
  });
});

test("legacy price ranges also avoid including the next range's lower bound", () => {
  assert.deepEqual(parsePriceRangeLabel("4 - 7 triệu"), {
    priceMin: 4_000_000,
    priceMaxExclusive: 7_000_000,
  });
  assert.deepEqual(parsePriceRangeLabel("7 - 10 triệu"), {
    priceMin: 7_000_000,
    priceMax: 10_000_000,
  });
  assert.deepEqual(parsePriceRangeLabel("Trên 10 triệu"), {
    priceMinExclusive: 10_000_000,
  });
});
