import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/**
 * Đếm hoạt động của chính người đang đăng nhập, cho trang tổng quan tài khoản.
 *
 * ⚠️ ĐẶT Ở `marketplace/services` CHỨ KHÔNG PHẢI `shared/` (§2.1): ba bảng dưới
 * đây — `rental_listings`, `demand_posts`, `saved_listings` — đều thuộc
 * marketplace. Bản đầu tôi viết chung vào `shared/profile-service.ts` cho tiện,
 * và đó đúng kiểu bào mòn ranh giới mà §2.1 sinh ra để chặn: `shared/` mà query
 * thẳng bảng của shell khác thì luật chỉ còn là lời khuyên.
 */
export interface MyActivityCounts {
  rentalListings: number;
  demandPosts: number;
  savedListings: number;
}

/**
 * Bọc một lời đếm: lỗi ở một bảng KHÔNG làm hỏng cả trang, mỗi số rơi về 0 độc
 * lập. Tổng quan là màn phụ trợ; chết cả trang chỉ vì đếm hụt một bảng thì
 * không đáng.
 */
async function safeCount(
  scope: string,
  run: () => PromiseLike<{ count: number | null; error: unknown }>,
): Promise<number> {
  try {
    const { count, error } = await run();
    if (error) throw error;
    return count ?? 0;
  } catch (err) {
    logError(`my-activity-service.${scope}`, err);
    return 0;
  }
}

/**
 * `head: true` + `count: "exact"` nên Postgres chỉ đếm, không trả row — trang
 * này chỉ cần con số, kéo cả danh sách về rồi `.length` là lãng phí.
 *
 * Ba truy vấn viết TƯỜNG MINH thay vì một helper nhận tên bảng dạng union:
 * generic của `supabase-js` nở theo số bảng, và union ba bảng đủ để `tsc` ném
 * "Type instantiation is excessively deep".
 */
export async function getMyActivityCounts(): Promise<MyActivityCounts> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return { rentalListings: 0, demandPosts: 0, savedListings: 0 };

  const [rentalListings, demandPosts, savedListings] = await Promise.all([
    safeCount("rental_listings", () =>
      supabase
        .from("rental_listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", uid)
        .is("deleted_at", null),
    ),
    safeCount("demand_posts", () =>
      supabase
        .from("demand_posts")
        .select("id", { count: "exact", head: true })
        .eq("renter_id", uid)
        .is("deleted_at", null),
    ),
    // `saved_listings` không có cột xóa mềm.
    safeCount("saved_listings", () =>
      supabase
        .from("saved_listings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid),
    ),
  ]);

  return { rentalListings, demandPosts, savedListings };
}
