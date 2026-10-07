import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getTotalUnreadCount } from "../services/messaging-service";
import { qk } from "../query/keys";

/**
 * Tổng tin chưa đọc — MỘT nguồn cho navbar, thanh tab mobile và sidebar chủ trọ.
 *
 * Trước đây mỗi nơi tự `useState` + gọi lúc mount ⇒ đọc xong tin trong hộp thư
 * mà badge trên navbar vẫn giữ số cũ. Giờ hộp thư chỉ cần `invalidateQueries`
 * key này sau khi đánh dấu đã đọc.
 */
export function useUnreadMessageCount(): number {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: qk.conversations.unreadCount(user?.id),
    queryFn: getTotalUnreadCount,
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return user ? data ?? 0 : 0;
}
