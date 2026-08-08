import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, Search } from "lucide-react";
import { C, font } from "../../theme";
import { normalizeVi } from "../../utils/vn-regions";

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
  /**
   * Hiện ô tìm kiếm trong dropdown, khớp không dấu.
   * Bật khi danh sách quá dài để đọc lướt — ví dụ 168 phường/xã của TP.HCM.
   */
  searchable?: boolean;
  /** Chữ hiện khi gõ mà không khớp mục nào. */
  emptyText?: string;
  "data-testid"?: string;
};

export function AppSelect({
  value,
  options,
  onChange,
  placeholder,
  fontSize = 15,
  searchable,
  emptyText = "Không tìm thấy mục nào",
  "data-testid": testId,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [query, setQuery] = useState("");
  // -1 = chưa có mục nào được nhắm. Dùng CHUNG cho cả di chuột lẫn bàn phím
  // để hai thứ không vẽ đè lên nhau. Khởi đầu -1 chứ không phải 0: mở dropdown
  // ra mà mục đầu đã sáng lên thì trông như nó đang được chọn.
  const [highlight, setHighlight] = useState(-1);

  const selected = options.find(o => o.value === value);
  const display = selected ? selected.label : placeholder;

  // So khớp không dấu: gõ "thu duc" phải ra "Phường Thủ Đức".
  const visible = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = normalizeVi(query);
    return options.filter(o => normalizeVi(o.label).includes(q));
  }, [options, query, searchable]);

  // Đóng rồi mở lại phải sạch từ khóa cũ — nếu không, lần sau mở ra thấy danh
  // sách đã bị lọc sẵn mà không hiểu vì sao.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setHighlight(-1);
      return;
    }
    if (searchable) searchRef.current?.focus();
  }, [open, searchable]);

  // Gõ xong thì nhắm sẵn kết quả đầu để Enter chọn được ngay; xóa hết chữ thì
  // bỏ nhắm.
  useEffect(() => { setHighlight(query.trim() ? 0 : -1); }, [query]);

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
        data-testid={testId}
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          width: "100%", border: "none", outline: "none", background: "transparent",
          fontFamily: font, fontSize, color: selected ? C.textPrimary : "rgba(122, 106, 85, 0.6)",
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
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {searchable && (
            <div style={{ position: "relative", padding: "2px 2px 6px" }}>
              <Search size={14} color={C.textSecondary} style={{ position: "absolute", left: 12, top: 13 }} />
              <input
                ref={searchRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Gõ để tìm…"
                data-testid={testId ? `${testId}-search` : undefined}
                onKeyDown={e => {
                  // Bàn phím là đường dùng chính khi danh sách dài: gõ vài chữ
                  // rồi Enter, không phải rê chuột qua 168 dòng.
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlight(h => Math.min(h + 1, visible.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlight(h => Math.max(h - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const pick = visible[highlight];
                    if (pick) { onChange(pick.value); setOpen(false); }
                  }
                }}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "9px 12px 9px 34px",
                  fontFamily: font, fontSize: 13.5, color: C.textPrimary,
                  border: `1px solid ${C.border}`, borderRadius: 8,
                  outline: "none", background: C.white,
                }}
              />
            </div>
          )}

          {visible.length === 0 ? (
            <p
              data-testid={testId ? `${testId}-empty` : undefined}
              style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, textAlign: "center", padding: "14px 8px", margin: 0 }}
            >
              {emptyText}
            </p>
          ) : visible.map((o, i) => {
            const isSel = o.value === value;
            const isHot = i === highlight;
            return (
              <button
                key={o.value}
                type="button"
                data-testid={testId ? `${testId}-option` : undefined}
                onMouseMove={() => { if (highlight !== i) setHighlight(i); }}
                onClick={() => { onChange(o.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                  width: "100%", minHeight: 40, padding: "0 12px",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  background: isSel ? C.primary : isHot ? C.cream : "transparent",
                  color: isSel ? C.white : C.textPrimary,
                  fontFamily: font, fontSize: 14, fontWeight: isSel ? 600 : 500,
                  textAlign: "left", whiteSpace: "nowrap",
                }}
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
