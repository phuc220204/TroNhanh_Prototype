import { createHash } from "node:crypto";
import type { Database, Json } from "../src/shared/types/database.types.ts";
import { DemoError, disclaimer, listingPayload, loadDataset, photoPath, readPhoto, seedSet } from "./demo-listings-data.ts";
import type { DemoListing } from "./demo-listings-data.ts";
import { acquireProjectLock, checkResult, findDemoUsers, loadConfig, newClient, report, safeError, signInDemo } from "./demo-listings-runtime.ts";
import type { DemoClient, DemoConfig } from "./demo-listings-runtime.ts";

type ListingRow = Database["public"]["Tables"]["rental_listings"]["Row"];
const bucket = "listing-images";

export function assertOwnedRow(row: ListingRow, item: DemoListing, sellerId: string): void {
  const metadata = row.metadata as Record<string, Json> | null;
  if (!metadata || metadata.demoSeedSet !== seedSet || metadata.listingKey !== item.listingKey
    || row.seller_id !== sellerId || row.title !== item.title || !row.description?.startsWith(disclaimer)) {
    throw new DemoError("SEED_OWNERSHIP_OR_CONTENT_MISMATCH");
  }
}

export function selectExisting(rows: ListingRow[], item: DemoListing, sellerId: string): ListingRow | undefined {
  const candidates = rows.filter(row => !row.deleted_at && (row.metadata as Record<string, Json> | null)?.listingKey === item.listingKey);
  if (candidates.length > 1) throw new DemoError("DUPLICATE_SEED_KEY_IN_DATABASE");
  const row = candidates[0];
  if (row) assertOwnedRow(row, item, sellerId);
  // Refuse to silently duplicate a legacy demo with this exact title but no marker.
  if (!row && rows.some(candidate => !candidate.deleted_at && candidate.seller_id === sellerId && candidate.title === item.title)) {
    throw new DemoError("UNMARKED_TITLE_COLLISION");
  }
  return row;
}

class DemoContext {
  readonly admin: DemoClient;
  readonly config: DemoConfig;
  readonly sessions = new Map<string, DemoClient>();
  users = new Map<string, string>();

  constructor(config: DemoConfig) {
    this.config = config;
    this.admin = newClient(config.url, config.serviceKey);
  }

  ownerEmail(item: DemoListing): string {
    if (this.config.singleOwner) return this.config.singleOwner;
    if (!this.config.ownerEmails.includes(item.landlordEmail)) throw new DemoError("OWNER_NOT_IN_ENV_ALLOWLIST");
    return item.landlordEmail;
  }

  ownerId(item: DemoListing): string {
    const id = this.users.get(this.ownerEmail(item));
    if (!id) throw new DemoError("DEMO_ACCOUNT_NOT_FOUND_NO_ACCOUNT_WAS_CREATED");
    return id;
  }

  async session(email: string): Promise<DemoClient> {
    if (!this.users.has(email)) throw new DemoError("DEMO_ACCOUNT_NOT_FOUND_NO_ACCOUNT_WAS_CREATED");
    let client = this.sessions.get(email);
    if (!client) {
      client = await signInDemo(this.config, email);
      const { data, error } = await client.auth.getUser();
      checkResult(error, "VERIFY_DEMO_SESSION");
      if (data.user?.id !== this.users.get(email)) throw new DemoError("DEMO_SESSION_OWNER_MISMATCH");
      this.sessions.set(email, client);
    }
    return client;
  }

  async getRow(id: string): Promise<ListingRow> {
    const { data, error } = await this.admin.from("rental_listings").select("*").eq("id", id).single();
    checkResult(error, "READ_LISTING");
    if (!data) throw new DemoError("LISTING_NOT_FOUND");
    return data;
  }

  async readRows(): Promise<ListingRow[]> {
    const rows: ListingRow[] = [];
    // Include title collisions as well as seed markers; scope writes later by all markers + owner.
    for (let page = 0; ; page++) {
      const { data, error } = await this.admin.from("rental_listings").select("*")
        .or(`metadata->>demoSeedSet.eq.${seedSet},title.like.[DEMO] %`).order("id").range(page * 500, page * 500 + 499);
      checkResult(error, "READ_DEMO_LISTINGS");
      rows.push(...(data ?? []));
      if (!data || data.length < 500) return rows;
    }
  }

  async mediaPaths(id: string): Promise<string[]> {
    const { data, error } = await this.admin.from("listing_media").select("storage_path").eq("listing_id", id).order("sort_order");
    checkResult(error, "READ_LISTING_MEDIA");
    return (data ?? []).map(media => media.storage_path);
  }

  async objectNames(sellerId: string, id: string): Promise<string[]> {
    const { data, error } = await this.admin.storage.from(bucket).list(`${sellerId}/${id}`, { limit: 1000 });
    checkResult(error, "LIST_STORAGE_OBJECTS");
    if ((data?.length ?? 0) >= 1000) throw new DemoError("TOO_MANY_OBJECTS_REFUSING_PREFIX_CLEANUP");
    return (data ?? []).map(object => `${sellerId}/${id}/${object.name}`);
  }

