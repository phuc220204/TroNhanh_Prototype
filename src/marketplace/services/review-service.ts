import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Service đánh giá khu trọ (luồng 4a).
 *
 * ⚠️ Điều kiện đủ tư cách KHÔNG được tính lại ở client. `can_review_contract()`
 * là nguồn chân lý duy nhất (BR-022 ≥30 ngày hoặc ≥1 payment · BR-029
 * link_status='Confirmed' · BR-030 không tự review khu của mình). Ở đây chỉ đọc
 * cờ `can_review` mà `get_my_stays()` trả về để hiển thị đúng.
 */

export interface ReviewableStay {
  occupancy_id: string;
  link_status: "Pending" | "Confirmed" | "Rejected" | null;
  occupant_name: string | null;
  contract_id: string | null;
  contract_status: string | null;
  start_date: string | null;
  end_date: string | null;
  rent_price: number | null;
  deposit: number | null;
  room_id: string | null;
  room_code: string | null;
  property_id: string | null;
  property_name: string | null;
  property_district: string | null;
  public_slug: string | null;
  is_public_profile: boolean | null;
  can_review: boolean;
  review_id: string | null;
  review_rating: number | null;
  review_content: string | null;
  review_created_at: string | null;
}

export interface ReviewItem {
  id: string;
  property_id: string;
  author_user_id: string;
  rating: number;
  content: string | null;
  status: string;
  report_count: number;
  seller_reply: string | null;
  seller_replied_at: string | null;
  created_at: string;
}

export interface PropertyPublicProfile {
  id: string;
  name: string;
  district: string | null;
  public_slug: string | null;
  avg_rating: number | null;
  review_count: number | null;
}

/**
 * Các đợt ở của tôi + cờ đủ điều kiện đánh giá.
 * Đi qua RPC vì `rooms`/`properties` là owner-only — query thẳng sẽ bị RLS lọc
 * mất row mà không báo lỗi (migration 20260731100000).
 */
export async function getMyStays(): Promise<ReviewableStay[]> {
  try {
    const { data, error } = await supabase.rpc("get_my_stays");
    if (error) throw error;
    return (data || []) as ReviewableStay[];
  } catch (err) {
    logError("review-service.getMyStays", err);
    throw err;
  }
}

/** BR-029: renter tự xác nhận. Chủ trọ KHÔNG bao giờ set 'Confirmed' hộ. */
export async function confirmOccupancyLink(occupancyId: string, accept: boolean): Promise<void> {
  try {
    const { error } = await supabase.rpc("confirm_occupancy_link", {
      p_occupancy_id: occupancyId,
      p_accept: accept,
    });
    if (error) throw error;
  } catch (err) {
    logError("review-service.confirmOccupancyLink", err);
    throw err;
  }
}

/**
 * @returns id review vừa tạo.
 * Lỗi domain: REVIEW_NOT_ELIGIBLE (BR-022), REVIEW_ALREADY_EXISTS (BR-023).
 */
export async function postReview(
  contractId: string,
  rating: number,
  content?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("post_review", {
      p_contract_id: contractId,
      p_rating: rating,
      ...(content && content.trim() ? { p_content: content.trim() } : {}),
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("review-service.postReview", err);
    throw err;
  }
}

/** Phản hồi của chủ trọ — 0..1 lần, RPC assert owns_property. */
export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  try {
    const { error } = await supabase.rpc("reply_to_review", {
      p_review_id: reviewId,
      p_reply: reply.trim(),
    });
    if (error) throw error;
  } catch (err) {
    logError("review-service.replyToReview", err);
    throw err;
  }
}

/**
 * Hồ sơ công khai của khu trọ.
 * ⚠️ ĐỌC TỪ VIEW `property_public_profiles`, KHÔNG từ bảng `properties` —
 * bảng đó chứa `bank_account_number`. View allow-list đúng 6 cột (§3.2).
 */
export async function getPropertyPublicProfile(slug: string): Promise<PropertyPublicProfile | null> {
  if (!slug) return null;
  try {
    const { data, error } = await supabase
      .from("property_public_profiles")
      .select("id, name, district, public_slug, avg_rating, review_count")
      .eq("public_slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data as PropertyPublicProfile) ?? null;
  } catch (err) {
    logError("review-service.getPropertyPublicProfile", err);
    return null;
  }
}

/**
 * Review của một khu. RLS quyết định ai thấy gì:
 * khách chỉ thấy khi khu bật public profile (BR-024), chủ khu thấy tất cả.
 */
export async function listPropertyReviews(propertyId: string): Promise<ReviewItem[]> {
  if (!propertyId) return [];
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, property_id, author_user_id, rating, content, status, report_count, seller_reply, seller_replied_at, created_at")
      .eq("property_id", propertyId)
      .neq("status", "Hidden")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as ReviewItem[];
  } catch (err) {
    logError("review-service.listPropertyReviews", err);
    throw err;
  }
}

/** Review tôi đã viết (policy "Author edits own review 7d" cho đọc lại). */
export async function getMyReviews(): Promise<ReviewItem[]> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from("reviews")
      .select("id, property_id, author_user_id, rating, content, status, report_count, seller_reply, seller_replied_at, created_at")
      .eq("author_user_id", uid)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as ReviewItem[];
  } catch (err) {
    logError("review-service.getMyReviews", err);
    throw err;
  }
}

export interface PropertyReviewSummary {
  property_id: string;
  property_name: string;
  district: string | null;
  public_slug: string | null;
  is_public_profile: boolean | null;
  avg_rating: number | null;
  review_count: number | null;
}

/**
 * Khu trọ của chính chủ trọ + số liệu đánh giá.
 *
 * Màn "Đánh giá khu trọ" cần dữ liệu của CẢ `properties` (workspace) lẫn
 * `reviews` (marketplace). §2.2 bắt mọi crossing ngoài 2 điểm nối phải nằm
 * server-side, nên gộp trong RPC thay vì để page import service của shell kia.
 * RPC chỉ trả cột allow-list — không bao giờ có bank_account_number.
 */
export async function getMyPropertiesReviewSummary(): Promise<PropertyReviewSummary[]> {
  try {
    const { data, error } = await supabase.rpc("get_my_properties_review_summary");
    if (error) throw error;
    return (data || []) as PropertyReviewSummary[];
  } catch (err) {
    logError("review-service.getMyPropertiesReviewSummary", err);
    throw err;
  }
}

/** BR-024: bật/tắt trang khu trọ công khai. Slug sinh server-side (unique index). */
export async function setPublicProfile(propertyId: string, enabled: boolean): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("set_property_public_profile", {
      p_property_id: propertyId,
      p_enabled: enabled,
    });
    if (error) throw error;
    return (data as string) || null;
  } catch (err) {
    logError("review-service.setPublicProfile", err);
    throw err;
  }
}

/** BR-023: chỉ sửa được trong 7 ngày kể từ lúc đăng. */
export function canEditReview(createdAt: string): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return Date.now() - created <= 7 * 24 * 60 * 60 * 1000;
}
