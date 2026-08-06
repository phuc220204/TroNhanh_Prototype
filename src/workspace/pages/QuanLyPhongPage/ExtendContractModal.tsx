import { useState } from "react";
import { C, font, radius } from "../../../shared/theme";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button } from "../../../shared/components/common";

interface ExtendContractModalProps {
  /** Ngày kết thúc hiện tại (`YYYY-MM-DD`). */
  currentEndDate: string;
  occupantName: string;
  roomLabel: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (newEndDate: string) => void;
}

/** Cộng `months` tháng vào một ngày `YYYY-MM-DD`, trả về cùng định dạng. */
function addMonths(dateStr: string, months: number): string {
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) return dateStr;
  const target = new Date(base);
  target.setMonth(target.getMonth() + months);
  return target.toISOString().split("T")[0] ?? dateStr;
}

const QUICK_OPTIONS = [3, 6, 12];

/**
 * Gia hạn hợp đồng — dời `end_date`, giữ nguyên occupancy và hóa đơn cũ.
 *
 * Server (`extend_contract`) là nơi kiểm cuối: ngày mới phải muộn hơn ngày cũ,
 * hợp đồng phải đang `Active`, và không được chồng thời gian với hợp đồng Active
 * khác trên cùng phòng (BR-006). Modal này chỉ giúp chọn ngày cho nhanh —
 * đừng coi các nhánh kiểm ở đây là bảo đảm.
 */
export function ExtendContractModal({
  currentEndDate, occupantName, roomLabel, submitting, errorMessage, onCancel, onSubmit,
}: ExtendContractModalProps) {
  const [newEndDate, setNewEndDate] = useState(() => addMonths(currentEndDate, 6));

  const isLater = newEndDate > currentEndDate;

  return (
    <ModalShell
      title={`Gia hạn hợp đồng · ${roomLabel}`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>Hủy</Button>
          <Button
            variant="primary"
            requiresWrite
            loading={submitting}
            disabled={!isLater}
            onClick={() => onSubmit(newEndDate)}
            data-testid="extend-contract-submit"
          >
            Gia hạn hợp đồng
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textPrimary, margin: 0, lineHeight: 1.55 }}>
          Hợp đồng của <strong>{occupantName}</strong> đang kết thúc ngày{" "}
          <strong>{currentEndDate}</strong>. Gia hạn sẽ dời ngày kết thúc và giữ nguyên
          người ở, tiền cọc cùng toàn bộ hóa đơn đã lập.
        </p>

        {errorMessage && (
          <div
            data-testid="extend-contract-error"
            style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, borderRadius: radius.sm, padding: "10px 14px", fontFamily: font, fontSize: 13, fontWeight: 600 }}
          >
            {errorMessage}
          </div>
        )}

        <div>
          <p style={{ fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textSecondary, margin: "0 0 8px" }}>
            Gia hạn nhanh
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_OPTIONS.map((months) => {
              const value = addMonths(currentEndDate, months);
              const isActive = newEndDate === value;
              return (
                <button
                  key={months}
                  type="button"
                  onClick={() => setNewEndDate(value)}
                  style={{
                    padding: "7px 14px",
                    background: isActive ? C.primary : C.white,
                    color: isActive ? C.white : C.textPrimary,
                    border: `1.5px solid ${isActive ? C.primary : C.border}`,
                    borderRadius: radius.sm,
                    fontFamily: font,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +{months} tháng
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="extend-end-date"
            style={{ display: "block", fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary, marginBottom: 4 }}
          >
            Ngày kết thúc mới
          </label>
          <input
            id="extend-end-date"
            data-testid="extend-end-date-input"
            type="date"
            value={newEndDate}
            min={currentEndDate}
            onChange={(e) => setNewEndDate(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              fontFamily: font,
              fontSize: 14,
              border: `1px solid ${isLater ? C.border : C.error}`,
              borderRadius: radius.sm,
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {!isLater && (
            <p style={{ fontFamily: font, fontSize: 12, color: C.error, margin: "6px 0 0" }}>
              Ngày kết thúc mới phải muộn hơn {currentEndDate}.
            </p>
          )}
        </div>
      </div>
    </ModalShell>
  );
}
