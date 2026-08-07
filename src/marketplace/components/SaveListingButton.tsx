import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { C } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { useAuth } from "../../shared/contexts/AuthContext";
import { logError } from "../../shared/services/supabase-error";
import {
  getSavedListingIds,
  saveListing,
  unsaveListing,
} from "../services/saved-listings-service";

/**
 * Tập id tin đã lưu của người đang đăng nhập.
 *
 * Tách thành hook riêng để MỌI card trên trang dùng CHUNG một query (React Query
 * dedupe theo key), thay vì mỗi card tự hỏi server "tin này đã lưu chưa" — trang
 * 20 card sẽ thành 20 request.
 */
export function useSavedListingIds() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: qk.savedListings.ids(user?.id),
    queryFn: () => getSavedListingIds(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  return data ?? new Set<string>();
}

export interface SaveListingButtonProps {
  listingId: string;
  /** Kích thước icon. Mỗi trang có tỉ lệ card khác nhau. */
  size?: number;
  /** Nền tròn trắng phía sau icon — dùng khi nút nằm đè lên ảnh. */
  overlay?: boolean;
  "data-testid"?: string;
}

/**
 * Nút lưu tin (trái tim).
 *
 * Trước đây bốn trang mỗi trang một bản `const [saved, setSaved] = useState(false)`:
 * bấm thì tim đổi màu, reload là mất, và không có chỗ nào xem lại. Tính năng chỉ
 * tồn tại trong một lần render.
 *
 * Khách chưa đăng nhập bấm tim → đưa sang đăng nhập kèm `?redirect=` để quay lại
 * đúng trang đang xem. Cố ý KHÔNG lưu tạm vào localStorage: §8 cấm dùng nó cho
 * trạng thái người dùng, và một "danh sách yêu thích" chỉ sống trên một máy còn
 * gây bất ngờ hơn là yêu cầu đăng nhập.
 */
export function SaveListingButton({
  listingId,
  size = 16,
  overlay,
  "data-testid": testId = "save-listing-btn",
}: SaveListingButtonProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const savedIds = useSavedListingIds();
  const [hover, setHover] = useState(false);

  const isSaved = savedIds.has(listingId);

  const mutation = useMutation({
    mutationFn: async () => {
      if (isSaved) await unsaveListing(listingId);
      else await saveListing(listingId);
    },
    // Đổi màu tim ngay, không chờ round-trip. Bấm tim là thao tác người dùng mong
    // phản hồi tức thì; chờ mạng làm nút có cảm giác hỏng.
    onMutate: async () => {
      const key = qk.savedListings.ids(user?.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Set<string>>(key);
      const next = new Set(previous ?? savedIds);
      if (isSaved) next.delete(listingId);
      else next.add(listingId);
      queryClient.setQueryData(key, next);
      return { previous };
    },
    onError: (err, _vars, context) => {
      logError("SaveListingButton.toggle", err);
      // Trả lại trạng thái cũ — nếu không, tim hiện "đã lưu" trong khi server chưa lưu.
      if (context?.previous) {
        queryClient.setQueryData(qk.savedListings.ids(user?.id), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qk.savedListings.all });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Nút thường nằm trong card có onClick điều hướng — chặn nổi bọt, nếu không
    // bấm tim sẽ mở luôn trang chi tiết.
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      navigate(`/dang-nhap?redirect=${encodeURIComponent(`/phong/${listingId}`)}`);
      return;
    }
    mutation.mutate();
  };

  const activeColor = C.error;

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={isSaved ? "Bỏ khỏi tin đã lưu" : "Lưu tin này"}
      aria-pressed={isSaved}
      title={isSaved ? "Bỏ khỏi tin đã lưu" : "Lưu tin này"}
      data-testid={testId}
      data-saved={isSaved ? "true" : "false"}
      style={
        overlay
          ? {
              position: "absolute", top: 10, right: 10,
              background: "rgba(255,255,255,0.92)", border: "none", borderRadius: "50%",
              width: size + 18, height: size + 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
              padding: 0,
            }
          : {
              background: "none", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: 4,
            }
      }
    >
      <Heart
        size={size}
        color={isSaved || hover ? activeColor : C.secondary}
        fill={isSaved ? activeColor : "none"}
        strokeWidth={2}
      />
    </button>
  );
}
