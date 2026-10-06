import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { Button, ModalShell } from "../../../shared/components/common";
import { formatDate, toLocalISODate } from "../../../shared/utils/format";

interface EndContractModalProps {
  roomLabel: string;
  occupantName: string;
  contractStartDate?: string | null;
  submitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: (endDate: string) => void;
}

/**
 * Xác nhận kết thúc hợp đồng — thay `window.confirm` (hộp thoại trình duyệt,
 * không chọn được ngày). Ngày kết thúc mặc định hôm nay, chọn lại được nếu người
 * ở đã dọn đi từ trước.
 */
export function EndContractModal({ roomLabel, occupantName, contractStartDate, submitting, errorMessage, onCancel, onConfirm }: EndContractModalProps) {
  const today = toLocalISODate();
  const [endDate, setEndDate] = useState(today);
  const isBeforeStart = Boolean(contractStartDate && endDate < contractStartDate);
  const isInvalid = !endDate || endDate > today || isBeforeStart;

  return (
    <ModalShell
      title="Kết thúc hợp đồng"
      onClose={() => { if (!submitting) onCancel(); }}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Hủy</Button>
          <Button variant="danger" requiresWrite loading={submitting} disabled={isInvalid} onClick={() => onConfirm(endDate)} data-testid="confirm-end-contract-btn">
            Kết thúc hợp đồng
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, fontFamily: font }}>
        <p style={{ margin: 0, fontSize: 14, color: C.textPrimary, lineHeight: 1.6 }}>
          Kết thúc hợp đồng của <strong>{occupantName}</strong> ở phòng <strong>{roomLabel}</strong>. Phòng sẽ chuyển về <strong>Trống</strong>; lịch sử hợp đồng, hóa đơn vẫn được giữ.
        </p>
        <div>
          <label htmlFor="end-contract-date" style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}>
            Ngày người ở rời phòng
          </label>
          <input
            id="end-contract-date"
            type="date"
            value={endDate}
            max={today}
            min={contractStartDate ?? undefined}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", fontFamily: font, fontSize: 14, border: `1px solid ${C.border}`, borderRadius: radius.sm, boxSizing: "border-box" }}
          />
          {isBeforeStart && contractStartDate && (
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.error }}>Không được trước ngày bắt đầu hợp đồng ({formatDate(contractStartDate)}).</p>
          )}
        </div>
        {errorMessage && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 6, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, padding: "10px 14px", borderRadius: radius.sm, fontSize: 13 }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} /> {errorMessage}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