  async verifyMedia(row: ListingRow, item: DemoListing): Promise<void> {
    const expected = item.photos.map(photo => photoPath(row.seller_id, row.id, photo));
    const actual = await this.mediaPaths(row.id);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new DemoError("PUBLISHED_MEDIA_DIFFERS_FROM_FIXTURE");
    for (const photo of item.photos) {
      const { data, error } = await this.admin.storage.from(bucket).download(photoPath(row.seller_id, row.id, photo));
      checkResult(error, "READ_UPLOADED_PHOTO");
      if (!data || createHash("sha256").update(Buffer.from(await data.arrayBuffer())).digest("hex") !== photo.sha256) {
        throw new DemoError("UPLOADED_PHOTO_CHECKSUM_MISMATCH");
      }
    }
  }

  async approve(id: string, item: DemoListing, sellerId: string): Promise<void> {
    const row = await this.getRow(id);
    assertOwnedRow(row, item, sellerId);
    if (row.deleted_at || row.status !== "PendingApproval") throw new DemoError("INVALID_DEMO_APPROVAL_STATE");
    const moderatorId = this.users.get(this.config.moderatorEmail);
    if (!moderatorId) throw new DemoError("DEMO_MODERATOR_NOT_FOUND");
    const { data: roles, error: roleError } = await this.admin.from("user_roles").select("role").eq("user_id", moderatorId);
    checkResult(roleError, "READ_MODERATOR_ROLE");
    if (!roles?.some(role => role.role === "Admin" || role.role === "Moderator")) throw new DemoError("DEMO_MODERATOR_ROLE_MISSING");
    const client = await this.session(this.config.moderatorEmail);
    const { error } = await client.rpc("moderate_listing", { p_listing_id: id, p_action: "Approve", p_reason: `EXE201 demo: ${item.listingKey}` });
    checkResult(error, "MODERATE_DEMO_LISTING");
  }

  async seed(item: DemoListing, rows: ListingRow[]): Promise<{ outcome: string; id?: string }> {
    const sellerId = this.ownerId(item);
    const existing = selectExisting(rows, item, sellerId);
    if (existing && !["Draft", "Active", "PendingApproval"].includes(existing.status)) throw new DemoError("EXISTING_SEED_NOT_RESUMABLE_NO_VISIBILITY_WAS_CHANGED");
    const { data: profile, error: profileError } = await this.admin.from("profiles").select("full_name,contact_phone").eq("user_id", sellerId).single();
    checkResult(profileError, "READ_DEMO_PROFILE");
    if (!profile) throw new DemoError("DEMO_PROFILE_MISSING");
    const payload = listingPayload(item, profile);
    if (this.config.dryRun) return { outcome: existing ? "wouldResumeOrSkip" : "wouldCreate", id: existing?.id };
    if (existing?.status === "Active") {
      await this.verifyMedia(existing, item);
      if (!existing.expire_at || Date.parse(existing.expire_at) <= Date.now()) throw new DemoError("EXISTING_SEED_EXPIRED_NO_RENEWAL_WAS_PERFORMED");
      await this.verifyVisible(existing.id);
      return { outcome: "skipped", id: existing.id };
    }
    const client = await this.session(this.ownerEmail(item));
    let id = existing?.id;
    if (!id) {
      const { data, error } = await client.rpc("create_listing_with_details", { p_listing: payload, p_amenities: [], p_media: [], p_submit: false });
      checkResult(error, "CREATE_DEMO_DRAFT");
      if (!data) throw new DemoError("DRAFT_ID_MISSING");
      id = data;
    }
    let row = await this.getRow(id);
    assertOwnedRow(row, item, sellerId);
    if (row.status === "Draft" && !row.deleted_at) {
      const objects = new Set(await this.objectNames(sellerId, id));
      const expected = new Set(item.photos.map(photo => photoPath(sellerId, id!, photo)));
      if ([...objects].some(path => !expected.has(path))) throw new DemoError("UNEXPECTED_DRAFT_OBJECT_REFUSING_TO_OVERWRITE");
      const media: Json[] = [];
      for (let index = 0; index < item.photos.length; index++) {
        const photo = item.photos[index]!;
        const path = photoPath(sellerId, id, photo);
        if (!objects.has(path)) {
          const { error } = await client.storage.from(bucket).upload(path, await readPhoto(photo), { contentType: "image/webp", upsert: false });
          checkResult(error, "UPLOAD_DEMO_PHOTO");
        }
        media.push({ storage_path: path, sort_order: index, width: photo.width, height: photo.height, size_bytes: photo.sizeBytes, mime_type: "image/webp" });
      }
      // The real create RPC allocates the ID. Draft-first makes paths correct and partial uploads resumable.
      const { error: updateError } = await client.rpc("update_listing_with_details", { p_listing_id: id, p_listing: payload, p_amenities: item.amenities, p_media: media });
      checkResult(updateError, "UPDATE_DEMO_DRAFT");
      row = await this.getRow(id);
      await this.verifyMedia(row, item);
      const { error: submitError } = await client.rpc("submit_draft_listing", { p_listing_id: id });
      checkResult(submitError, "SUBMIT_DEMO_DRAFT");
      row = await this.getRow(id);
    }
    if (row.status === "PendingApproval" && !row.deleted_at) {
      await this.verifyMedia(row, item);
      await this.approve(id, item, sellerId);
    }
    row = await this.getRow(id);
    assertOwnedRow(row, item, sellerId);
    if (row.status !== "Active" || row.deleted_at) throw new DemoError("DEMO_LISTING_NOT_ACTIVE");
    await this.verifyVisible(id);
    return { outcome: existing ? "resumed" : "created", id };
  }

