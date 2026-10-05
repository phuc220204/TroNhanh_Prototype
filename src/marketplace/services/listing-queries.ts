import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { loadVnWards, normalizeVi, searchWards } from "../../shared/utils/vn-regions";
import { toListingCard, ListingCardItem } from "./listing-mappers";

export interface ListingQueryParams {
  /**
   * Từ khóa tự do của ô tìm kiếm. Khớp tiêu đề, tên phường/xã (`district`)
   * hoặc địa chỉ (gồm quận/huyện cũ),
   * chấp nhận gõ không dấu. Chi tiết ở `buildKeywordFilter`.
   */
  keyword?: string;
  /**
   * Lọc theo tỉnh/thành (mã Cục Thống kê, mô hình 2 cấp từ 01/07/2025).
   * Đây là bậc lọc địa lý chính — người tìm trọ chọn tỉnh trước, phường sau.
   */
  provinceCode?: number | null;
  /** Lọc sâu tới phường/xã. Rỗng = lấy cả tỉnh. */
  wardCodes?: number[];
  /**
   * @deprecated Lọc theo TÊN quận cũ. Cấp quận/huyện đã bị bãi bỏ 01/07/2025
   * (Nghị quyết 1685) nên tham số này chỉ còn để đọc tin cũ chưa chuẩn hóa.
   * Code mới dùng `provinceCode` / `wardCodes`.
   */
  districts?: string[];
  priceMin?: number;
  priceMax?: number;
  priceMinExclusive?: number;
  priceMaxExclusive?: number;
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
  hasError: boolean;
}

/* ══════════════════════════════════════════════════════════════════════════
   Ô TÌM KIẾM TỪ KHÓA
══════════════════════════════════════════════════════════════════════════ */

/**
 * Trần số tên phường được nới thêm khi người dùng gõ KHÔNG DẤU. Vượt trần nghĩa
 * là từ khóa quá mơ hồ để coi là tên địa danh — "thu" khớp hàng chục phường —
 * nới tiếp chỉ làm loãng kết quả và phình URL PostgREST.
 */
