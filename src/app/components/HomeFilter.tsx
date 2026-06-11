import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check, MapPin, SlidersHorizontal } from "lucide-react";
import { C, font } from "../theme";

/* ══════════════════════════════════════════════════════════
   HOME FILTER — Trọ Nhanh
   A self-contained, Design-System-ready filter module.

   Logic / cấu trúc:
   • Tầng 1 (filter chính): Khu vực · Khoảng giá · Loại hình · Diện tích · Bộ lọc nâng cao
     – "Khu vực / gần trường học" được ưu tiên: rộng hơn + có icon định vị,
       vì đây là tiêu chí quyết định nhất khi người Việt tìm phòng.
   • Tầng 2 (tiện ích): chip multi-select.
   • Sticky compact bar khi cuộn: chỉ giữ Khu vực · Giá · Loại hình · Bộ lọc.
   • Mobile: bar gọn (Khu vực · Giá · Bộ lọc) + bottom sheet đầy đủ.

   Active state luôn dùng tông nâu ấm / caramel — không dùng xanh dương.
══════════════════════════════════════════════════════════ */

export type FilterState = {
  region: string | null;
  price: string | null;
  type: string | null;
  area: string | null;
  amenities: string[];
};

export const EMPTY_FILTERS: FilterState = {
  region: null,
  price: null,
  type: null,
  area: null,
  amenities: [],
};

export const REGION_OPTIONS = [
  "Quận 10", "Bình Thạnh", "Gò Vấp", "Quận 9", "Quận 12", "Thủ Đức",
  "Gần ĐH Bách Khoa", "Gần ĐH Nông Lâm", "Gần BV Gia Định",
];
export const PRICE_OPTIONS = ["Dưới 2 triệu", "2 – 4 triệu", "4 – 6 triệu", "Trên 6 triệu"];
export const TYPE_OPTIONS = ["Phòng trọ", "Căn hộ dịch vụ", "Nhà nguyên căn", "Ở ghép"];
export const AREA_OPTIONS = ["Dưới 20 m²", "20 – 30 m²", "30 – 40 m²", "Trên 40 m²"];
export const AMENITY_OPTIONS = ["Máy lạnh", "Wifi", "Gác lửng", "Chỗ để xe", "WC riêng", "Giờ giấc tự do"];
export const ADVANCED_OPTIONS = ["Thang máy", "Ban công", "Nội thất đầy đủ", "Cho nuôi thú cưng", "An ninh 24/7", "Gần chợ / siêu thị"];

export function countActive(s: FilterState) {
  return (s.region ? 1 : 0) + (s.price ? 1 : 0) + (s.type ? 1 : 0) + (s.area ? 1 : 0) + s.amenities.length;
}

type Handlers = {
  state: FilterState;
  setField: (k: "region" | "price" | "type" | "area", v: string | null) => void;
  toggleAmenity: (a: string) => void;
  clearAll: () => void;
  count: number;
};

/* ──────────────────────────────────────────
   Low-level hook: open + outside-click close
────────────────────────────────────────── */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

const PANEL: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 8px)",
  zIndex: 200,
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  boxShadow: "0 12px 32px rgba(92,70,50,0.16)",
  padding: 6,
};

/* ──────────────────────────────────────────
   Option row (single-select)
────────────────────────────────────────── */
function OptionRow({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 10, padding: "10px 12px", borderRadius: 9, border: "none", cursor: "pointer",
        fontFamily: font, fontSize: 14, fontWeight: selected ? 700 : 500,
        background: selected ? C.caramelSoft : hov ? C.bg : "transparent",
        color: selected ? C.primaryPress : C.textPrimary, transition: "background .12s",
        textAlign: "left",
      }}
    >
      {label}
      {selected && <Check size={15} strokeWidth={3} color={C.primary} />}
    </button>
  );
}

