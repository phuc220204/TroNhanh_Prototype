import { Clock3, Sparkles } from "lucide-react";
import { C, font, radius } from "../../shared/theme";
import { hasActiveVerifiedBoost, type ListingBadge } from "../services/listing-mappers";
import { formatPostedAgo, formatPostedDateTime, getListingPostedAt } from "../utils/posted-time";

// "Nổi bật": nền nâu đậm, chữ trắng (tương phản ~7:1). "Mới đăng": nền kem viền
// vàng — khác hẳn pill xanh "Còn trống" đặt cùng ảnh.
const TAG_META: Record<ListingBadge, { label: string; background: string; color: string; border: string; testId: string }> = {
  featured: { label: "Nổi bật", background: C.primary, color: C.white, border: C.primary, testId: "listing-tag-featured" },
  new: { label: "Mới đăng", background: C.cream, color: C.primaryDark, border: C.secondary, testId: "listing-tag-new" },
};

/** Màu viền card cho tin nổi bật — để nhận ra ngay cả khi lướt nhanh. */
export const FEATURED_CARD_BORDER = C.primary;

/**
 * Nhãn trên ảnh card tin: "Nổi bật" (tin đang Boost, đã thanh toán) hoặc
 * "Mới đăng" (≤ 72 giờ). Dùng chung cho mọi card để hai nhãn luôn phân biệt rõ.
 */
export function ListingTag({ badge, style }: { badge: ListingBadge | null | undefined; style?: React.CSSProperties }) {
  if (!badge) return null;
  const meta = TAG_META[badge];
  return (
    <span
      data-testid={meta.testId}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: meta.background, color: meta.color, border: `1px solid ${meta.border}`,
        fontFamily: font, fontSize: 11, fontWeight: 800, letterSpacing: "0.02em",
        borderRadius: radius.sm, padding: "4px 9px",
        ...style,
      }}
    >
      {badge === "featured" && <Sparkles size={11} strokeWidth={2.5} />}
      {meta.label}
    </span>
  );
}

/** "Đăng 3 giờ trước" — rê chuột để xem ngày giờ chính xác. Không có ngày thì không hiện gì. */
export function ListingPostedTime({ postedAt, size = 11.5, style }: { postedAt: string | null | undefined; size?: number; style?: React.CSSProperties }) {
  const label = formatPostedAgo(postedAt ?? null, new Date());
  if (!label || !postedAt) return null;
  return (
    <span
      data-testid="listing-posted-time"
      title={`Đăng lúc ${formatPostedDateTime(postedAt)}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: font, fontSize: size, color: C.textSecondary, whiteSpace: "nowrap", ...style }}
    >
      <Clock3 size={size} color={C.secondary} />
      {label}
    </span>
  );
}

/** Đầu trang chi tiết (desktop + mobile): nhãn "Nổi bật" nếu đang Boost + thời gian đăng. */
export function ListingHeaderMeta({ listing, size = 13 }: { listing: any; size?: number }) {
  return (
    <>
      {hasActiveVerifiedBoost(listing) && <ListingTag badge="featured" />}
      <ListingPostedTime postedAt={getListingPostedAt(listing ?? {})} size={size} />
    </>
  );
}
