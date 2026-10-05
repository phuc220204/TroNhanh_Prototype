/**
 * Thời gian tin đăng — hàm thuần, test được không cần trình duyệt.
 *
 * "Lúc đăng" là lúc tin hiển thị công khai LẦN ĐẦU (`first_published_at`, do
 * trigger ghi một lần — migration 20261006110000). Không dùng riêng `approved_at`
 * vì cột đó bị đặt lại mỗi lần duyệt lại sau khi sửa tin.
 */

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Tin trong khoảng này được gắn nhãn "Mới đăng". */
export const NEW_LISTING_WINDOW_HOURS = 72;

export function getListingPostedAt(row: {
  first_published_at?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
}): string | null {
  return row.first_published_at || row.approved_at || row.created_at || null;
}

export function isNewlyPosted(postedAt: string | null, now: Date): boolean {
  if (!postedAt) return false;
  const time = new Date(postedAt).getTime();
  if (Number.isNaN(time)) return false;
  const ageMs = now.getTime() - time;
  return ageMs >= 0 && ageMs <= NEW_LISTING_WINDOW_HOURS * HOUR_MS;
}

/** "dd/mm/yyyy" theo giờ Việt Nam. */
export function formatPostedDate(postedAt: string): string {
  return new Date(postedAt).toLocaleDateString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh",
  });
}

/** "dd/mm/yyyy HH:mm" — dùng cho tooltip và trang chi tiết. */
export function formatPostedDateTime(postedAt: string): string {
  return new Date(postedAt).toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Ho_Chi_Minh",
  });
}

/**
 * Nhãn ngắn trên card: "Vừa đăng" · "Đăng 5 phút trước" · "Đăng 3 giờ trước" ·
 * "Đăng 1 ngày trước" · quá 30 ngày thì "Đăng 02/10/2026". Không viết "hôm qua":
 * tính theo số giờ đã qua, 46 giờ có thể là hôm kia theo lịch.
 * `null` khi không có ngày hợp lệ — UI không hiện gì thay vì bịa.
 */
export function formatPostedAgo(postedAt: string | null, now: Date): string | null {
  if (!postedAt) return null;
  const time = new Date(postedAt).getTime();
  if (Number.isNaN(time)) return null;
  // Lệch đồng hồ máy khách vài phút có thể ra số âm — coi như vừa đăng.
  const ageMs = Math.max(0, now.getTime() - time);

  if (ageMs < 5 * MINUTE_MS) return "Vừa đăng";
  if (ageMs < HOUR_MS) return `Đăng ${Math.floor(ageMs / MINUTE_MS)} phút trước`;
  if (ageMs < DAY_MS) return `Đăng ${Math.floor(ageMs / HOUR_MS)} giờ trước`;
  const days = Math.floor(ageMs / DAY_MS);
  if (days <= 30) return `Đăng ${days} ngày trước`;
  return `Đăng ${formatPostedDate(postedAt)}`;
}