/* ──────────────────────────────────────────
   Single-select dropdown trigger
────────────────────────────────────────── */
function Dropdown({
  label, value, options, onChange, emphasis, wide, compact, align = "left",
}: {
  label: string; value: string | null; options: string[];
  onChange: (v: string | null) => void;
  emphasis?: boolean; wide?: boolean; compact?: boolean; align?: "left" | "right";
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = value != null;
  const h = compact ? 40 : 46;
  return (
    <div ref={ref} style={{ position: "relative", flex: wide ? 1.6 : 1, minWidth: compact ? 130 : 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", height: h, padding: compact ? "0 12px" : "0 14px",
          display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
          borderRadius: 12, fontFamily: font, fontSize: compact ? 13 : 14,
          fontWeight: active ? 600 : 500, transition: "all .12s",
          border: `1.5px solid ${active ? C.primary : emphasis ? C.sand : C.border}`,
          background: active ? C.caramelSoft : C.white,
          color: active ? C.primaryPress : C.textPrimary,
        }}
      >
        {emphasis && <MapPin size={compact ? 15 : 16} color={active ? C.primary : C.secondary} style={{ flexShrink: 0 }} />}
        <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {value ?? label}
        </span>
        <ChevronDown
          size={compact ? 15 : 16} strokeWidth={2.2}
          color={active ? C.primary : C.secondary}
          style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>
      {open && (
        <div style={{ ...PANEL, [align]: 0, minWidth: 230 }}>
          {options.map((opt) => (
            <OptionRow key={opt} label={opt} selected={value === opt}
              onClick={() => { onChange(value === opt ? null : opt); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────
   Utility / advanced chip (multi toggle)
────────────────────────────────────────── */
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 40, padding: active ? "0 14px 0 12px" : "0 16px", borderRadius: 999,
        display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, cursor: "pointer",
        fontFamily: font, fontSize: 13, fontWeight: active ? 700 : 500, transition: "all .12s",
        border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.caramelSoft : hov ? C.bg : C.white,
        color: active ? C.primaryPress : C.textPrimary,
      }}
    >
      {active && <Check size={14} strokeWidth={3} color={C.primary} />}
      {label}
    </button>
  );
}

/* ──────────────────────────────────────────
   Popover button (holds arbitrary panel) —
   used for "Bộ lọc nâng cao" + sticky "Bộ lọc"
────────────────────────────────────────── */
function PopButton({
  label, badge, compact, align = "left", panelWidth = 300, children,
}: {
  label: string; badge?: number; compact?: boolean; align?: "left" | "right";
  panelWidth?: number; children: React.ReactNode;
}) {
  const { open, setOpen, ref } = useDropdown();
  const active = !!badge;
  const h = compact ? 40 : 46;
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          height: h, padding: compact ? "0 14px" : "0 16px", display: "inline-flex",
          alignItems: "center", gap: 7, cursor: "pointer", borderRadius: 12,
          fontFamily: font, fontSize: compact ? 13 : 14, fontWeight: 600, transition: "all .12s",
          border: `1.5px solid ${active ? C.primary : C.border}`,
          background: active ? C.caramelSoft : C.white,
          color: active ? C.primaryPress : C.textPrimary,
        }}
      >
        <SlidersHorizontal size={compact ? 14 : 15} color={active ? C.primary : C.secondary} />
        {label}
        {badge ? (
          <span style={{
            minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: C.primary,
            color: C.white, fontSize: 11, fontWeight: 700, display: "inline-flex",
            alignItems: "center", justifyContent: "center",
          }}>{badge}</span>
        ) : (
          <ChevronDown size={compact ? 15 : 16} strokeWidth={2.2} color={C.secondary}
            style={{ transition: "transform .15s", transform: open ? "rotate(180deg)" : "none" }} />
        )}
      </button>
      {open && <div style={{ ...PANEL, [align]: 0, width: panelWidth, padding: 16 }}>{children}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────
   Small shared bits
────────────────────────────────────────── */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary,
      textTransform: "uppercase", letterSpacing: "0.07em",
    }}>{children}</span>
  );
}

function ClearBtn({ onClick, compact }: { onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none",
        color: C.secondary, fontFamily: font, fontSize: compact ? 13 : 14, fontWeight: 600,
        cursor: "pointer", padding: "6px 4px", whiteSpace: "nowrap",
      }}
    >
      <X size={14} strokeWidth={2.4} /> Xóa lọc
    </button>
  );
}

function Feedback({ count, compact }: { count: number; compact?: boolean }) {
  return (
    <span style={{ fontFamily: font, fontSize: compact ? 13 : 14, color: C.textSecondary, whiteSpace: "nowrap" }}>
      Tìm thấy <b style={{ color: C.primary, fontWeight: 700 }}>{count}</b> phòng phù hợp
    </span>
  );
}

