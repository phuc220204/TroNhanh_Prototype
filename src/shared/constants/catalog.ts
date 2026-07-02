/* ══════════════════════════════════════════
   CATALOG — Danh mục chuẩn hóa dùng chung
   Theo PRD mục 9. Import file này ở mọi trang marketplace.
   ══════════════════════════════════════════ */

/**
 * Loại hình cho thuê.
 * "Ở ghép" KHÔNG phải loại phòng cho thuê — thuộc DemandPost (RoommateWanted).
 */
export const PROPERTY_TYPES = [
  "Phòng trọ",
  "Căn hộ mini",
  "Căn hộ dịch vụ",
  "Ký túc xá",
  "Nhà nguyên căn",
] as const;

/** Khoảng giá thống nhất cho bộ lọc (dùng chung Landing / Search / AllListing) */
export const PRICE_RANGES = [
  "Dưới 2 triệu",
  "2 – 4 triệu",
  "4 – 6 triệu",
  "Trên 6 triệu",
] as const;

/** Tiện ích chuẩn (7 mục) */
export const AMENITIES = [
  "Máy lạnh",
  "Wifi",
  "Gác lửng",
  "Chỗ để xe",
  "WC riêng",
  "Giờ giấc tự do",
  "Cho nuôi thú cưng",
] as const;

/** Khu vực / Quận — danh sách hiển thị trong bộ lọc */
export const REGIONS = [
  "Quận 7",
  "Bình Thạnh",
  "Thủ Đức",
  "Gò Vấp",
  "Quận 10",
  "Quận 12",
] as const;

/** Diện tích */
export const AREA_RANGES = [
  "Dưới 20 m²",
  "20 – 30 m²",
  "30 – 45 m²",
  "Trên 45 m²",
] as const;

/** Tagline chuẩn — tránh claim "Nền tảng #1" */
export const TAGLINE = "Tìm trọ nhanh — Quản lý gọn";
