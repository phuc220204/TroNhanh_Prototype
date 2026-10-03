import { AlertTriangle } from "lucide-react";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { C, font } from "../../../shared/theme";

export function DeleteListingModal({
  title,
  submitting,
  onCancel,
  onConfirm,
}: {
  title: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell
      title="Xác nhận xóa tin"
      onClose={submitting ? () => undefined : onCancel}
      footer={(
        <>
          <button type="button" disabled={submitting} onClick={onCancel} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.white, color: C.textSecondary, fontFamily: font, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer" }}>Giữ lại</button>
          <button type="button" data-testid="confirm-delete-listing" disabled={submitting} onClick={onConfirm} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 10, border: "none", background: C.repairing, color: C.white, fontFamily: font, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.65 : 1 }}>{submitting ? "Đang xóa…" : "Xóa tin"}</button>
        </>
      )}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={22} color={C.repairing} style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, fontFamily: font, color: C.textSecondary, fontSize: 14, lineHeight: 1.6 }}>
          Bạn sắp xóa tin <strong style={{ color: C.textPrimary }}>“{title}”</strong>. Thao tác này không thể hoàn tác.
        </p>
      </div>
    </ModalShell>
  );
}