/* Multi chips for amenities + advanced inside a panel/sheet */
function ChipWrap({ options, selected, toggle }: { options: string[]; selected: string[]; toggle: (a: string) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <Chip key={o} label={o} active={selected.includes(o)} onClick={() => toggle(o)} />
      ))}
    </div>
  );
}

/* The "rest" panel (Diện tích + Tiện ích + Nâng cao) shown by sticky "Bộ lọc" */
function RestPanel({ state, setField, toggleAmenity }: Pick<Handlers, "state" | "setField" | "toggleAmenity">) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <GroupLabel>Diện tích</GroupLabel>
        <ChipWrap options={AREA_OPTIONS} selected={state.area ? [state.area] : []}
          toggle={(a) => setField("area", state.area === a ? null : a)} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <GroupLabel>Tiện ích</GroupLabel>
        <ChipWrap options={AMENITY_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <GroupLabel>Bộ lọc nâng cao</GroupLabel>
        <ChipWrap options={ADVANCED_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   DESKTOP FILTER  (main card + sticky compact bar)
══════════════════════════════════════════════════════════ */
export function HomeFilterDesktop(props: Handlers) {
  const { state, setField, toggleAmenity, clearAll, count } = props;
  const active = countActive(state);
  const cardRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (!cardRef.current) return;
      setSticky(cardRef.current.getBoundingClientRect().bottom < 72);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* ── MAIN CARD ───────────────────────────── */}
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "28px 32px 4px" }}>
        <div
          ref={cardRef}
          style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 16,
            boxShadow: "0 6px 24px rgba(92,70,50,0.08)", padding: 20,
          }}
        >
          {/* header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
            <h3 style={{ fontFamily: font, fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
              Bộ lọc nhanh
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Feedback count={count} />
              {active > 0 && <ClearBtn onClick={clearAll} />}
            </div>
          </div>

          {/* TẦNG 1 — filter chính */}
          <div style={{ display: "flex", alignItems: "stretch", gap: 10, flexWrap: "wrap" }}>
            <Dropdown label="Khu vực / gần trường" value={state.region} options={REGION_OPTIONS}
              onChange={(v) => setField("region", v)} emphasis wide />
            <Dropdown label="Khoảng giá" value={state.price} options={PRICE_OPTIONS}
              onChange={(v) => setField("price", v)} />
            <Dropdown label="Loại hình" value={state.type} options={TYPE_OPTIONS}
              onChange={(v) => setField("type", v)} />
            <Dropdown label="Diện tích" value={state.area} options={AREA_OPTIONS}
              onChange={(v) => setField("area", v)} />
            <PopButton label="Bộ lọc nâng cao" align="right" panelWidth={300}
              badge={state.amenities.filter((a) => ADVANCED_OPTIONS.includes(a)).length || undefined}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <GroupLabel>Bộ lọc nâng cao</GroupLabel>
                <ChipWrap options={ADVANCED_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
              </div>
            </PopButton>
          </div>

          {/* divider */}
          <div style={{ height: 1, background: C.border, margin: "16px 0" }} />

          {/* TẦNG 2 — tiện ích */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <GroupLabel>Tiện ích</GroupLabel>
            <ChipWrap options={AMENITY_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
          </div>
        </div>
      </div>

      {/* ── STICKY COMPACT BAR ──────────────────── */}
      {sticky && (
        <div style={{
          position: "fixed", top: 64, left: 0, right: 0, zIndex: 90,
          background: "rgba(255,255,255,0.96)", backdropFilter: "blur(6px)",
          borderBottom: `1px solid ${C.border}`, boxShadow: "0 2px 12px rgba(92,70,50,0.08)",
        }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 10 }}>
            <Dropdown label="Khu vực" value={state.region} options={REGION_OPTIONS}
              onChange={(v) => setField("region", v)} emphasis compact />
            <Dropdown label="Giá" value={state.price} options={PRICE_OPTIONS}
              onChange={(v) => setField("price", v)} compact />
            <Dropdown label="Loại hình" value={state.type} options={TYPE_OPTIONS}
              onChange={(v) => setField("type", v)} compact />
            <PopButton label="Bộ lọc" compact align="left" panelWidth={320}
              badge={(state.area ? 1 : 0) + state.amenities.length || undefined}>
              <RestPanel state={state} setField={setField} toggleAmenity={toggleAmenity} />
            </PopButton>
            <div style={{ flex: 1 }} />
            <Feedback count={count} compact />
            {active > 0 && <ClearBtn onClick={clearAll} compact />}
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════
   MOBILE FILTER  (compact bar + bottom sheet)
══════════════════════════════════════════════════════════ */
export function HomeFilterMobile(props: Handlers) {
  const { state, setField, toggleAmenity, clearAll, count } = props;
  const active = countActive(state);
  const [sheet, setSheet] = useState(false);

  return (
    <>
      {/* sticky compact bar inside the scroll container */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50, background: C.bg,
        padding: "8px 16px 10px", borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1.4 }}>
            <Dropdown label="Khu vực" value={state.region} options={REGION_OPTIONS}
              onChange={(v) => setField("region", v)} emphasis compact />
          </div>
          <div style={{ flex: 1 }}>
            <Dropdown label="Giá" value={state.price} options={PRICE_OPTIONS}
              onChange={(v) => setField("price", v)} compact align="right" />
          </div>
          <button
            onClick={() => setSheet(true)}
            style={{
              height: 40, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 6,
              cursor: "pointer", borderRadius: 12, flexShrink: 0, fontFamily: font, fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${active ? C.primary : C.border}`,
              background: active ? C.caramelSoft : C.white,
              color: active ? C.primaryPress : C.textPrimary,
            }}
          >
            <SlidersHorizontal size={14} color={active ? C.primary : C.secondary} /> Bộ lọc
            {active > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px", borderRadius: 999, background: C.primary,
                color: C.white, fontSize: 11, fontWeight: 700, display: "inline-flex",
                alignItems: "center", justifyContent: "center",
              }}>{active}</span>
            )}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <Feedback count={count} compact />
          {active > 0 && <ClearBtn onClick={clearAll} compact />}
        </div>
      </div>

      {/* ── BOTTOM SHEET ──────────────────────── */}
      <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: sheet ? "auto" : "none" }}>
        <div
          onClick={() => setSheet(false)}
          style={{
            position: "absolute", inset: 0, background: "rgba(46,30,18,0.45)",
            opacity: sheet ? 1 : 0, transition: "opacity .25s",
          }}
        />
        <div style={{
          position: "absolute", left: 0, right: 0, bottom: 0, background: C.bg,
          borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          transform: sheet ? "translateY(0)" : "translateY(100%)",
          transition: "transform .28s cubic-bezier(.4,0,.2,1)",
        }}>
          {/* sheet header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`,
          }}>
            <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span>
            <button onClick={() => setSheet(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
              <X size={22} color={C.textSecondary} />
            </button>
          </div>

          {/* sheet content */}
          <div style={{ overflowY: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 20 }}>
            <SheetGroup title="Khu vực / gần trường học" options={REGION_OPTIONS}
              value={state.region} onSelect={(v) => setField("region", v)} />
            <SheetGroup title="Khoảng giá" options={PRICE_OPTIONS}
              value={state.price} onSelect={(v) => setField("price", v)} />
            <SheetGroup title="Loại hình" options={TYPE_OPTIONS}
              value={state.type} onSelect={(v) => setField("type", v)} />
            <SheetGroup title="Diện tích" options={AREA_OPTIONS}
              value={state.area} onSelect={(v) => setField("area", v)} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <GroupLabel>Tiện ích</GroupLabel>
              <ChipWrap options={AMENITY_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <GroupLabel>Bộ lọc nâng cao</GroupLabel>
              <ChipWrap options={ADVANCED_OPTIONS} selected={state.amenities} toggle={toggleAmenity} />
            </div>
          </div>

          {/* sheet footer */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
            borderTop: `1px solid ${C.border}`, background: C.white,
          }}>
            {active > 0 && <ClearBtn onClick={clearAll} />}
            <button
              onClick={() => setSheet(false)}
              style={{
                flex: 1, height: 48, borderRadius: 12, border: "none", cursor: "pointer",
                background: C.primary, color: C.white, fontFamily: font, fontSize: 15, fontWeight: 700,
              }}
            >
              Áp dụng{count > 0 ? ` · ${count} phòng` : ""}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* single-select chip group for the bottom sheet */
function SheetGroup({
  title, options, value, onSelect,
}: { title: string; options: string[]; value: string | null; onSelect: (v: string | null) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <GroupLabel>{title}</GroupLabel>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => (
          <Chip key={o} label={o} active={value === o} onClick={() => onSelect(value === o ? null : o)} />
        ))}
      </div>
    </div>
  );
}