  async verifyVisible(id: string): Promise<void> {
    const anon = newClient(this.config.url, this.config.anonKey);
    const { data, error } = await anon.from("public_rental_listings").select("id").eq("id", id).single();
    checkResult(error, "VERIFY_PUBLIC_LISTING");
    if (data?.id !== id) throw new DemoError("LISTING_NOT_PUBLIC");
  }

  async remove(item: DemoListing, rows: ListingRow[]): Promise<{ outcome: string; ids: string[] }> {
    const sellerId = this.ownerId(item);
    const candidates = rows.filter(row => (row.metadata as Record<string, Json> | null)?.demoSeedSet === seedSet
      && (row.metadata as Record<string, Json>).listingKey === item.listingKey);
    for (const row of candidates) assertOwnedRow(row, item, sellerId);
    if (!candidates.length) return { outcome: "skipped", ids: [] };
    const ids: string[] = [];
    for (const candidate of candidates) {
      const row = await this.getRow(candidate.id);
      assertOwnedRow(row, item, sellerId);
      const expected = new Set(item.photos.map(photo => photoPath(sellerId, row.id, photo)));
      const paths = await this.mediaPaths(row.id);
      const objects = await this.objectNames(sellerId, row.id);
      if ([...paths, ...objects].some(path => !expected.has(path))) throw new DemoError("UNEXPECTED_MEDIA_REFUSING_CLEANUP");
      if (this.config.dryRun) { ids.push(row.id); continue; }
      if (!row.deleted_at) {
        const client = await this.session(this.ownerEmail(item));
        const { error } = await client.rpc("delete_listing", { p_listing_id: row.id });
        checkResult(error, "SOFT_DELETE_DEMO_LISTING");
      }
      const deleted = await this.getRow(row.id);
      assertOwnedRow(deleted, item, sellerId);
      if (!deleted.deleted_at || deleted.status !== "Hidden") throw new DemoError("SOFT_DELETE_NOT_CONFIRMED");
      // Keep media rows as a durable cleanup manifest; retry even for an already soft-deleted listing.
      if (objects.length) {
        const { error } = await this.admin.storage.from(bucket).remove(objects);
        checkResult(error, "PHOTO_CLEANUP_FAILED_RETRY_REMOVE");
      }
      if ((await this.objectNames(sellerId, row.id)).length) throw new DemoError("PHOTO_CLEANUP_INCOMPLETE_RETRY_REMOVE");
      ids.push(row.id);
    }
    return { outcome: this.config.dryRun ? "wouldRemove" : "removed", ids };
  }

  async close(): Promise<void> {
    for (const client of this.sessions.values()) {
      try { await client.auth.signOut({ scope: "local" }); } catch { /* Only revoke sessions created by this process. */ }
    }
  }
}

export async function runDemoListings(mode: "seed" | "remove"): Promise<void> {
  let release: (() => Promise<void>) | undefined;
  let context: DemoContext | undefined;
  try {
    const items = await loadDataset();
    const config = await loadConfig();
    release = await acquireProjectLock(config.url);
    context = new DemoContext(config);
    report("target", { project: new URL(config.url).host, mode, dryRun: config.dryRun, seedSet });
    const emails = items.map(item => context!.ownerEmail(item));
    context.users = await findDemoUsers(context.admin, [...new Set([...emails, config.moderatorEmail])]);
    const rows = await context.readRows();
    const counts: Record<string, number> = {};
    for (const item of items) {
      try {
        const result = mode === "seed" ? await context.seed(item, rows) : await context.remove(item, rows);
        counts[result.outcome] = (counts[result.outcome] ?? 0) + 1;
        report("listing", { listingKey: item.listingKey, title: item.title, ownerEmail: context.ownerEmail(item), ...result,
          ...("id" in result && result.id ? { route: `/#/phong/${result.id}` } : {}) });
      } catch (error) {
        counts.failed = (counts.failed ?? 0) + 1;
        report("listing", { listingKey: item.listingKey, outcome: "failed", error: safeError(error) });
      }
    }
    report("summary", { mode, ...counts });
    if (counts.failed) process.exitCode = 1;
  } catch (error) {
    report("fatal", { error: safeError(error) });
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    if (release) await release();
  }
}
