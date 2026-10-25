import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../src/shared/types/database.types";
import { ACCOUNTS, DEMO_PASSWORD } from "./helpers";
import { getE2eSupabaseEnv } from "./e2e-env";

/**
 * Dọn mọi bản ghi do bộ E2E tạo — nhận diện bằng dấu `-e2e-` mà `runTag()`
 * gắn vào tiêu đề/tên.
 *
 * Quét theo dấu thay vì nhớ id từng bản ghi: một lần chạy chết giữa chừng (hoặc
 * bị kill) vẫn được lần chạy sau dọn hộ. Đó là lý do 16/10/2026 phải xóa tay 30
 * tin nhu cầu — bộ test cũ không có bước dọn nào.
 *
 * Đi đúng đường của app, KHÔNG dùng service_role: đăng nhập bằng anon key +
 * tài khoản demo, nên RLS/RPC giới hạn việc xóa trong dữ liệu của chính tài
 * khoản đó. Mọi thao tác là XÓA MỀM (`deleted_at`).
 *
 * Không dọn được (không có đường hợp lệ cho client): tài khoản `auth.spec` tạo,
 * đánh giá + phản hồi của `review.spec`, cuộc trò chuyện của `messaging.spec`.
 * Xem bảng ở `tests/e2e/README.md` §1.3.
 */

/** Pattern `ilike` khớp `runTag()` — `-e2e-<base36>`. */
const E2E_TAG_PATTERN = "%-e2e-%";

const CLEANUP_ACCOUNTS = [ACCOUNTS.renterA, ACCOUNTS.sellerA, ACCOUNTS.sellerB] as const;

export interface CleanupReport {
  demandPosts: number;
  listings: number;
  properties: number;
  failures: string[];
}

type E2eClient = SupabaseClient<Database>;

async function signIn(email: string): Promise<{ client: E2eClient; userId: string }> {
  const { url, anonKey } = getE2eSupabaseEnv();
  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return { client, userId: data.user.id };
}

/** Giống `deleteDemandPost()` của app: update `deleted_at`, RLS chặn tin người khác. */
async function cleanDemandPosts(client: E2eClient, userId: string, report: CleanupReport) {
  const { data, error } = await client
    .from("demand_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("renter_id", userId)
    .ilike("title", E2E_TAG_PATTERN)
    .is("deleted_at", null)
    .select("id");
  if (error) throw error;
  report.demandPosts += data.length;
}

/** Qua RPC `delete_listing` — cùng đường với nút xóa ở `/tai-khoan/tin-cho-thue`. */
async function cleanListings(client: E2eClient, userId: string, report: CleanupReport) {
  const { data, error } = await client
    .from("rental_listings")
    .select("id, title")
    .eq("seller_id", userId)
    .ilike("title", E2E_TAG_PATTERN)
    .is("deleted_at", null);
  if (error) throw error;

  for (const listing of data) {
    const { error: deleteError } = await client.rpc("delete_listing", { p_listing_id: listing.id });
    if (deleteError) report.failures.push(`tin đăng "${listing.title}": ${deleteError.message}`);
    else report.listings += 1;
  }
}

/**
 * Qua RPC `soft_delete_property` (xóa mềm cả phòng). RPC giữ BR-011: khu còn
 * phòng `Rented` thì từ chối — khi đó ghi vào `failures`, không lách guard.
 */
async function cleanProperties(client: E2eClient, userId: string, report: CleanupReport) {
  const { data, error } = await client
    .from("properties")
    .select("id, name")
    .eq("owner_id", userId)
    .ilike("name", E2E_TAG_PATTERN)
    .is("deleted_at", null);
  if (error) throw error;

  for (const property of data) {
    const { error: deleteError } = await client.rpc("soft_delete_property", {
      p_property_id: property.id,
    });
    if (deleteError) report.failures.push(`khu "${property.name}": ${deleteError.message}`);
    else report.properties += 1;
  }
}

export async function cleanupE2eRecords(): Promise<CleanupReport> {
  const report: CleanupReport = { demandPosts: 0, listings: 0, properties: 0, failures: [] };

  for (const email of CLEANUP_ACCOUNTS) {
    try {
      const { client, userId } = await signIn(email);
      try {
        await cleanDemandPosts(client, userId, report);
        await cleanListings(client, userId, report);
        await cleanProperties(client, userId, report);
      } finally {
        await client.auth.signOut();
      }
    } catch (err) {
      // PostgrestError/AuthError không phải lúc nào cũng là `instanceof Error`.
      const message =
        typeof err === "object" && err !== null && "message" in err ? String(err.message) : String(err);
      report.failures.push(`${email}: ${message}`);
    }
  }

  return report;
}
