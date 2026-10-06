import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { C, font, shadow } from "../../theme";

const MODAL_MAX_WIDTH = { sm: 400, md: 460, lg: 720 } as const;

/* ══════════════════════════════════════════
   SHARED MODAL SHELL
   Overlay + card + header (title/close) + footer.
   Dùng chung cho các modal landlord (Thêm phòng/khu trọ, Ghi điện nước…).
══════════════════════════════════════════ */
export function ModalShell({ title, onClose, children, footer, size = "md" }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  /** sm 400 · md 460 (mặc định) · lg 720 — form dài/nhiều cột dùng lg. */
  size?: keyof typeof MODAL_MAX_WIDTH;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])");
    focusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const controls = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])")];
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} style={{ position: "fixed", inset: 0, background: C.overlay, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={e => e.stopPropagation()} style={{ background: C.white, borderRadius: 18, width: "100%", maxWidth: MODAL_MAX_WIDTH[size], maxHeight: "90vh", overflowY: "auto", boxShadow: shadow.lg }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h3 id={titleId} style={{ fontFamily: font, fontSize: 18, fontWeight: 800, color: C.textPrimary, margin: 0 }}>{title}</h3>
          <button type="button" aria-label="Đóng hộp thoại" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}><X size={20} color={C.textSecondary} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", flexWrap: "wrap", gap: 10, padding: "16px 24px", borderTop: `1px solid ${C.border}` }}>{footer}</div>
      </div>
    </div>
  );
}
