import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Home, Star, MapPin, TriangleAlert } from "lucide-react";
import { PublicNavbar } from "../../shared/components/PublicNavbar";
import { EmptyState, Skeleton } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { toUserMessage } from "../../shared/services/supabase-error";
import { getPropertyPublicProfile, listPropertyReviews } from "../services/review-service";

/**
 * Trang khu trọ công khai (BR-024).
 *
 * ⚠️ Dữ liệu khu ĐỌC TỪ VIEW `property_public_profiles`, KHÔNG từ bảng
 * `properties` — bảng đó có bank_account_number/bank_account_name và RLS là
 * row-level, không phải column-level (§3.2). View allow-list đúng 6 cột và tự
 * lọc `is_public_profile_enabled = true`, nên khu chưa bật sẽ ra 404 ở đây.
 */
export function PropertyDetailPage() {
  const { slug } = useParams<{ slug: string }>();

  const profileQuery = useQuery({
    queryKey: ["marketplace", "publicProperty", slug],
    queryFn: () => getPropertyPublicProfile(slug || ""),
    enabled: Boolean(slug),
  });

  const property = profileQuery.data;

  const reviewsQuery = useQuery({
    queryKey: ["marketplace", "publicPropertyReviews", property?.id],
    queryFn: () => listPropertyReviews(property?.id || ""),
    enabled: Boolean(property?.id),
  });

  const reviews = reviewsQuery.data ?? [];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: font }}>
      <PublicNavbar />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: `${space[8]}px ${space[5]}px` }}>
        {profileQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : !property ? (
          <EmptyState
            icon={Home}
            title="Không tìm thấy trang khu trọ"
            description="Khu trọ này chưa bật trang công khai, hoặc đường dẫn không đúng."
          />
        ) : (
          <>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: space[6], marginBottom: space[5] }}>
              <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
                {property.name}
              </h1>
              <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[3]}px`, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <MapPin size={14} /> {property.district || "TP. Hồ Chí Minh"}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
                <Star size={18} color={C.warning} fill={C.warning} />
                <span style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary }}>
                  {property.avg_rating != null ? Number(property.avg_rating).toFixed(1) : "—"}
                </span>
                <span style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary }}>
                  ({property.review_count ?? 0} đánh giá)
                </span>
              </div>
            </div>

            <h2 style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[3]}px` }}>
              Đánh giá từ người đã ở
            </h2>

            {reviewsQuery.isPending ? (
              <Skeleton variant="card" count={2} />
            ) : reviewsQuery.isError ? (
              <EmptyState icon={TriangleAlert} title="Không tải được đánh giá" description={toUserMessage(reviewsQuery.error)} />
            ) : reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Chưa có đánh giá nào"
                description="Chỉ người ở đã xác nhận liên kết và ở đủ 30 ngày mới đánh giá được, nên số lượng thường ít nhưng đáng tin."
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                {reviews.map((r) => (
                  <div key={r.id} data-testid="review-item" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[5] }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: space[2] }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} size={14} color={n <= r.rating ? C.warning : C.border} fill={n <= r.rating ? C.warning : "none"} />
                      ))}
                      <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, marginLeft: 6 }}>
                        {new Date(r.created_at).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    {r.content && (
                      <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.6 }}>{r.content}</p>
                    )}
                    {r.seller_reply && (
                      <div style={{ background: C.cream, borderRadius: radius.md, padding: space[3], marginTop: space[3] }}>
                        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>
                          Phản hồi của chủ trọ
                        </p>
                        <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>{r.seller_reply}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PropertyDetailPage;
