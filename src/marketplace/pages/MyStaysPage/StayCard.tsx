import { Star, Lock, Building2 } from "lucide-react";
import { C, font, radius, space } from "../../../shared/theme";
import { Button } from "../../../shared/components/common/Button";
import { canEditReview, type ReviewableStay } from "../../services/review-service";

interface StayCardProps {
  stay: ReviewableStay;
  busy: boolean;
  onReview: () => void;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("vi-VN");
}

/**
 * Lý do CỤ THỂ vì sao chưa đánh giá được.
 *
 * ⚠️ UX bắt buộc của T26: không bao giờ hiện form rồi báo lỗi sau khi submit.
 * Điều kiện thật do `can_review_contract()` quyết (BR-022/029/030); ở đây chỉ
 * diễn giải lại cho người dùng hiểu, KHÔNG tính lại để nới.
 */
function ineligibleReason(stay: ReviewableStay): string {
  if (stay.link_status !== "Confirmed") {
    return "Bạn cần xác nhận liên kết với đợt ở này trước khi đánh giá.";
  }
  if (!stay.contract_id) {
    return "Đợt ở này chưa có hợp đồng nên chưa thể đánh giá.";
  }
  return "Bạn cần ở đủ 30 ngày hoặc đã thanh toán ít nhất 1 hóa đơn để đánh giá.";
}

export function StayCard({ stay, busy, onReview }: StayCardProps) {
  const hasReview = Boolean(stay.review_id);
  const editable = hasReview && stay.review_created_at ? canEditReview(stay.review_created_at) : false;

  return (
    <div
      data-testid="stay-card"
      style={{
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: radius.lg,
        padding: space[5],
        display: "flex",
        flexDirection: "column",
        gap: space[3],
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: space[3], flexWrap: "wrap" }}>
        <div style={{ width: 40, height: 40, borderRadius: radius.sm, background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Building2 size={18} color={C.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            {stay.property_name || "Khu trọ"}
            {stay.room_code ? ` · Phòng ${stay.room_code}` : ""}
          </p>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "3px 0 0" }}>
            {stay.property_district || "—"} · Từ {formatDate(stay.start_date)} đến {formatDate(stay.end_date)}
          </p>
        </div>
      </div>

      {hasReview ? (
        <div style={{ background: C.cream, borderRadius: radius.md, padding: space[3] }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                size={14}
                color={n <= (stay.review_rating ?? 0) ? C.warning : C.border}
                fill={n <= (stay.review_rating ?? 0) ? C.warning : "none"}
              />
            ))}
            <span style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, marginLeft: 6 }}>
              Bạn đã đánh giá {formatDate(stay.review_created_at)}
            </span>
          </div>
          {stay.review_content && (
            <p style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
              {stay.review_content}
            </p>
          )}
          {editable && (
            <Button size="sm" variant="outline" style={{ marginTop: space[2] }} disabled={busy} onClick={onReview}>
              Sửa đánh giá
            </Button>
          )}
          {!editable && (
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: `${space[2]}px 0 0` }}>
              Đã quá 7 ngày nên không sửa được nữa (BR-023).
            </p>
          )}
        </div>
      ) : stay.can_review ? (
        <Button icon={<Star size={14} />} disabled={busy} onClick={onReview} data-testid="review-open-btn">
          Đánh giá khu trọ
        </Button>
      ) : (
        <div
          data-testid="review-ineligible-note"
          style={{ display: "flex", alignItems: "flex-start", gap: space[2], background: C.cream, borderRadius: radius.md, padding: space[3] }}
        >
          <Lock size={14} color={C.textSecondary} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontFamily: font, fontSize: 12.5, color: C.textSecondary, margin: 0, lineHeight: 1.5 }}>
            {ineligibleReason(stay)}
          </p>
        </div>
      )}
    </div>
  );
}
