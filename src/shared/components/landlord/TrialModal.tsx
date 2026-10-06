import { useState } from "react";
import { Building2 } from "lucide-react";
import { C, font, radius } from "../../theme";
import { Button, ModalShell } from "../common";
import { toUserMessage } from "../../services/supabase-error";
import { TRIAL_DAYS } from "../../services/subscription-service";

/**
 * Mời dùng thử gói quản lý vận hành TRIAL_DAYS ngày. Dùng ModalShell (Esc, focus trap);
 * nút có trạng thái đang xử lý để không bấm 2 lần, lỗi kích hoạt được báo rõ.
 */
export function TrialRegisterModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [isActivating, setIsActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  if (!open) return null;

  const handleConfirm = async () => {
    setIsActivating(true);
    setErrorMessage(null);
    try {
      await onConfirm();
    } catch (err) {
      setErrorMessage(toUserMessage(err));
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <ModalShell
      title="Dùng thử gói Quản lý vận hành"
      onClose={() => { if (!isActivating) onCancel(); }}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={isActivating}>Để sau</Button>
          <Button variant="primary" loading={isActivating} onClick={() => void handleConfirm()} data-testid="trial-activate-btn">
            Bắt đầu dùng thử {TRIAL_DAYS} ngày
          </Button>
        </>
      }
    >
      <div style={{ textAlign: "center", fontFamily: font }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Building2 size={30} color={C.primary} />
        </div>
        <p style={{ fontSize: 14, color: C.textSecondary, margin: 0, lineHeight: 1.6 }}>
          Quản lý phòng, người ở, hợp đồng, điện nước và hóa đơn ở một nơi. Dùng thử miễn phí trong{" "}
          <strong style={{ color: C.primary }}>{TRIAL_DAYS} ngày</strong>, không cần thanh toán trước.
        </p>
        {errorMessage && (
          <p role="alert" style={{ margin: "14px 0 0", padding: "10px 12px", borderRadius: radius.sm, background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error, fontSize: 13 }}>
            {errorMessage}
          </p>
        )}
      </div>
    </ModalShell>
  );
}
