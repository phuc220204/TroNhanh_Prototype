import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, TriangleAlert, Star, EyeOff } from "lucide-react";
import { AdminShell } from "../components/AdminShell";
import { EmptyState, Skeleton, Button } from "../../shared/components/common";
import { ModalShell } from "../../shared/components/common/ModalShell";
import { C, font, radius, space } from "../../shared/theme";
import { qk } from "../../shared/query/keys";
import { toUserMessage } from "../../shared/services/supabase-error";
import { listReportedReviews, hideReview } from "../services/moderation-service";

export function ReviewModerationPage() {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<{ id: string } | null>(null);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: qk.admin.reportedReviews,
    queryFn: listReportedReviews,
  });

  const hideMutation = useMutation({
    mutationFn: ({ id, why }: { id: string; why: string }) => hideReview(id, why),
    onSuccess: () => {
      setErrorMessage(null);
      setTarget(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: qk.admin.reportedReviews });
    },
    onError: (err) => setErrorMessage(toUserMessage(err)),
  });

  const rows = reviewsQuery.data ?? [];
  const trimmed = reason.trim();

  return (
    <AdminShell active="reviews">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontFamily: font, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
          Kiểm duyệt đánh giá
        </h1>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[5]}px` }}>
          Chỉ hiện đánh giá đã bị báo cáo. Ẩn đánh giá là thao tác có ghi nhật ký — bắt buộc nêu lý do.
        </p>

        {errorMessage && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.cream, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.md, padding: `${space[3]}px ${space[4]}px`, marginBottom: space[4], fontFamily: font, fontSize: 13 }}>
            <TriangleAlert size={15} /> {errorMessage}
          </div>
        )}

        {reviewsQuery.isPending ? (
          <Skeleton variant="card" count={2} />
        ) : reviewsQuery.isError ? (
          <EmptyState icon={TriangleAlert} title="Không tải được danh sách" description={toUserMessage(reviewsQuery.error)} />
        ) : rows.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Không có đánh giá nào bị báo cáo" description="Mọi đánh giá đang ở trạng thái bình thường." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
            {rows.map((r) => (
              <div key={r.id} data-testid="review-item" style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: space[5] }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: space[2], flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={14} color={n <= r.rating ? C.warning : C.border} fill={n <= r.rating ? C.warning : "none"} />
                  ))}
                  <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.error, background: C.cream, borderRadius: radius.pill, padding: "2px 9px", marginLeft: 8 }}>
                    {r.report_count} báo cáo
                  </span>
                  <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, marginLeft: 4 }}>
                    {new Date(r.created_at).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                {r.content && (
                  <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: `0 0 ${space[3]}px`, lineHeight: 1.6 }}>{r.content}</p>
                )}
                <Button
                  size="sm"
                  variant="danger"
                  icon={<EyeOff size={14} />}
                  disabled={hideMutation.isPending}
                  onClick={() => { setErrorMessage(null); setReason(""); setTarget({ id: r.id }); }}
                  data-testid="review-hide-btn"
                >
                  Ẩn đánh giá
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {target && (
        <ModalShell
          title="Ẩn đánh giá"
          onClose={() => setTarget(null)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setTarget(null)} disabled={hideMutation.isPending}>Hủy</Button>
              <Button
                variant="danger"
                disabled={trimmed.length < 10 || hideMutation.isPending}
                loading={hideMutation.isPending}
                onClick={() => hideMutation.mutate({ id: target.id, why: trimmed })}
                data-testid="review-hide-confirm-btn"
              >
                Ẩn đánh giá
              </Button>
            </>
          }
        >
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
            Lý do ẩn <span style={{ color: C.error }}>*</span>
          </p>
          <textarea
            autoFocus
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="VD: Nội dung xúc phạm, thông tin sai sự thật, spam quảng cáo…"
            data-testid="review-hide-reason-input"
            style={{
              width: "100%", fontFamily: font, fontSize: 14, color: C.textPrimary,
              padding: space[3], background: C.white, border: `1.5px solid ${C.border}`,
              borderRadius: radius.md, outline: "none", boxSizing: "border-box", resize: "vertical",
            }}
          />
          <p style={{ fontFamily: font, fontSize: 12, color: trimmed.length >= 10 ? C.textSecondary : C.error, margin: `${space[2]}px 0 0` }}>
            {trimmed.length >= 10
              ? "Lý do được ghi vào nhật ký kiểm duyệt."
              : `Cần tối thiểu 10 ký tự (hiện ${trimmed.length}).`}
          </p>
        </ModalShell>
      )}
    </AdminShell>
  );
}

export default ReviewModerationPage;
