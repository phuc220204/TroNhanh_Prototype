import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { toListingCard, ListingCardItem } from "./listing-mappers";

export interface ListingQueryParams {
  keyword?: string;
  districts?: string[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  propertyTypes?: string[];
  amenities?: string[];
  sort?: "newest" | "price-asc" | "price-desc" | "area-desc" | "priceAsc" | "priceDesc" | "areaDesc";
  page?: number;
  pageSize?: number;
  /**
   * Mặc định "Active". Truyền "All" để BỎ lọc trạng thái — dùng cho trang quản
   * lý tin của chính người bán, nơi phải thấy cả Chờ duyệt / Bị từ chối / Đã ẩn.
   * RLS vẫn là biên thật: khách chỉ đọc được tin Active, người bán đọc được tin
   * của mình, Moderator đọc được tất cả.
   */
  status?: string;
  sellerId?: string;
}

export interface SearchListingsResult {
  data: ListingCardItem[];
  rawRows: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Search and filter rental listings from Supabase DB.
 * ⚠️ Enforces BR-005 ordering rule: boost_expire_at DESC NULLS LAST is applied FIRST before any secondary sort.
 * Server-side filtering using .in(), .gte(), .lte(), .ilike(), .range().
 */
export async function searchListings(params: ListingQueryParams = {}): Promise<SearchListingsResult> {
  try {
    let q = supabase
      .from("rental_listings")
      .select("*, listing_amenities(amenity), listing_media(storage_path, sort_order)", { count: "exact" })
      .is("deleted_at", null);

    const statusFilter = params.status || "Active";
    if (statusFilter !== "All") {
      q = q.eq("status", statusFilter);
    }

    if (params.sellerId) {
      q = q.eq("seller_id", params.sellerId);
    }
    if (params.districts && params.districts.length > 0) {
      q = q.in("district", params.districts);
    }
    if (params.priceMin != null) {
      q = q.gte("price", params.priceMin);
    }
    if (params.priceMax != null) {
      q = q.lte("price", params.priceMax);
    }
    if (params.areaMin != null) {
      q = q.gte("area", params.areaMin);
    }
    if (params.areaMax != null) {
      q = q.lte("area", params.areaMax);
    }
    if (params.keyword && params.keyword.trim()) {
      q = q.ilike("title", `%${params.keyword.trim()}%`);
    }
    if (params.propertyTypes && params.propertyTypes.length > 0) {
      q = q.in("property_type", params.propertyTypes);
    }

    // ── Lọc tiện ích: PHẢI xong TRƯỚC .range(), nếu không phân trang sai ────
    //
    // Không lọc được bằng một câu duy nhất vì (a) cần ngữ nghĩa AND qua bảng
    // con listing_amenities, và (b) nhãn lưu trong DB không khớp tuyệt đối với
    // nhãn trên bộ lọc ("Wifi" vs "Wifi tốc độ cao") nên phải so khớp mờ.
    //
    // Cách làm: lấy trước tập listing_id thoả TẤT CẢ tiện ích, rồi đưa vào
    // .in("id", …) của câu chính — nhờ vậy `count: exact` và `.range()` đều
    // tính trên đúng tập đã lọc.
    if (params.amenities && params.amenities.length > 0) {
      const wanted = params.amenities;
      const orExpr = wanted.map((a) => `amenity.ilike.%${a}%`).join(",");

      const { data: amenityRows, error: amenityError } = await supabase
        .from("listing_amenities")
        .select("listing_id, amenity")
        .or(orExpr);

      if (amenityError) throw amenityError;

      // Gom theo listing: mỗi listing phải khớp ĐỦ số tiện ích được yêu cầu
      const matchedByListing = new Map<string, Set<string>>();
      for (const row of amenityRows ?? []) {
        const hit = wanted.filter((a) =>
          row.amenity.toLowerCase().includes(a.toLowerCase()),
        );
        if (hit.length === 0) continue;
        const set = matchedByListing.get(row.listing_id) ?? new Set<string>();
        hit.forEach((h) => set.add(h));
        matchedByListing.set(row.listing_id, set);
      }

      const listingIds = [...matchedByListing.entries()]
        .filter(([, set]) => set.size === wanted.length)
        .map(([listingId]) => listingId);

      if (listingIds.length === 0) {
        const emptyPageSize = params.pageSize || 12;
        return {
          data: [],
          rawRows: [],
          totalCount: 0,
          page: params.page || 1,
          pageSize: emptyPageSize,
          totalPages: 1,
        };
      }

      q = q.in("id", listingIds);
    }

    // BR-005 — Boosted listings are sorted first
    q = q.order("boost_expire_at", { ascending: false, nullsFirst: false });

    const sort = params.sort || "newest";
    if (sort === "price-asc" || sort === "priceAsc") {
      q = q.order("price", { ascending: true });
    } else if (sort === "price-desc" || sort === "priceDesc") {
      q = q.order("price", { ascending: false });
    } else if (sort === "area-desc" || sort === "areaDesc") {
      q = q.order("area", { ascending: false });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 12;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to);

    const { data, count, error } = await q;

    if (error) throw error;

    // Không lọc gì thêm ở đây: mọi bộ lọc (kể cả tiện ích) đã chạy ở server
    // TRƯỚC .range(), nên `rows` chính là đúng trang cần hiển thị và `count`
    // là tổng thật của tập đã lọc.
    const rows = data || [];

    const totalCount = count ?? rows.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const mappedCards = rows.map(toListingCard);

    // BR-024: huy hiệu điểm sao chỉ hiện khi tin có `property_id` VÀ khu đã bật
    // trang công khai. `property_public_profiles` là VIEW đã tự lọc điều kiện
    // đó, nên khu chưa bật đơn giản là không có row -> không có badge.
    // Một truy vấn cho cả trang, không phải mỗi card một lần.
    const propertyIds = Array.from(
      new Set(rows.map((r: any) => r.property_id).filter(Boolean))
    ) as string[];

    if (propertyIds.length > 0) {
      const { data: profiles } = await supabase
        .from("property_public_profiles")
        .select("id, avg_rating, review_count, public_slug")
        .in("id", propertyIds);

      const byId = new Map((profiles || []).map((p) => [p.id, p]));
      for (let i = 0; i < mappedCards.length; i++) {
        const propertyId = (rows[i] as any)?.property_id;
        const profile = propertyId ? byId.get(propertyId) : undefined;
        if (profile) {
          mappedCards[i]!.rating = profile.avg_rating != null ? Number(profile.avg_rating) : null;
          mappedCards[i]!.reviewCount = profile.review_count ?? 0;
          mappedCards[i]!.propertySlug = profile.public_slug ?? null;
        }
      }
    }

    return {
      data: mappedCards,
      rawRows: rows,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (err) {
    logError("listing-queries.searchListings", err);
    return {
      data: [],
      rawRows: [],
      totalCount: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 12,
      totalPages: 1,
    };
  }
}

/**
 * Fetch top featured/boosted listings for HomePage.
 */
export async function getFeaturedListings(limit = 6): Promise<ListingCardItem[]> {
  const result = await searchListings({
    status: "Active",
    pageSize: limit,
    page: 1,
  });
  return result.data;
}

/**
 * Fetch listing detail by ID with media, amenities, property details, and owner profile.
 */
export async function getListingById(id: string) {
  try {
    const { data, error } = await supabase
      .from("rental_listings")
      .select("*, listing_amenities(*), listing_media(*), properties(*)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (err) {
    logError("listing-queries.getListingById", err);
    return null;
  }
}

/**
 * Tin cho thuê tương tự một tin đang xem — cùng quận, giá xê xích ±30%.
 *
 * Thay cho hằng số `SIMILAR_ROOMS` cứng trong `RoomDetailPage`: khối "Phòng
 * tương tự" trước đây hiện đúng 3 tin bịa ("Studio Full Nội Thất Quận 10", ảnh
 * Unsplash) trên MỌI tin, kể cả tin ở tỉnh khác. Vi phạm §11 (mock cứng trong
 * component khi đã có bảng thật) và là thứ người xem demo phát hiện ngay.
 *
 * Nới dần: hết tin cùng quận thì trả tin cùng khoảng giá ở quận khác, để khối
 * này không rỗng trên một marketplace còn ít dữ liệu.
 */
export async function getSimilarListings(
  currentListingId: string,
  district: string | null | undefined,
  price: number | null | undefined,
  limit = 3
): Promise<ListingCardItem[]> {
  if (!currentListingId) return [];

  const basePrice = Number(price) || 0;
  const priceMin = basePrice > 0 ? Math.round(basePrice * 0.7) : undefined;
  const priceMax = basePrice > 0 ? Math.round(basePrice * 1.3) : undefined;

  const exclude = (rows: ListingCardItem[]) =>
    rows.filter((r) => r.id !== currentListingId).slice(0, limit);

  try {
    if (district) {
      const sameDistrict = await searchListings({
        districts: [district],
        priceMin,
        priceMax,
        status: "Active",
        pageSize: limit + 1, // +1 vì tin đang xem cũng khớp điều kiện
        page: 1,
      });
      const filtered = exclude(sameDistrict.data);
      if (filtered.length >= limit) return filtered;

      // Chưa đủ: bù thêm tin cùng khoảng giá ở quận khác, không trùng id.
      const wider = await searchListings({
        priceMin,
        priceMax,
        status: "Active",
        pageSize: limit * 3,
        page: 1,
      });
      const seen = new Set([currentListingId, ...filtered.map((r) => r.id)]);
      const extra = wider.data.filter((r) => !seen.has(r.id));
      return [...filtered, ...extra].slice(0, limit);
    }

    const anyDistrict = await searchListings({
      priceMin,
      priceMax,
      status: "Active",
      pageSize: limit + 1,
      page: 1,
    });
    return exclude(anyDistrict.data);
  } catch (err) {
    logError("listing-queries.getSimilarListings", err);
    return [];
  }
}

/**
 * Fetch all listings owned by a specific seller.
 */
export async function getMyListings(sellerId: string): Promise<ListingCardItem[]> {
  if (!sellerId) return [];
  const result = await searchListings({
    sellerId,
    status: "Active",
    pageSize: 100,
    page: 1,
  });
  return result.data;
}

/**
 * Increment view count for a listing.
 */
export async function incrementViewCount(id: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("rental_listings")
      .select("view_count")
      .eq("id", id)
      .single();

    const currentViews = data?.view_count || 0;
    await supabase
      .from("rental_listings")
      .update({ view_count: currentViews + 1 })
      .eq("id", id);
  } catch (err) {
    logError("listing-queries.incrementViewCount", err);
  }
}
