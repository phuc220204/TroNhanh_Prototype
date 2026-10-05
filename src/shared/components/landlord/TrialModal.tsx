import { Building2 } from "lucide-react";
import { C, font } from "../../theme";

export function TrialRegisterModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(20,10,4,0.5)", zIndex: 600, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 601, background: C.white, borderRadius: 20, padding: "32px 36px", maxWidth: 440, width: "calc(100vw - 48px)", textAlign: "center", boxShadow: "0 20px 60px rgba(20,10,4,0.25)" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FEF6EC", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Building2 size={30} color={C.primary} />
        </div>
        <h3 style={{ fontFamily: font, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px" }}>
          Kích hoạt Gói Quản lý vận hành (SaaS)
        </h3>
        <p style={{ fontFamily: font, fontSize: 13.5, color: C.textSecondary, margin: "0 0 24px", lineHeight: 1.6 }}>
          Tính năng này thuộc gói dịch vụ Quản lý vận hành. Hãy bắt đầu dùng thử miễn phí trong <strong style={{ color: C.primary }}>30 ngày</strong> để tự động quản lý phòng, khách thuê, điện nước và hóa đơn tự động!
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "13px", background: "transparent", border: `1.5px solid ${C.border}`, borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textSecondary, cursor: "pointer" }}>
            Để sau
          </button>
          <button onClick={onConfirm}
            style={{ flex: 2, padding: "13px", background: C.primary, border: "none", borderRadius: 10, fontFamily: font, fontSize: 14, fontWeight: 700, color: "white", cursor: "pointer", boxShadow: "0 2px 10px rgba(138,106,69,0.3)" }}>
            Bắt đầu dùng thử (30 ngày)
          </button>
        </div>
      </div>
    </>
  );
}
