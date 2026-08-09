import { useState } from "react";
import { ModalShell } from "../../../shared/components/common/ModalShell";
import { Button } from "../../../shared/components/common/Button";
import { C, font, radius, space } from "../../../shared/theme";

interface AddCoOccupantModalProps {
  roomLabel: string;
  primaryName: string;
  submitting: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (input: { full_name: string; phone_number?: string; user_id?: string | null }) => void;
}

const inputStyle = {
  width: "100%",
  fontFamily: font,
  fontSize: 14,
  color: C.textPrimary,
  padding: `${space[3]}px ${space[3]}px`,
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: radius.md,
  outline: "none",
  boxSizing: "border-box" as const,
};

/**
 * Thêm người ở cùng vào hợp đồng ĐANG CÓ của phòng.
 *
 * Không tạo hợp đồng mới ⇒ BR-006 (một phòng một hợp đồng Active) không bị
 * đụng tới. Số người trong phòng không giới hạn — tuỳ chủ trọ và diện tích.
 */
export function AddCoOccupantModal({
  roomLabel,
  primaryName,
  submitting,
  errorMessage,
  onCancel,
  onSubmit,
}: AddCoOccupantModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const canSubmit = fullName.trim().length >= 2 && !submitting;

  return (
    <ModalShell
      title={`Thêm người ở cùng · ${roomLabel}`}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>Hủy</Button>
          <Button
            requiresWrite
            disabled={!canSubmit}
            loading={submitting}
            onClick={() => onSubmit({ full_name: fullName.trim(), phone_number: phone.trim() || undefined })}
            data-testid="add-co-occupant-submit"
          >
            Thêm vào hợp đồng
          </Button>
        </>
      }
    >
      <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: `0 0 ${space[4]}px`, lineHeight: 1.55 }}>
        Người này sẽ cùng đứng tên hợp đồng với <strong style={{ color: C.textPrimary }}>{primaryName}</strong>.
        Hợp đồng không bị tạo mới, nên điện nước và hóa đơn vẫn tính chung cho cả phòng.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: space[3] }}>
        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
            Họ và tên <span style={{ color: C.error }}>*</span>
          </p>
          <input
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="VD: Nguyễn Văn B"
            data-testid="co-occupant-name-input"
            style={inputStyle}
          />
        </div>

        <div>
          <p style={{ fontFamily: font, fontSize: 13, fontWeight: 700, color: C.textPrimary, margin: `0 0 ${space[2]}px` }}>
            Số điện thoại
          </p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="VD: 0901234567"
            data-testid="co-occupant-phone-input"
            style={inputStyle}
          />
        </div>
      </div>

      <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: `${space[3]}px 0 0`, lineHeight: 1.5 }}>
        Gắn tài khoản Renter cho người này ở cột "Tài khoản Renter" sau khi thêm. Họ vẫn phải tự xác nhận
        liên kết mới có hiệu lực (BR-029).
      </p>

      {errorMessage && (
        <p style={{ fontFamily: font, fontSize: 13, color: C.error, margin: `${space[2]}px 0 0` }}>{errorMessage}</p>
      )}
    </ModalShell>
  );
}
