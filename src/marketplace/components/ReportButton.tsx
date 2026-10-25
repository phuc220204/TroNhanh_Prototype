import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Flag } from "lucide-react";
import { C, font, radius, space } from "../../shared/theme";
import { Button, ModalShell } from "../../shared/components/common";
import { useAuth } from "../../shared/contexts/AuthContext";
import { useToast } from "../../shared/contexts/ToastContext";
import { toUserMessage } from "../../shared/services/supabase-error";
import { withAuthRedirect } from "../../shared/utils/auth-redirect";
import { REPORT_REASON_LABELS, reportContent, type ReportReason, type ReportTargetType } from "../services/report-service";

const REASONS = Object.keys(REPORT_REASON_LABELS) as ReportReason[];

const TARGET_NOUN: Record<ReportTargetType, string> = {
  RentalListing: "tin cho thuê",
  Review: "đánh giá",
  DemandPost: "tin nhu cầu",
};

export interface ReportButtonProps {
  targetType: ReportTargetType;
  targetId: string;
  /** Chủ nội dung. Trùng người đang xem ⇒ không hiện nút (server cũng chặn). */
  ownerId?: string | null;
  /** "link": chữ nhỏ trong thẻ đánh giá. "block": nút viền ở cột liên hệ. */
  appearance?: "link" | "block";
}

/**
 * Nút "Báo cáo" + hộp chọn lý do. Khách chưa đăng nhập được đưa tới đăng nhập
 * rồi quay lại đúng trang — báo cáo cần danh tính để chống spam.
 */
export function ReportButton({ targetType, targetId, ownerId, appearance = "link" }: ReportButtonProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (user && ownerId && user.id === ownerId) return null;

  const open = () => {
    if (!user) {
      navigate(withAuthRedirect("/dang-nhap", location.pathname + location.search));
      return;
    }
    setReason(null);
    setDetails("");
    setErrorMessage(null);
    setIsOpen(true);
  };

  const submit = async () => {
    if (!reason || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await reportContent(targetType, targetId, reason, details);
      setIsOpen(false);
      showToast("Đã gửi báo cáo. Cảm ơn bạn, chúng tôi sẽ xem xét sớm.");
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const trigger = appearance === "block" ? (
    <button
      type="button"
      onClick={open}
      data-testid={`report-btn-${targetType}`}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, padding: "8px 12px", background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.md, fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}
    >
      <Flag size={14} /> Báo cáo {TARGET_NOUN[targetType]}
    </button>
  ) : (
    <button
      type="button"
      onClick={open}
      data-testid={`report-btn-${targetType}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", padding: "4px 0", fontFamily: font, fontSize: 12, color: C.textSecondary, cursor: "pointer" }}
    >
      <Flag size={12} /> Báo cáo
    </button>
  );

  return (
    <>
      {trigger}
      {isOpen && (
        <ModalShell
          title={`Báo cáo ${TARGET_NOUN[targetType]}`}
          onClose={() => { if (!isSubmitting) setIsOpen(false); }}
          footer={(
            <>
              <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isSubmitting}>Hủy</Button>
              <Button variant="danger" loading={isSubmitting} disabled={!reason} onClick={() => void submit()} data-testid="report-submit">
                Gửi báo cáo
              </Button>
            </>
          )}
        >
          <p style={{ margin: 0, fontFamily: font, fontSize: 13.5, color: C.textSecondary, lineHeight: 1.55 }}>
            Báo cáo được gửi ẩn danh tới đội kiểm duyệt; người đăng không biết ai đã báo cáo.
          </p>
          <div role="radiogroup" aria-label="Lý do báo cáo" style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
            {REASONS.map((item) => (
              <label
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, padding: "8px 12px", border: `1px solid ${reason === item ? C.primary : C.border}`, borderRadius: radius.sm, fontFamily: font, fontSize: 13.5, color: C.textPrimary, cursor: "pointer" }}
              >
                <input type="radio" name="report-reason" value={item} checked={reason === item} onChange={() => setReason(item)} data-testid={`report-reason-${item}`} />
                {REPORT_REASON_LABELS[item]}
              </label>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
            placeholder={reason === "Other" ? "Mô tả vấn đề (bắt buộc)" : "Mô tả thêm (không bắt buộc)"}
            rows={3}
            data-testid="report-details"
            style={{ width: "100%", boxSizing: "border-box", fontFamily: font, fontSize: 13.5, color: C.textPrimary, padding: space[3], border: `1.5px solid ${C.border}`, borderRadius: radius.sm, resize: "vertical" }}
          />
          {errorMessage && <p role="alert" style={{ margin: 0, fontFamily: font, fontSize: 13, color: C.error }}>{errorMessage}</p>}
        </ModalShell>
      )}
    </>
  );
}
