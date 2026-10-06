import type { ListingBadge } from "../../services/listing-mappers";
import { PROPERTY_TYPES, PRICE_RANGES } from "../../../shared/constants/catalog";
import { provinceName } from "../../../shared/utils/vn-regions";

export interface SearchFilters {
  /** Từ khóa tự do từ ô tìm kiếm (`?loc=`). */
  keyword: string;
  provinceCode: number | null;
  wardCode: number | null;
  priceLabel: string;
  type: string;
  area: string;
  amenities: string[];
}

export type SearchSort = "newest" | "price-asc" | "price-desc" | "area-desc";

export type SearchRoom = {
  id: string;
  title: string;
  price: string;
  priceNum: number;
  area: number;
  loc: string;
  amenities: string[];
  type: string;
  badge: ListingBadge | null;
  postedAt: string | null;
  img: string;
  contact_phone: string;
  boost_expire_at: string | null;
};

export function emptySearchFilters(): SearchFilters {
  return {
    keyword: "",
    provinceCode: null,
    wardCode: null,
    priceLabel: "",
    type: "Tất cả",
    area: "",
    amenities: [],
  };
}

export function filtersFromSearch(search: string): SearchFilters {
  const params = new URLSearchParams(search);
  const requestedType = params.get("type") || "Tất cả";
  const requestedPrice = params.get("price") || "";

  return {
    ...emptySearchFilters(),
    keyword: params.get("loc")?.trim() || "",
    type: PROPERTY_TYPES.some((type) => type === requestedType) ? requestedType : "Tất cả",
    priceLabel: PRICE_RANGES.some((range) => range === requestedPrice) ? requestedPrice : "",
  };
}

export function areSearchFiltersEqual(left: SearchFilters, right: SearchFilters): boolean {
  return (
    left.keyword === right.keyword &&
    left.provinceCode === right.provinceCode &&
    left.wardCode === right.wardCode &&
    left.priceLabel === right.priceLabel &&
    left.type === right.type &&
    left.area === right.area &&
    left.amenities.length === right.amenities.length &&
    left.amenities.every((amenity, index) => amenity === right.amenities[index])
  );
}

export function getActiveSearchChips(filters: SearchFilters): string[] {
  const chips: string[] = [];
  if (filters.keyword) chips.push(filters.keyword);
  if (filters.wardCode == null && filters.provinceCode != null) {
    const name = provinceName(filters.provinceCode);
    if (name) chips.push(name);
  }
  if (filters.priceLabel) chips.push(filters.priceLabel);
  if (filters.area) chips.push(filters.area);
  if (filters.type !== "Tất cả") chips.push(filters.type);
  filters.amenities.forEach((amenity) => chips.push(amenity));
  return chips;
}
