import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, TriangleAlert, Globe, ExternalLink } from "lucide-react";
import { Link } from "react-router";
import { LandlordShell } from "../../shared/components/LandlordShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { C, font, radius, space } from "../../shared/theme";
import { useAuth } from "../../shared/contexts/AuthContext";
import { toUserMessage } from "../../shared/services/supabase-error";
import {
  getMyPropertiesReviewSummary,
  setPublicProfile,
  listPropertyReviews,
  replyToReview,
} from "../services/review-service";

export function LandlordReviewsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const propertiesQuery = useQuery({
    queryKey: ["marketplace", "myPropertyReviews", user?.id],
    queryFn: getMyPropertiesReviewSummary,
    enabled: Boolean(user?.id),
  });

  const properties = propertiesQuery.data ?? [];
  const activeId = selectedId || properties[0]?.property_id || "";
  const activeProperty = properties.find((p) => p.property_id === activeId);

  const reviewsQuery = useQuery({
    queryKey: ["marketplace", "propertyReviews", activeId],
    queryFn: () => listPropertyReviews(activeId),
    enabled: Boolean(activeId),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setPublicProfile(id, enabled),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["marketplace", "myPropertyReviews"] });
    },
    onError: (err) => setErrorMessage(toUserMessage(err)),
  });

  const replyMutation = useMutation({
    mutationFn: ({ reviewId, reply }: { reviewId: string; reply: string }) => replyToReview(reviewId, reply),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ["marketplace", "propertyReviews"] });
    },
    onError: (err) => setErrorMessage(toUserMessage(err)),
  });

  const reviews = reviewsQuery.data ?? [];

  return (
    <LandlordShell active="overview" mobileTitle="Đánh giá khu trọ">
      <div style={{ maxWidth: 900, margin: "0 auto", padding: `${space[8]}px ${space[4]}px` }}>
        <h1 style={{ fontFamily: font, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Quản lý &amp; phản hồi đánh giá
        </h1>

        {errorMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {errorMessage}
          </div>
        )}

        {propertiesQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : properties.length === 0 ? (
          <EmptyState icon={Star} title="Bạn chưa có khu trọ nào" description="Tạo khu trọ trước để nhận đánh giá từ người ở." />
        ) : (
          <>
            <div style={{ display: "flex", gap: space[2], flexWrap: "wrap", marginBottom: space[4] }}>
              {properties.map((p) => {
                const active = p.property_id === activeId;
                return (
                  <button
                    key={p.property_id}
                    type="button"
                    onClick={() => setSelectedId(p.property_id)}
                    style={{
                      fontFamily: font, fontSize: 13, fontWeight: 700,
                      color: active ? C.white : C.textSecondary,
                      background: active ? C.primary : C.white,
                      border: `1px solid ${active ? C.primary : C.border}`,
                      borderRadius: radius.pill, padding: `${space[2]}px ${space[4]}px`, cursor: "pointer",
                    }}
                  >
                    {p.property_name}
                  </button>
                );
              })}
            </div>

            {activeProperty && (
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[5], marginBottom: space[4] }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: space[4], flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[1]}px`, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Globe size={15} color={C.primary} /> Trang khu trọ công khai
                    </p>
                    <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0, lineHeight: 1.55 }}>
                      Bật thì đánh giá của khu mới hiển thị công khai và tin đăng mới có huy hiệu điểm sao (BR-024).
                      Tắt đi là mọi đánh giá lập tức ẩn khỏi trang công khai.
                    </p>
                    {activeProperty.is_public_profile && activeProperty.public_slug && (
                      <Link
                        to={`/khu-tro/${activeProperty.public_slug}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary, textDecoration: "none", marginTop: space[2] }}
                      >
                        <ExternalLink size={13} /> Xem trang công khai
                      </Link>
                    )}
                  </div>
                  <Button
                    variant={activeProperty.is_public_profile ? "outline" : "primary"}
                    disabled={toggleMutation.isPending}
                    onClick={() => toggleMutation.mutate({ id: activeProperty.property_id, enabled: !activeProperty.is_public_profile })}
                    data-testid="public-profile-toggle"
                  >
                    {activeProperty.is_public_profile ? "Đang bật · Tắt đi" : "Bật trang công khai"}
                  </Button>
                </div>
              </div>
            )}

            {reviewsQuery.isPending ? (
              <Skeleton variant="card" count={2} />
            ) : reviewsQuery.isError ? (
              <EmptyState icon={TriangleAlert} title="Không tải được đánh giá" description={toUserMessage(reviewsQuery.error)} />
            ) : reviews.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Chưa có đánh giá nào"
                description="Người ở đã xác nhận liên kết và ở đủ 30 ngày (hoặc đã thanh toán) mới đánh giá được."
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
                      <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: `0 0 ${space[3]}px`, lineHeight: 1.6 }}>{r.content}</p>
                    )}

                    {r.seller_reply ? (
                      <div style={{ background: C.cream, borderRadius: radius.md, padding: space[3] }}>
                        <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>Phản hồi của bạn</p>
                        <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>{r.seller_reply}</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
                        <textarea
                          rows={2}
                          maxLength={1000}
                          value={replyDraft[r.id] ?? ""}
                          onChange={(e) => setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Phản hồi công khai (chỉ gửi được một lần)"
                          data-testid="seller-reply-input"
                          style={{
                            width: "100%", fontFamily: font, fontSize: 13.5, color: C.textPrimary,
                            padding: space[3], background: C.white, border: `1.5px solid ${C.border}`,
                            borderRadius: radius.md, outline: "none", boxSizing: "border-box", resize: "vertical",
                          }}
                        />
                        <Button
                          size="sm"
                          disabled={!(replyDraft[r.id] ?? "").trim() || replyMutation.isPending}
                          onClick={() => replyMutation.mutate({ reviewId: r.id, reply: replyDraft[r.id] ?? "" })}
                          data-testid="seller-reply-submit"
                          style={{ alignSelf: "flex-start" }}
                        >
                          Gửi phản hồi
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </LandlordShell>
  );
}

export default LandlordReviewsPage;
