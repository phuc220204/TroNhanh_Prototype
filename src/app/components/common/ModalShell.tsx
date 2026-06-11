import { X } from "lucide-react";
import { C, font } from "../../theme";

/* ══════════════════════════════════════════
   SHARED MODAL SHELL
   Overlay + card + header (title/close) + footer.
   Dùng chung cho các modal landlord (Thêm phòng/khu trọ, Ghi điện nước…).
══════════════════════════════════════════ */
export function ModalShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(42,26,12,0.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 18, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(42,26,12,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h3 style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex" }}><X size={20} color={C.textSecondary} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>{footer}</div>
      </div>
    </div>
  );
}
