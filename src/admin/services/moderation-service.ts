import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Service kiểm duyệt.
 *
 * ⚠️ Mọi thay đổi trạng thái tin đăng PHẢI đi qua RPC `moderate_listing`.
 * Moderator CỐ Ý không có policy UPDATE trên `rental_listings` — đó là thứ buộc
 * mọi transition ghi lại `moderation_logs`. Thêm một lệnh `.update()` ở đây là
 * phá cơ chế audit, không phải tối ưu (CLAUDE.md §2.3, task T21).
 *
 * Đọc thì dựa vào policy "Moderator views all listings" (migration 20260728090000).
 */

export type ModerationAction = "Approve" | "Reject" | "Hide" | "Restore";

/** Bộ lọc của hàng chờ. "All" = mọi trạng thái. */
export type ModerationFilter = "PendingApproval" | "Rejected" | "Active" | "All";

export interface ModerationRow {
  id: string;
  title: string;
  price: number;
  district: string;
  address: string | null;
  status: string;
  created_at: string;
  seller_id: string;
  rejection_reason: string | null;
  moderated_at: string | null;
  listing_media?: { storage_path: string; sort_order: number }[];
}

export async function listListingsForModeration(
  filter: ModerationFilter = "PendingApproval"
): Promise<ModerationRow[]> {
  try {
    let query = supabase
      .from("rental_listings")
      .select("id, title, price, district, address, status, created_at, seller_id, rejection_reason, moderated_at, listing_media(storage_path, sort_order)")
      .is("deleted_at", null)
      // Tin chờ duyệt lâu nhất lên trước — hàng chờ phải vơi theo thứ tự.
      .order("created_at", { ascending: filter === "PendingApproval" });

    if (filter !== "All") query = query.eq("status", filter);

    const { data, error } = await query.limit(200);
    if (error) throw error;
    return (data || []) as ModerationRow[];
  } catch (err) {
    logError("moderation-service.listListingsForModeration", err);
    throw err;
  }
}

/**
 * @param reason bắt buộc khi action = "Reject" (FR-064).
 * RPC cũng raise REASON_REQUIRED — chặn ở cả hai lớp là cố ý.
 */
export async function moderateListing(
  listingId: string,
  action: ModerationAction,
  reason?: string
): Promise<void> {
  try {
    const { error } = await supabase.rpc("moderate_listing", {
      p_listing_id: listingId,
      p_action: action,
      ...(reason && reason.trim() ? { p_reason: reason.trim() } : {}),
    });
    if (error) throw error;
  } catch (err) {
    logError("moderation-service.moderateListing", err);
    throw err;
  }
}

export interface ReportedReviewRow {
  id: string;
  property_id: string;
  rating: number;
  content: string | null;
  status: string;
  report_count: number;
  created_at: string;
}

/** Dựa vào policy "Moderator reads all reviews" (migration 20260728090000). */
export async function listReportedReviews(): Promise<ReportedReviewRow[]> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, property_id, rating, content, status, report_count, created_at")
      .gt("report_count", 0)
      .neq("status", "Hidden")
      .is("deleted_at", null)
      .order("report_count", { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []) as ReportedReviewRow[];
  } catch (err) {
    logError("moderation-service.listReportedReviews", err);
    throw err;
  }
}

export async function hideReview(reviewId: string, reason: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("hide_review", {
      p_review_id: reviewId,
      p_reason: reason,
    });
    if (error) throw error;
  } catch (err) {
    logError("moderation-service.hideReview", err);
    throw err;
  }
}
