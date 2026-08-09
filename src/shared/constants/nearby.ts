import { ShoppingBag, GraduationCap, HeartPulse, UtensilsCrossed } from "lucide-react";
import type { ElementType } from "react";

/**
 * Nhóm tiện ích xung quanh cho tin cho thuê.
 *
 * NGUỒN CHÂN LÝ DUY NHẤT: trước đây RoomDetailPage tự khai `NEARBY_CATEGORIES`
 * kèm luôn danh sách địa điểm CỨNG (Vạn Hạnh Mall, ĐH Kinh tế…) và dùng nó làm
 * fallback khi tin không có dữ liệu — vi phạm PRD AC#1 "không fallback sang mock".
 * File này chỉ khai NHÓM; địa điểm luôn đến từ `metadata.nearby` của tin.
 *
 * `key` được ghi vào `rental_listings.metadata.nearby[].key` nên KHÔNG đổi tuỳ tiện.
 */
export interface NearbyCategoryMeta {
  key: string;
  label: string;
  Icon: ElementType;
}

export const NEARBY_CATEGORY_META: NearbyCategoryMeta[] = [
  { key: "shopping", label: "Mua sắm & Giải trí", Icon: ShoppingBag },
  { key: "edu",      label: "Giáo dục",           Icon: GraduationCap },
  { key: "health",   label: "Y tế",               Icon: HeartPulse },
  { key: "food",     label: "Ẩm thực",            Icon: UtensilsCrossed },
];

export function nearbyCategoryMeta(key: string): NearbyCategoryMeta {
  return (
    NEARBY_CATEGORY_META.find((c) => c.key === key) ?? {
      key,
      label: key,
      Icon: ShoppingBag,
    }
  );
}
