import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import type { User } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { loadDataset, listingPayload, photoPath, readPhoto, repoRoot, seedSet } from "../../scripts/demo-listings-data.ts";
import { newClient } from "../../scripts/demo-listings-runtime.ts";

// This destructive lifecycle test is restricted to the dedicated local project, never the app's shared local/remote DB.
const localUrl = "http://127.0.0.1:54421";
assert.equal(process.env.SUPABASE_URL, localUrl, "Use only the isolated demo-listings Supabase on port 54421");
assert.ok(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_ANON_KEY && process.env.DEMO_ACCOUNT_PASSWORD);
const admin = newClient(localUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const anon = newClient(localUrl, process.env.SUPABASE_ANON_KEY!);
const items = await loadDataset();
const ownerIds = new Map<string, string>();
const password = process.env.DEMO_ACCOUNT_PASSWORD!;

function command(mode: "seed" | "remove", dryRun = false) {
  const file = mode === "seed" ? "seedDemoListings.ts" : "removeDemoListings.ts";
  const child = spawnSync(process.execPath, ["--experimental-strip-types", `scripts/${file}`, "--env-file", ".env.demo-listings-test.local", ...(dryRun ? ["--dry-run"] : [])], { cwd: repoRoot, encoding: "utf8", timeout: 300_000 });
  const events = child.stdout.trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
  assert.equal(child.status, 0, JSON.stringify({ status: child.status, events, stderr: child.stderr }));
  return events;
}

async function rows() {
  const { data, error } = await admin.from("rental_listings").select("*").contains("metadata", { demoSeedSet: seedSet });
  assert.ifError(error);
  return data ?? [];
}

async function login(email: string) {
  const client = newClient(localUrl, process.env.SUPABASE_ANON_KEY!);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  return client;
}

test("local RPC + Storage lifecycle: dry-run, interrupted draft, 10 public listings, rerun, filters, safe repeatable cleanup", { timeout: 600_000 }, async () => {
  const { data: existing, error: userError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  assert.ifError(userError);
  const existingUsers: User[] = existing.users;
  const emails = [...items.map(item => item.landlordEmail), "admin@tronhanh.demo", "unrelated@tronhanh.demo"];
  for (const [index, email] of emails.entries()) {
    let user = existingUsers.find(value => value.email === email);
    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true,
        user_metadata: { full_name: `Chủ demo ${index + 1}`, contact_phone: `09100000${String(index).padStart(2, "0")}` } });
      assert.ifError(error);
      user = data.user!;
    }
    ownerIds.set(email, user.id);
  }
  const { error: roleError } = await admin.from("user_roles").upsert({ user_id: ownerIds.get("admin@tronhanh.demo")!, role: "Admin" }, { onConflict: "user_id,role" });
  assert.ifError(roleError);
  // Only fixture setup changes this setting, and only in the dedicated local project. Force the manual-approval path.
  const { error: settingError } = await admin.from("platform_settings").upsert({ key: "auto_approve_listings", value: false });
  assert.ifError(settingError);

  command("remove");
  const first = items[0]!;
  const seller = await login(first.landlordEmail);
  const { data: profile, error: profileError } = await admin.from("profiles").select("full_name,contact_phone").eq("user_id", ownerIds.get(first.landlordEmail)!).single();
  assert.ifError(profileError);
  const payload = listingPayload(first, profile!);
  const sentinelPayload = { ...payload as Record<string, unknown>, title: "[DEMO] Tin cũ ngoài bộ seed EXE201", metadata: { unrelated: true } };
  const { data: sentinelId, error: sentinelError } = await seller.rpc("create_listing_with_details", { p_listing: sentinelPayload as never, p_submit: false });
  assert.ifError(sentinelError);
  const { data: sentinelBefore } = await admin.from("rental_listings").select("*").eq("id", sentinelId!).single();
  const outsider = await login("unrelated@tronhanh.demo");
  const { data: unrelatedId, error: unrelatedError } = await outsider.rpc("create_listing_with_details", {
    p_listing: { ...sentinelPayload, title: "Tin phòng khác ngoài phạm vi seed" } as never, p_submit: false,
  });
  assert.ifError(unrelatedError);
  const { data: unrelatedBefore } = await admin.from("rental_listings").select("*").eq("id", unrelatedId!).single();

  const beforeDryRun = await rows();
  const dryEvents = command("seed", true);
  assert.equal(dryEvents.filter(event => event.outcome === "wouldCreate").length, 10);
  assert.deepEqual(await rows(), beforeDryRun);

  // Simulate interruption between the first upload and update RPC; the next seed must resume this exact ID.
  const { data: draftId, error: draftError } = await seller.rpc("create_listing_with_details", { p_listing: payload, p_submit: false, p_amenities: [], p_media: [] });
  assert.ifError(draftError);
  const firstPath = photoPath(ownerIds.get(first.landlordEmail)!, draftId!, first.photos[0]!);
  const { error: uploadError } = await seller.storage.from("listing-images").upload(firstPath, await readPhoto(first.photos[0]!), { contentType: "image/webp", upsert: false });
  assert.ifError(uploadError);

  const seedEvents = command("seed");
  assert.equal(seedEvents.filter(event => event.outcome === "resumed").length, 1);
  assert.equal(seedEvents.filter(event => event.outcome === "created").length, 9);
  const active = (await rows()).filter(row => !row.deleted_at);
  assert.equal(active.length, 10);
  assert.equal(active.find(row => (row.metadata as Record<string, unknown>).listingKey === first.listingKey)?.id, draftId);
  assert.ok(active.every(row => row.status === "Active" && !row.room_id && !row.property_id && !row.boost_expire_at && !row.boost_payment_verified));
  for (const item of items) {
    const row = active.find(value => (value.metadata as Record<string, unknown>).listingKey === item.listingKey)!;
    const metadata = row.metadata as { curfew: { type: string; time: string } };
    assert.equal(metadata.curfew.type, item.accessPolicy === "Restricted" ? "curfew" : "free");
    assert.equal(metadata.curfew.time, item.accessCloseTime ?? "");
  }
  const ids = active.map(row => row.id).sort();
  const { data: media, error: mediaError } = await admin.from("listing_media").select("*").in("listing_id", ids);
  assert.ifError(mediaError);
  assert.equal(media?.length, 50);
  for (const row of active) {
    const { data: objects, error } = await admin.storage.from("listing-images").list(`${row.seller_id}/${row.id}`);
    assert.ifError(error);
    assert.equal(objects?.length, media!.filter(value => value.listing_id === row.id).length);
  }
  const photo = media![0]!;
  const { data: publicUrl } = anon.storage.from("listing-images").getPublicUrl(photo.storage_path);
  const response = await fetch(publicUrl.publicUrl);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-type")?.includes("image/webp"));
  assert.equal(createHash("sha256").update(Buffer.from(await response.arrayBuffer())).digest("hex").length, 64);
  const { data: publicRows, error: publicError } = await anon.from("public_rental_listings").select("id,price,ward_code,province_code").in("id", ids);
  assert.ifError(publicError);
  assert.equal(publicRows?.length, 10);
  for (const wardCode of new Set(items.map(item => item.wardCode))) {
    const { data, error } = await anon.from("public_rental_listings").select("id").in("id", ids).eq("province_code", 79).eq("ward_code", wardCode);
    assert.ifError(error);
    assert.equal(data?.length, items.filter(item => item.wardCode === wardCode).length);
  }
  for (const [min, max] of [[0, 1_999_999], [2_000_000, 3_999_999], [4_000_000, 6_000_000]] as const) {
    const { data, error } = await anon.from("public_rental_listings").select("id").in("id", ids).gte("price", min).lte("price", max);
    assert.ifError(error);
    assert.equal(data?.length, items.filter(item => item.price >= min && item.price <= max).length);
  }
  const repeated = command("seed");
  assert.equal(repeated.filter(event => event.outcome === "skipped").length, 10);
  assert.deepEqual((await rows()).filter(row => !row.deleted_at).map(row => row.id).sort(), ids);
  const { data: repeatedMedia } = await admin.from("listing_media").select("id").in("listing_id", ids);
  assert.equal(repeatedMedia?.length, 50);
  const beforeRemoveDryRun = await rows();
  command("remove", true);
  assert.deepEqual(await rows(), beforeRemoveDryRun);
  assert.equal((await rows()).filter(row => !row.deleted_at).length, 10);
  command("remove");
  command("remove");
  assert.equal((await rows()).filter(row => !row.deleted_at).length, 0);
  const { data: afterRemoval } = await anon.from("public_rental_listings").select("id").in("id", ids);
  assert.equal(afterRemoval?.length, 0);
  for (const row of active) {
    const { data } = await admin.storage.from("listing-images").list(`${row.seller_id}/${row.id}`);
    assert.equal(data?.length, 0);
  }
  const { data: sentinelAfter } = await admin.from("rental_listings").select("*").eq("id", sentinelId!).single();
  const { data: unrelatedAfter } = await admin.from("rental_listings").select("*").eq("id", unrelatedId!).single();
  assert.deepEqual(sentinelAfter, sentinelBefore);
  assert.deepEqual(unrelatedAfter, unrelatedBefore);
  await seller.auth.signOut({ scope: "local" });
  await outsider.auth.signOut({ scope: "local" });
});
