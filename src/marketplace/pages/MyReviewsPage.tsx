import { useQuery } from "@tanstack/react-query";
import { Star, TriangleAlert } from "lucide-react";
import { RenterShell } from "../../shared/components/RenterShell";
import { EmptyState, Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getMyReviews, canEditReview } from "../services/review-service";

/**
 * Đánh giá tôi đã viết.
 * BR-023: sửa được trong 7 ngày. Lối sửa nằm ở "Phòng của tôi" (nơi có
 * contract_id để gọi post_review), nên ở đây chỉ hiển thị trạng thái còn/hết hạn.
 */
export function MyReviewsPage() {
  const reviewsQuery = useQuery({
    queryKey: ["renter", "myReviews"],
    queryFn: getMyReviews,
  });

  const reviews = reviewsQuery.data ?? [];

  return (
    <RenterShell active="reviews">
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Đánh giá của tôi
        </h1>

        {reviewsQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : reviewsQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được đánh giá" description={toUserMessage(reviewsQuery.error)} />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="Bạn chưa viết đánh giá nào"
            description="Sau khi xác nhận liên kết và ở đủ 30 ngày (hoặc đã thanh toán một hóa đơn), bạn có thể đánh giá khu trọ ở mục Phòng của tôi."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {reviews.map((r) => {
              const editable = canEditReview(r.created_at);
              return (
                <div key={r.id} data-testid="review-item" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[5] }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: space[2], flexWrap: "wrap" }}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={14} color={n <= r.rating ? C.warning : C.border} fill={n <= r.rating ? C.warning : "none"} />
                    ))}
                    <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, marginLeft: 6 }}>
                      {new Date(r.created_at).toLocaleDateString("vi-VN")}
                    </span>
                    {r.status === "Hidden" && (
                      <span style={{ fontFamily: font, fontSize: 11.5, fontWeight: 700, color: C.error, background: C.cream, borderRadius: radius.pill, padding: "2px 9px", marginLeft: 6 }}>
                        Đã bị ẩn
                      </span>
                    )}
                  </div>

                  {r.content && (
                    <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: `0 0 ${space[2]}px`, lineHeight: 1.6 }}>{r.content}</p>
                  )}

                  <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: 0 }}>
                    {editable
                      ? "Còn trong 7 ngày — bạn có thể sửa ở mục Phòng của tôi."
                      : "Đã quá 7 ngày nên không sửa được nữa (BR-023)."}
                  </p>

                  {r.seller_reply && (
                    <div style={{ background: C.cream, borderRadius: radius.md, padding: space[3], marginTop: space[3] }}>
                      <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>Phản hồi của chủ trọ</p>
                      <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>{r.seller_reply}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RenterShell>
  );
}

export default MyReviewsPage;
