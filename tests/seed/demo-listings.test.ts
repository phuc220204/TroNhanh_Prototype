import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDataset, validateDataset, photoPath, listingPayload, seedSet, DemoError } from "../../scripts/demo-listings-data.ts";
import { assertOwnedRow, selectExisting } from "../../scripts/demo-listings-workflow.ts";
import { acquireProjectLock, safeError } from "../../scripts/demo-listings-runtime.ts";
import type { Database } from "../../src/shared/types/database.types.ts";

type ListingRow = Database["public"]["Tables"]["rental_listings"]["Row"];
const items = await loadDataset();
const first = items[0]!;
const sellerId = "2e17946a-2d67-4d6f-b21b-b53502bb87d1";
function row(changes: Partial<ListingRow> = {}): ListingRow {
  return { id: "c4125d22-d34a-4cb9-93ef-9791ca86cb32", seller_id: sellerId, title: first.title,
    description: first.description, metadata: { demoSeedSet: seedSet, listingKey: first.listingKey },
    deleted_at: null, status: "Draft", ...changes } as ListingRow;
}

test("all ten fixtures have real checksummed WebP assets and the agreed distribution", () => {
  assert.equal(items.length, 10);
  assert.equal(new Set(items.map(item => item.landlordEmail)).size, 10);
  assert.equal(items.reduce((total, item) => total + item.photos.length, 0), 50);
});

test("reject invalid labels, geography, owners, type, address and duplicate keys before any network request", () => {
  for (const mutation of [
    { title: "Phòng thật" }, { description: "Không có cảnh báo" }, { landlordEmail: "user@example.com" },
    { provinceCode: 1 }, { wardCode: 99999 }, { address: "123 đường A" },
    { propertyType: "Ở ghép" }, { price: 0 }, { area: 500 }, { photos: first.photos.slice(0, 2) },
    { amenities: ["Không thuộc catalog"] }, { accessPolicy: "Restricted", accessOpenTime: "25:00" },
  ]) {
    const copy = structuredClone(items);
    Object.assign(copy[0]!, mutation);
    assert.throws(() => validateDataset(copy), DemoError);
  }
  const duplicate = structuredClone(items);
  duplicate[1]!.listingKey = first.listingKey;
  assert.throws(() => validateDataset(duplicate), /DUPLICATE_LISTING_KEY/);
});

test("never adopt another owner's, another batch's, renamed, or unmarked listing", () => {
  assert.equal(selectExisting([row()], first, sellerId)?.id, row().id);
  for (const changes of [ { seller_id: "someone-else" }, { metadata: { demoSeedSet: "other", listingKey: first.listingKey } },
    { title: "[DEMO] Đã sửa ngoài script" }, { description: "Bị thay nội dung" } ]) {
    assert.throws(() => assertOwnedRow(row(changes), first, sellerId), /MISMATCH/);
  }
  assert.throws(() => selectExisting([row(), row({ id: "duplicate" })], first, sellerId), /DUPLICATE_SEED_KEY/);
  assert.throws(() => selectExisting([row({ metadata: {} })], first, sellerId), /UNMARKED_TITLE_COLLISION/);
  assert.equal(selectExisting([row({ deleted_at: new Date().toISOString() })], first, sellerId), undefined);
});

test("storage names are deterministic, listing-scoped, and payload never supplies owner/status/boost", () => {
  const path = photoPath(sellerId, row().id, first.photos[0]!);
  assert.ok(path.startsWith(`${sellerId}/${row().id}/`));
  assert.equal(path, photoPath(sellerId, row().id, first.photos[0]!));
  const payload = listingPayload(first, { full_name: "Chủ demo", contact_phone: "0910000000" }) as Record<string, unknown>;
  for (const field of ["seller_id", "status", "boost_expire_at", "boost_payment_verified"]) assert.equal(field in payload, false);
  assert.equal(payload.room_id, null);
  assert.equal(payload.property_id, null);
  const metadata = payload.metadata as Record<string, unknown>;
  assert.deepEqual(metadata.curfew, { type: "curfew", time: "23:00" });
  assert.throws(() => listingPayload(first, { full_name: "", contact_phone: null }), /CONTACT_MISSING/);
});

test("seed and remove share a local project lock, released after completion", async () => {
  const project = `http://127.0.0.1:${process.pid}`;
  const release = await acquireProjectLock(project);
  try { await assert.rejects(acquireProjectLock(project), /PROJECT_LOCKED/); } finally { await release(); }
  const releaseAgain = await acquireProjectLock(project);
  await releaseAgain();
});

test("unexpected provider errors cannot print secrets or token-bearing URLs", () => {
  assert.equal(safeError(new Error("secret-token https://host?key=private")), "UNEXPECTED_ERROR_CHECK_CONFIGURATION_OR_CONNECTIVITY");
  assert.equal(safeError(new DemoError("MISSING_ENV:SUPABASE_URL")), "MISSING_ENV:SUPABASE_URL");
});
