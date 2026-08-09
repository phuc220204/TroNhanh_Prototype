import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { toListingCard, type ListingCardItem } from "./listing-mappers";

/**
 * Tin đã lưu / yêu thích.
 *
 * Đặt ở `marketplace/services` theo §2.1: bảng `saved_listings` chỉ tham chiếu
 * `rental_listings`, và mọi truy vấn ở đây đều đọc tin đăng.
 *
 * ⚠️ KHÔNG hàm nào gửi `user_id` lên. Cột đó có `default auth.uid()` và policy
 * `with check (user_id = auth.uid())` — gửi từ client là mở đường cho việc lưu
 * tin vào giỏ của người khác (§6.1).
 */

/**
 * Tập id tin mà người dùng đã lưu — để tô trái tim trên danh sách.
 *
 * Trả về `Set` chứ không phải mảng: mỗi card phải hỏi "tin này đã lưu chưa" đúng
 * một lần khi render, và với danh sách 20+ card thì `Array.includes` là O(n) mỗi
 * card. Đây cũng là lý do không fetch riêng cho từng card.
 */
export async function getSavedListingIds(userId: string | undefined): Promise<Set<string>> {
  if (!userId) return new Set();
  try {
    const { data, error } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", userId);

    if (error) throw error;
    return new Set((data ?? []).map((row) => row.listing_id));
  } catch (err) {
    logError("saved-listings-service.getSavedListingIds", err);
    return new Set();
  }
}

/**
 * Danh sách tin đã lưu, đầy đủ dữ liệu để render card, mới lưu trước.
 *
 * ⚠️ `rental_listings!inner`: tin bị chủ xóa mềm (`deleted_at`) vẫn còn dòng trong
 * `saved_listings` vì FK chỉ cascade khi xóa CỨNG. Không có `!inner` + lọc
 * `deleted_at` thì trang này hiện các card rỗng không bấm được.
 */
export async function getSavedListings(userId: string | undefined): Promise<ListingCardItem[]> {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from("saved_listings")
      .select(
        "listing_id, created_at, rental_listings!inner(*, listing_amenities(amenity), listing_media(storage_path, sort_order))"
      )
      .eq("user_id", userId)
      .is("rental_listings.deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? [])
      .map((row) => (row as unknown as { rental_listings: unknown }).rental_listings)
      .filter(Boolean)
      .map((listing) => toListingCard(listing));
  } catch (err) {
    logError("saved-listings-service.getSavedListings", err);
    return [];
  }
}

/**
 * Lưu một tin. Bấm tim hai lần trên cùng một tin thì unique constraint chặn —
 * coi như đã lưu rồi, không phải lỗi để hiện cho người dùng.
 */
export async function saveListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    // Không truyền `user_id`: cột có default auth.uid().
    .insert({ listing_id: listingId });

  // 23505 = unique_violation ⇒ tin đã nằm trong danh sách, kết quả mong muốn
  // đã đạt. Ném lỗi ở đây chỉ làm trái tim nhấp nháy về trạng thái cũ.
  if (error && error.code !== "23505") {
    logError("saved-listings-service.saveListing", error);
    throw error;
  }
}

/** Bỏ lưu. RLS giới hạn phạm vi delete về đúng dòng của người gọi. */
export async function unsaveListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from("saved_listings")
    .delete()
    .eq("listing_id", listingId);

  if (error) {
    logError("saved-listings-service.unsaveListing", error);
    throw error;
  }
}
