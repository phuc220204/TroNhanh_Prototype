import { useQuery } from "@tanstack/react-query";
import { qk } from "../../shared/query/keys";
import { useAuth } from "../../shared/contexts/AuthContext";
import { countMyListingsByStatus } from "../services/listing-queries";

const EXPIRED_STATUS = "Expired";

/**
 * Số tin cho thuê đã hết hạn (BR-026) của người đang đăng nhập.
 *
 * Dùng cho mục "Tin hết hạn" trong "Việc cần làm" của dashboard `/chu-tro`.
 * Dashboard thuộc workspace nên KHÔNG tự đọc `rental_listings` (§2.1); router
 * gọi hook này rồi truyền con số xuống qua prop — workspace chỉ nhận một số
 * đếm, không chạm bảng hay service của marketplace.
 *
 * `null` = đang tải hoặc tải lỗi: dashboard bỏ qua mục này thay vì báo "0 tin".
 */
export function useMyExpiredListingCount(): number | null {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: qk.listings.mineCount(user?.id, EXPIRED_STATUS),
    queryFn: () => countMyListingsByStatus(user!.id, EXPIRED_STATUS),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  return query.data ?? null;
}
