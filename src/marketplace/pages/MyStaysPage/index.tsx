import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "../../../shared/query/keys";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { Home, TriangleAlert } from "lucide-react";
import { RenterShell } from "../../../shared/components/RenterShell";
import { EmptyState, Skeleton, Button } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { toUserMessage } from "../../../shared/services/supabase-error";
import {
  getMyStays,
  getMyPendingLinkDetails,
  confirmOccupancyLink,
  postReview,
  type ReviewableStay,
} from "../../services/review-service";
import { ReviewModal } from "../../components/ReviewModal";
import { StayCard } from "./StayCard";
import { PendingLinkCard } from "./PendingLinkCard";


export function MyStaysPage() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const staysKey = qk.occupancies.mine(user?.id);
  const [reviewTarget, setReviewTarget] = useState<ReviewableStay | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const staysQuery = useQuery({ queryKey: staysKey, queryFn: getMyStays });

  const linkMutation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) => confirmOccupancyLink(id, accept),
    onSuccess: () => {
      setLinkError(null);
      queryClient.invalidateQueries({ queryKey: staysKey });
    },
    onError: (err) => setLinkError(toUserMessage(err)),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ contractId, rating, content }: { contractId: string; rating: number; content: string }) =>
      postReview(contractId, rating, content),
    onSuccess: () => {
      setReviewError(null);
      setReviewTarget(null);
      queryClient.invalidateQueries({ queryKey: staysKey });
      // "Đánh giá của tôi" và đánh giá công khai của khu cũng phải thấy bài mới.
      queryClient.invalidateQueries({ queryKey: qk.reviews.all });
    },
    onError: (err) => setReviewError(toUserMessage(err)),
  });

  const stays = staysQuery.data ?? [];
  const pendingLinks = stays.filter((s) => s.link_status === "Pending");

  // Chỉ gọi khi có lời mời đang chờ. Lỗi thì thẻ vẫn hiện, ô "Chủ trọ" ghi "Chưa có tên".
  const pendingDetailsQuery = useQuery({
    queryKey: qk.occupancies.pendingLinkDetails(user?.id),
    queryFn: getMyPendingLinkDetails,
    enabled: pendingLinks.length > 0,
  });
  const landlordNames = new Map((pendingDetailsQuery.data ?? []).map((d) => [d.occupancy_id, d.landlord_name]));
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
                    <PendingLinkCard
                      key={s.occupancy_id}
                      stay={s}
                      landlordName={landlordNames.get(s.occupancy_id)}
                      accountName={profile?.full_name}
                      busy={linkMutation.isPending}
                      onConfirm={() => linkMutation.mutate({ id: s.occupancy_id, accept: true })}
                      onReject={() => linkMutation.mutate({ id: s.occupancy_id, accept: false })}
                    />
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