const KEYWORD_WARD_EXPANSION_LIMIT = 8;
const SEARCH_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Bỏ hai ký tự THOÁT ĐƯỢC ra khỏi cặp nháy kép của PostgREST.
 *
 * `or=(a.ilike.x,b.ilike.y)` tách các vế bằng dấu phẩy và lồng nhóm bằng ngoặc
 * đơn, nên từ khóa chứa `,` `(` `)` sẽ cắt biểu thức thành các vế rác: truy vấn
 * trả 400 và người dùng thấy "0 phòng phù hợp" chứ không thấy lỗi. Cặp nháy kép
 * vô hiệu hóa những ký tự đó, nhưng chính `"` và `\` thì phá được cặp nháy —
 * chỉ hai ký tự này phải bỏ hẳn.
 */
function sanitizeKeyword(keyword: string): string {
  return keyword.replace(/["\\]/g, "").trim();
}

/** Bọc giá trị vào cặp nháy kép của PostgREST (xem `sanitizeKeyword`). */
function quoteOrValue(value: string): string {
  return `"${value}"`;
}

/**
 * Tên CÓ DẤU của các phường/xã khớp một từ khóa gõ không dấu.
 *
 * Dùng lại đúng danh mục và hàm so khớp mà `AreaSelect` dùng — không dựng bảng
 * chuyển dấu thứ hai để rồi hai chỗ lệch nhau.
 */
async function matchingWardNames(
  keyword: string,
  provinceCode: number | null | undefined,
): Promise<string[]> {
  try {
    const wards = await loadVnWards();
    // Lấy dư 1 để nhận ra "khớp quá nhiều" mà không phải duyệt hết 3.321 phần tử.
    const matched = searchWards(
      wards,
      keyword,
      provinceCode ?? null,
      KEYWORD_WARD_EXPANSION_LIMIT + 1,
    );
    // Trùng tên giữa các tỉnh là chuyện thường ("Phường 1" có ở rất nhiều nơi);
    // điều kiện tìm là so chuỗi nên mỗi TÊN chỉ cần một lần.
    const names = [...new Set(matched.map((w) => w.name))];
    return names.length > KEYWORD_WARD_EXPANSION_LIMIT ? [] : names;
  } catch (err) {
    // Danh mục chỉ là phần NỚI THÊM: tải hỏng thì vẫn tìm theo chuỗi thô, không
    // để cả ô tìm kiếm chết theo.
    logError("listing-queries.matchingWardNames", err);
    return [];
  }
}

/**
 * Điều kiện `or` cho ô từ khóa: khớp tiêu đề, tên phường/xã hoặc địa chỉ.
 *
 * `district` là tên phường theo địa giới mới, còn `address` có thể chứa quận
 * cũ. Chỉ so title/district khiến "Quận 7" ra 0 dù địa chỉ tin RMIT có Quận 7.
 *
 * `district` là TÊN HIỂN THỊ của phường/xã tại thời điểm đăng tin (migration
 * `20260809100000`), tức đúng cột chứa địa danh mà người dùng gõ.
 *
 * Gõ KHÔNG DẤU ("thu duc") thì `ilike` bó tay: project này không bật extension
 * `unaccent` (xem `20260725100200` và `20260731100000`). Thay vì so khớp không
 * dấu ở DB, tra ngược từ khóa trong danh mục phường/xã rồi nới điều kiện bằng
 * đúng tên CÓ DẤU của những phường khớp.
 */
async function buildKeywordFilter(
  keyword: string,
  provinceCode: number | null | undefined,
): Promise<string | null> {
  const cleaned = sanitizeKeyword(keyword);
  if (!cleaned) return null;

  const clauses = new Set<string>();
  const raw = quoteOrValue(`%${cleaned}%`);
  clauses.add(`title.ilike.${raw}`);
  clauses.add(`district.ilike.${raw}`);
  clauses.add(`address.ilike.${raw}`);

  // Chỉ tra danh mục khi từ khóa không có dấu: gõ có dấu thì `ilike` đã khớp
  // thẳng, tra thêm chỉ tốn một chunk 117KB mà không đổi kết quả.
  if (normalizeVi(cleaned) === cleaned.toLowerCase()) {
    for (const name of await matchingWardNames(cleaned, provinceCode)) {
      clauses.add(`district.ilike.${quoteOrValue(`%${name}%`)}`);
    }
  }

  return [...clauses].join(",");
}

/**
 * Search and filter rental listings from Supabase DB.
 * Chỉ ưu tiên Boost có cờ xác nhận bởi webhook thanh toán; ngày Boost legacy
 * tự nhập không được dùng để xếp hạng. Server-side filtering uses PostgREST.
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
    if (params.provinceCode != null) {
      q = q.eq("province_code", params.provinceCode);
    }
    if (params.wardCodes && params.wardCodes.length > 0) {
      q = q.in("ward_code", params.wardCodes);
    }
    if (params.districts && params.districts.length > 0) {
      q = q.in("district", params.districts);
    }
    if (params.priceMin != null) {
      q = q.gte("price", params.priceMin);
    }
    if (params.priceMinExclusive != null) {
      q = q.gt("price", params.priceMinExclusive);
    }
    if (params.priceMax != null) {
      q = q.lte("price", params.priceMax);
    }
    if (params.priceMaxExclusive != null) {
      q = q.lt("price", params.priceMaxExclusive);
    }
    if (params.areaMin != null) {
      q = q.gte("area", params.areaMin);
    }
    if (params.areaMax != null) {
      q = q.lte("area", params.areaMax);
    }
    if (params.keyword) {
      const keywordFilter = await buildKeywordFilter(params.keyword, params.provinceCode);
      if (keywordFilter) q = q.or(keywordFilter);
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
        .or(orExpr)
        .abortSignal(AbortSignal.timeout(SEARCH_REQUEST_TIMEOUT_MS));

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
          hasError: false,
        };
      }

      q = q.in("id", listingIds);
    }

    const sort = params.sort || "newest";
    if (sort === "price-asc" || sort === "priceAsc") {
      // Khi người dùng yêu cầu sắp theo giá, giá phải là khóa CHÍNH. Trước đây
      // `boost_expire_at` luôn đứng trước nên kết quả chỉ tăng/giảm trong từng
      // nhóm boost, tạo chuỗi kiểu 4,5 → 5,5 → 4,2 triệu.
      q = q
        .order("price", { ascending: true })
        .order("created_at", { ascending: false });
    } else if (sort === "price-desc" || sort === "priceDesc") {
      q = q
        .order("price", { ascending: false })
        .order("created_at", { ascending: false });
    } else if (sort === "area-desc" || sort === "areaDesc") {
      q = q
        .order("area", { ascending: false })
        .order("created_at", { ascending: false });
    } else {
      if (statusFilter === "Active" && !params.sellerId) {
        // BR-005: chỉ tin CÒN HẠN Boost (đã thanh toán) đứng trước. `is_boost_active`
        // là computed field (migration 20261006100000) — sắp theo
        // `boost_payment_verified` thì tin hết hạn vẫn đứng đầu mãi.
        q = q
          .order("is_boost_active", { ascending: false })
          .order("created_at", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }
    }

    const page = params.page || 1;
    const pageSize = params.pageSize || 12;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    q = q.range(from, to).abortSignal(AbortSignal.timeout(SEARCH_REQUEST_TIMEOUT_MS));

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
        .in("id", propertyIds)
        .abortSignal(AbortSignal.timeout(SEARCH_REQUEST_TIMEOUT_MS));

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
      hasError: false,
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
      hasError: true,
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
 * Không bù tin ở khu vực khác: UI đặt tiêu đề theo khu vực hiện tại, nên việc
 * trộn phường khác vào cùng khối tạo một lời hứa sai cho người xem.
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
      return filtered;
    }
    return [];
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
    const { error } = await supabase.rpc(
      "increment_listing_view" as never,
      { p_listing_id: id } as never,
    );
    if (error) throw error;
  } catch (err) {
    logError("listing-queries.incrementViewCount", err);
  }
}
