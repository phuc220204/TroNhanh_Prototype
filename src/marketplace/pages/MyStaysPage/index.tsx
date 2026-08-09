import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Home, TriangleAlert, UserCheck } from "lucide-react";
import { RenterShell } from "../../../shared/components/RenterShell";
import { EmptyState, Skeleton, Button } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { toUserMessage } from "../../../shared/services/supabase-error";
import {
  getMyStays,
  confirmOccupancyLink,
  postReview,
  type ReviewableStay,
} from "../../services/review-service";
import { ReviewModal } from "../../components/ReviewModal";
import { StayCard } from "./StayCard";

const STAYS_KEY = ["renter", "myStays"] as const;

export function MyStaysPage() {
  const queryClient = useQueryClient();
  const [reviewTarget, setReviewTarget] = useState<ReviewableStay | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const staysQuery = useQuery({ queryKey: STAYS_KEY, queryFn: getMyStays });

  const linkMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => confirmOccupancyLink(id, accept),
    onSuccess: () => {
      setLinkError(null);
      queryClient.invalidateQueries({ queryKey: STAYS_KEY });
    },
    onError: (err) => setLinkError(toUserMessage(err)),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ contractId, rating, content }: { contractId: string; rating: number; content: string }) =>
      postReview(contractId, rating, content),
    onSuccess: () => {
      setReviewError(null);
      setReviewTarget(null);
      queryClient.invalidateQueries({ queryKey: STAYS_KEY });
    },
    onError: (err) => setReviewError(toUserMessage(err)),
  });

  const stays = staysQuery.data ?? [];
  const pendingLinks = stays.filter((s) => s.link_status === "Pending");
  const activeStays = stays.filter((s) => s.link_status === "Confirmed" && s.contract_status === "Active");
  const pastStays = stays.filter((s) => s.link_status === "Confirmed" && s.contract_status !== "Active");

  return (
    <RenterShell active="stays">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[5]}px` }}>
          Phòng của tôi
        </h1>

        {linkError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {linkError}
          </div>
        )}

        {staysQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : staysQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được dữ liệu" description={toUserMessage(staysQuery.error)} />
        ) : stays.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Bạn chưa được gắn vào phòng nào"
            description="Khi chủ trọ thêm bạn làm người ở và gửi yêu cầu liên kết, yêu cầu sẽ xuất hiện ở đây để bạn xác nhận."
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[6] }}>
            {pendingLinks.length > 0 && (
              <section>
                <h2 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[3]}px` }}>
                  Yêu cầu xác nhận đang chờ
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  {pendingLinks.map((s) => (
                    <div
                      key={s.occupancy_id}
                      style={{ background: C.white, border: `1px solid ${C.secondary}`, borderRadius: radius.lg, padding: space[5] }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: space[2], marginBottom: space[2] }}>
                        <UserCheck size={16} color={C.primary} />
                        <p style={{ fontFamily: font, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
                          Xác nhận bạn là người ở {s.property_name || "khu trọ"}
                          {s.room_code ? ` · Phòng ${s.room_code}` : ""}
                        </p>
                      </div>
                      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[3]}px`, lineHeight: 1.55 }}>
                        Chủ trọ đã gắn tài khoản của bạn vào đợt ở này. Chỉ khi bạn xác nhận thì liên kết mới có hiệu lực,
                        và bạn mới có thể đánh giá khu trọ về sau.
                      </p>
                      <div style={{ display: "flex", gap: space[2] }}>
                        <Button
                          disabled={linkMutation.isPending}
                          onClick={() => linkMutation.mutate({ id: s.occupancy_id, accept: true })}
                          data-testid="confirm-link-btn"
                        >
                          Xác nhận
                        </Button>
                        <Button
                          variant="outline"
                          disabled={linkMutation.isPending}
                          onClick={() => linkMutation.mutate({ id: s.occupancy_id, accept: false })}
                          data-testid="reject-link-btn"
                        >
                          Từ chối
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeStays.length > 0 && (
              <section>
                <h2 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[3]}px` }}>
                  Đang ở
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  {activeStays.map((s) => (
                    <StayCard
                      key={s.occupancy_id + (s.contract_id ?? "")}
                      stay={s}
                      busy={reviewMutation.isPending}
                      onReview={() => { setReviewError(null); setReviewTarget(s); }}
                    />
                  ))}
                </div>
              </section>
            )}

            {pastStays.length > 0 && (
              <section>
                <h2 style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[3]}px` }}>
                  Lịch sử ở trọ
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
                  {pastStays.map((s) => (
                    <StayCard
                      key={s.occupancy_id + (s.contract_id ?? "")}
                      stay={s}
                      busy={reviewMutation.isPending}
                      onReview={() => { setReviewError(null); setReviewTarget(s); }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {reviewTarget && reviewTarget.contract_id && (
        <ReviewModal
          propertyName={reviewTarget.property_name || "khu trọ"}
          initialRating={reviewTarget.review_rating ?? 0}
          initialContent={reviewTarget.review_content ?? ""}
          submitting={reviewMutation.isPending}
          errorMessage={reviewError}
          onCancel={() => setReviewTarget(null)}
          onSubmit={(rating, content) =>
            reviewMutation.mutate({ contractId: reviewTarget.contract_id as string, rating, content })
          }
        />
      )}
    </RenterShell>
  );
}

export default MyStaysPage;
