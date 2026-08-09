import { useState } from "react";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button } from "../../../shared/components/common/Button";
import { C, font, radius, space } from "../../../shared/theme";

interface RejectDialogProps {
  listingTitle: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

/**
 * FR-064: từ chối BẮT BUỘC có lý do.
 * Chặn ở đây là để người kiểm duyệt biết ngay; RPC `moderate_listing` cũng raise
 * REASON_REQUIRED. Cả hai lớp đều cần — lớp UI là trải nghiệm, lớp RPC là luật.
 */
export function RejectDialog({ listingTitle, submitting, onCancel, onConfirm }: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const canSubmit = trimmed.length >= 10 && !submitting;

  return (
    <ModalShell
      title="Từ chối tin đăng"
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Hủy</Button>
          <Button
            variant="danger"
            disabled={!canSubmit}
            loading={submitting}
            onClick={() => onConfirm(trimmed)}
            data-testid="moderation-reject-confirm-btn"
          >
            Từ chối tin
          </Button>
        </>
      }
    >
      <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: `0 0 ${space[3]}px` }}>
        Tin: <strong style={{ color: C.textPrimary }}>{listingTitle}</strong>
      </p>
      <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
        Lý do từ chối <span style={{ color: C.error }}>*</span>
      </p>
      <textarea
        autoFocus
        rows={4}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="VD: Ảnh không phải phòng thật, giá không khớp mô tả, thiếu địa chỉ cụ thể…"
        data-testid="moderation-reason-input"
        style={{
          width: "100%",
          fontFamily: font,
          fontSize: 14,
          color: C.textPrimary,
          padding: `${space[3]}px ${space[3]}px`,
          background: C.white,
          border: `1.5px solid ${C.border}`,
          borderRadius: radius.md,
          outline: "none",
          boxSizing: "border-box",
          lineHeight: 1.5,
          resize: "vertical",
        }}
      />
      <p style={{ fontFamily: font, fontSize: 12, color: trimmed.length >= 10 ? C.textSecondary : C.error, margin: `${space[2]}px 0 0` }}>
        {trimmed.length >= 10
          ? "Người đăng sẽ thấy đúng nội dung này kèm nút sửa lại tin."
          : `Cần tối thiểu 10 ký tự (hiện ${trimmed.length}). Người đăng phải hiểu được cần sửa gì.`}
      </p>
    </ModalShell>
  );
}
