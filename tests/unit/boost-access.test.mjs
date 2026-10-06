import assert from "node:assert/strict";
import test from "node:test";
import { getPayosCorsOrigin } from "../../supabase/functions/_shared/boost-access.mjs";

const siteOrigin = "https://tronhanh.vercel.app";

test("payOS functions accept only the configured site origin", () => {
  assert.equal(getPayosCorsOrigin(siteOrigin, siteOrigin), siteOrigin);
  assert.equal(getPayosCorsOrigin(null, siteOrigin), siteOrigin);
  assert.equal(getPayosCorsOrigin(undefined, siteOrigin), siteOrigin);
});

test("localhost and foreign origins are rejected in production", () => {
  assert.equal(getPayosCorsOrigin("http://localhost:5173", siteOrigin), null);
  assert.equal(getPayosCorsOrigin("http://127.0.0.1:5173", siteOrigin), null);
  assert.equal(getPayosCorsOrigin("https://attacker.example", siteOrigin), null);
});
