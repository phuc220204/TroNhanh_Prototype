/**
 * Listing Data Mappers & Helpers
 * Central home for image fallbacks, amenity keys, property type keys, and DB row to UI card conversion.
 */

export const DEFAULT_IMAGES: string[] = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80",
  "https://images.unsplash.com/photo-1489171078254-c3365d6e359f?w=600&q=80",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80",
];

export const getListingImage = (idStr: string): string => {
  if (!idStr) return DEFAULT_IMAGES[0]!;
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % DEFAULT_IMAGES.length;
  return DEFAULT_IMAGES[idx]!;
};

export const mapAmenityToKey = (amenity: string): string => {
  const norm = amenity.toLowerCase().trim();
  if (norm.includes("wifi")) return "wifi";
  if (norm.includes("máy lạnh") || norm.includes("ac") || norm.includes("điều hòa")) return "ac";
  if (norm.includes("gác")) return "loft";
  if (norm.includes("xe")) return "parking";
  if (norm.includes("wc") || norm.includes("phòng tắm") || norm.includes("toilet") || norm.includes("khép kín")) return "bath";
  if (norm.includes("tự do") || norm.includes("giờ giấc")) return "clock";
  if (norm.includes("thú cưng") || norm.includes("pet")) return "pets";
  // Trả "other" chứ KHÔNG rơi về "wifi". Catch-all cũ bịa ra tiện ích không có
  // thật, và tệ hơn: một tin vừa có "Wifi" vừa có tiện ích lạ sẽ sinh HAI phần
  // tử cùng key "wifi" ⇒ React cảnh báo trùng key và có thể bỏ sót node.
  // Chỗ render đã có nhánh `if (!m) return null` nên key lạ chỉ đơn giản không
  // hiện, thay vì hiện sai.
  return "other";
};

export const mapTypeToKey = (type: string): string => {
  const norm = type.toLowerCase().trim();
  if (norm.includes("trọ")) return "room";
  if (norm.includes("mini")) return "mini";
  if (norm.includes("dịch vụ")) return "apartment";
  if (norm.includes("ký túc xá") || norm.includes("ktx")) return "ktx";
  if (norm.includes("nguyên căn")) return "house";
  return "room";
};

import { publicUrl } from "../../shared/services/media-service";

/**
 * Return listing image URLs prioritizing listing_media database table, or falling back to deterministic Unsplash images.
 */
export function listingImageUrls(row: any): string[] {
  if (row?.listing_media && Array.isArray(row.listing_media) && row.listing_media.length > 0) {
    const sorted = [...row.listing_media].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    const paths = sorted.map((m: any) => publicUrl(m.storage_path)).filter(Boolean);
    if (paths.length > 0) return paths;
  }
  if (row?.images && Array.isArray(row.images) && row.images.length > 0) {
    return row.images.map((img: string) => publicUrl(img));
  }
  return [getListingImage(row?.id ? String(row.id) : "fallback")];
}

export interface ListingCardItem {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  area: number;
  loc: string;
  amenities: string[];
  type: string;
  badge: "Nổi bật" | "Mới đăng" | null;
  img: string;
  contact_phone: string;
  boost_expire_at: string | null;
  created_at: string;
  views_count?: number;
  /** BR-024 — chỉ có giá trị khi khu bật trang công khai. null = không hiện badge. */
  rating?: number | null;
  reviewCount?: number;
  propertySlug?: string | null;
}

/**
 * Map DB row from rental_listings to standardized ListingCardItem.
 */
export function toListingCard(row: any): ListingCardItem {
  // Chỉ định dạng SỐ TIỀN, cố ý KHÔNG kèm "/tháng".
  //
  // Bản cũ trả sẵn "5,5 tr/tháng", nhưng mọi card lại ghép thêm " đ" và
  // "/tháng" của riêng nó để cho kỳ hạn cỡ chữ nhỏ hơn — ra "5,5 tr/tháng
  // đ/tháng" trên Trang chủ, Tất cả phòng, Tìm phòng và khối "Phòng tương tự".
  // Một chuỗi mang sẵn đơn vị thì chỗ hiển thị không tách được cỡ chữ, nên nơi
  // nào cũng phải nối tay và sớm muộn cũng lệch nhau.
  // Giờ: formatter lo tiền, card lo kỳ hạn.
  const priceNum = Number(row?.price || 0);
  const formattedPrice = priceNum >= 1_000_000
    ? `${(priceNum / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr`
    : `${priceNum.toLocaleString("vi-VN")} đ`;

  const rawAmenities = row?.listing_amenities
    ? row.listing_amenities.map((a: any) => a.amenity)
    : Array.isArray(row?.amenities)
    ? row.amenities
    : [];

  const isBoosted = row?.boost_expire_at && new Date(row.boost_expire_at) > new Date();

  let badge: "Nổi bật" | "Mới đăng" | null = null;
  if (isBoosted) {
    badge = "Nổi bật";
  } else if (row?.created_at) {
    const created = new Date(row.created_at);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (diffHours <= 72) badge = "Mới đăng";
  }

  const imgs = listingImageUrls(row);

  return {
    id: String(row.id),
    title: row.title || "Phòng trọ",
    price: formattedPrice,
    priceNum,
    area: Number(row.area || 0),
    loc: row.district ? `${row.district}, TP.HCM` : (row.address || "TP.HCM"),
    amenities: rawAmenities,
    type: row.property_type || "Phòng trọ",
    badge,
    img: imgs[0] || getListingImage(row?.id ? String(row.id) : "fallback"),
    contact_phone: row.contact_phone || "0901234567",
    boost_expire_at: row.boost_expire_at || null,
    created_at: row.created_at || new Date().toISOString(),
    views_count: row.view_count || row.views_count || 0,
  };
}
