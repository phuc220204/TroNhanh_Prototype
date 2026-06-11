import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { C, font } from "../../theme";

/* ══════════════════════════════════════════
   APP SELECT — custom dropdown khớp design system
   Thay native <select> để dropdown đồng bộ tone
   warm beige/brown. Menu render qua portal +
   position: fixed nên KHÔNG bị cắt bởi overflow:hidden
   của search card, và nổi trên mọi section.
══════════════════════════════════════════ */
export type SelectOption = { label: string; value: string };

type AppSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  fontSize?: number;
};

export function AppSelect({ value, options, onChange, placeholder, fontSize = 15 }: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const selected = options.find(o => o.value === value);
  const display = selected ? selected.label : placeholder;

  const updateRect = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updateRect();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    // capture=true để bắt scroll trên mọi vùng cuộn lồng nhau
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          width: "100%", border: "none", outline: "none", background: "transparent",
          fontFamily: font, fontSize, color: selected ? C.textPrimary : C.textSecondary,
          cursor: "pointer", padding: 0, textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{display}</span>
        <ChevronDown size={13} color={C.textSecondary} style={{ flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          style={{
            position: "fixed",
            top: rect.bottom + 6,
            left: rect.left,
            minWidth: rect.width,
            background: C.white,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(92,70,50,0.12)",
            padding: 6,
            zIndex: 1000,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {options.map(o => {
            const isSel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  width: "100%", minHeight: 40, padding: "0 12px",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  background: isSel ? C.primary : "transparent",
                  color: isSel ? C.white : C.textPrimary,
                  fontFamily: font, fontSize: 14, fontWeight: isSel ? 600 : 500,
                  textAlign: "left", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#F0E7D6"; }}
                onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
                {isSel && <Check size={15} color="#fff" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}
