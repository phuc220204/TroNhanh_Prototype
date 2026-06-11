import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Heart, MapPin, Wifi, Wind, Car, Bath, Clock, Layers,
  Home, Bell, User, X, Star, ArrowLeft, SlidersHorizontal,
  Map, List, ChevronDown, Search, Check,
} from "lucide-react";
import { C, font } from "../theme";
import { useBreakpoint } from "../components/useBreakpoint";
import { PublicNavbarDesktop, PublicNavbarMobile, DemoFAB } from "../components/PublicNavbar";
import { DemoBanner } from "../components/common/DemoBanner";

/* ══════════════════════════════════════════
   TYPES & CONSTANTS
══════════════════════════════════════════ */
interface SearchFilters {
  region: string;
  priceLabel: string;
  type: string;
  area: string;
  amenities: string[];
}

const EMPTY_FILTERS: SearchFilters = {
  region: "", priceLabel: "", type: "Tất cả", area: "", amenities: [],
};

type Room = {
  id: number; title: string; price: string; area: number;
  loc: string; amenities: string[]; type: "room" | "apartment";
  badge: string | null; img: string;
};

/* ══════════════════════════════════════════
   MOCK DATA — 9 phòng kết quả tìm kiếm
══════════════════════════════════════════ */
const SEARCH_ROOMS: Room[] = [
  {
    id: 1, title: "Phòng trọ gần ĐH Hutech, có gác lửng, WC riêng",
    price: "2.800.000", area: 22, loc: "Bình Thạnh",
    amenities: ["wifi", "loft", "bath"], type: "room", badge: "Nổi bật",
    img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80",
  },
  {
    id: 2, title: "Căn hộ dịch vụ full nội thất, thang máy, Quận 7",
    price: "7.200.000", area: 42, loc: "Quận 7",
    amenities: ["wifi", "ac", "parking"], type: "apartment", badge: null,
    img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80",
  },
  {
    id: 3, title: "Phòng trọ Bình Thạnh, WC riêng, giờ giấc tự do",
    price: "3.200.000", area: 25, loc: "Bình Thạnh",
    amenities: ["wifi", "bath", "clock"], type: "room", badge: null,
    img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
  },
  {
    id: 4, title: "Studio mới xây, nội thất hiện đại, gần Vincom",
    price: "5.500.000", area: 35, loc: "Gò Vấp",
    amenities: ["wifi", "ac", "parking"], type: "apartment", badge: "Mới đăng",
    img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80",
  },
  {
    id: 5, title: "Phòng gác lửng thoáng, máy lạnh, chỗ để xe rộng",
    price: "2.100.000", area: 20, loc: "Quận 12",
    amenities: ["ac", "loft", "parking"], type: "room", badge: null,
    img: "https://images.unsplash.com/photo-1489171078254-c3365d6e359f?w=600&q=80",
  },
  {
    id: 6, title: "Căn hộ mini cao cấp, ban công view đẹp, 1PN",
    price: "6.000.000", area: 38, loc: "Quận 1",
    amenities: ["wifi", "ac", "bath"], type: "apartment", badge: "Nổi bật",
    img: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80",
  },
  {
    id: 7, title: "Phòng trọ sinh viên sạch, an ninh, gần ĐH Nông Lâm",
    price: "1.900.000", area: 18, loc: "Thủ Đức",
    amenities: ["wifi", "clock", "ac"], type: "room", badge: null,
    img: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=600&q=80",
  },
  {
    id: 8, title: "Phòng trọ Bình Thạnh, Wifi cao cấp, máy lạnh mới",
    price: "3.500.000", area: 28, loc: "Bình Thạnh",
    amenities: ["wifi", "ac", "bath"], type: "room", badge: null,
    img: "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=600&q=80",
  },
  {
    id: 9, title: "Căn hộ dịch vụ Quận 9, full tiện nghi, thang máy",
    price: "4.800.000", area: 32, loc: "Quận 9",
    amenities: ["wifi", "ac", "parking"], type: "apartment", badge: null,
    img: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&q=80",
  },
];

const AMENITY_META: Record<string, { Icon: React.ElementType; label: string }> = {
  wifi:    { Icon: Wifi,   label: "Wifi" },
  ac:      { Icon: Wind,   label: "Máy lạnh" },
  parking: { Icon: Car,    label: "Để xe" },
  bath:    { Icon: Bath,   label: "WC riêng" },
  clock:   { Icon: Clock,  label: "Giờ tự do" },
  loft:    { Icon: Layers, label: "Gác lửng" },
};

const AMENITY_CODE: Record<string, string> = {
  "Máy lạnh": "ac", "Wifi": "wifi", "Gác lửng": "loft",
  "Chỗ để xe": "parking", "WC riêng": "bath",
  "Giờ giấc tự do": "clock", "Cho nuôi thú cưng": "pets",
};

const REGION_OPTIONS = [
  "Bình Thạnh", "Quận 1", "Quận 7", "Quận 9",
  "Quận 10", "Quận 12", "Gò Vấp", "Thủ Đức",
];
const PRICE_OPTIONS  = ["Dưới 2 triệu", "2 – 4 triệu", "4 – 6 triệu", "Trên 6 triệu"];
const TYPE_OPTIONS   = ["Tất cả", "Phòng trọ", "Căn hộ dịch vụ"];
const AREA_OPTIONS   = ["Dưới 20 m²", "20 – 30 m²", "30 – 40 m²", "Trên 40 m²"];
const AMENITY_OPTS   = ["Máy lạnh", "Wifi", "Gác lửng", "Chỗ để xe", "WC riêng", "Giờ giấc tự do", "Cho nuôi thú cưng"];

/* ══════════════════════════════════════════
   FILTER HELPERS
══════════════════════════════════════════ */
function matchPrice(priceStr: string, label: string): boolean {
  const p = parseInt(priceStr.replace(/\D/g, ""), 10);
  switch (label) {
    case "Dưới 2 triệu": return p < 2_000_000;
    case "2 – 4 triệu":  return p >= 2_000_000 && p < 4_000_000;
    case "4 – 6 triệu":  return p >= 4_000_000 && p <= 6_000_000;
    case "Trên 6 triệu": return p > 6_000_000;
    default:             return true;
  }
}

function matchArea(area: number, label: string): boolean {
  switch (label) {
    case "Dưới 20 m²": return area < 20;
    case "20 – 30 m²": return area >= 20 && area < 30;
    case "30 – 40 m²": return area >= 30 && area < 40;
    case "Trên 40 m²": return area >= 40;
    default:           return true;
  }
}

function getActiveChips(f: SearchFilters): string[] {
  const chips: string[] = [];
  if (f.region) chips.push(f.region);
  if (f.priceLabel) chips.push(f.priceLabel);
  if (f.area) chips.push(f.area);
  if (f.type && f.type !== "Tất cả") chips.push(f.type);
  f.amenities.forEach(a => chips.push(a));
  return chips;
}

function applyFilters(rooms: Room[], f: SearchFilters): Room[] {
  return rooms.filter(r => {
    if (f.region && !r.loc.toLowerCase().includes(f.region.toLowerCase())) return false;
    if (f.priceLabel && !matchPrice(r.price, f.priceLabel)) return false;
    if (f.area && !matchArea(r.area, f.area)) return false;
    if (f.type === "Phòng trọ" && r.type !== "room") return false;
    if (f.type === "Căn hộ dịch vụ" && r.type !== "apartment") return false;
    const known = f.amenities.filter(a => AMENITY_CODE[a]);
    if (known.some(a => !r.amenities.includes(AMENITY_CODE[a]))) return false;
    return true;
  });
}

/* ══════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════ */
function Btn({
  variant = "primary", label, icon, fullWidth, size = "md", onClick, disabled,
}: {
  variant?: "primary" | "outline" | "ghost"; label: string;
  icon?: React.ReactNode; fullWidth?: boolean; size?: "sm" | "md" | "lg";
  onClick?: () => void; disabled?: boolean;
}) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const map: Record<string, Record<string, React.CSSProperties>> = {
    primary: {
      idle:     { background: C.primary,      color: C.white, border: "none" },
      hover:    { background: C.primaryHover, color: C.white, border: "none" },
      pressed:  { background: C.primaryPress, color: C.white, border: "none" },
      disabled: { background: "#D8C9B2",      color: "#A8987F", border: "none" },
    },
    outline: {
      idle:     { background: "transparent", color: C.primary,      border: `1.5px solid ${C.primary}` },
      hover:    { background: "#F0E7D6",     color: C.primary,      border: `1.5px solid ${C.primary}` },
      pressed:  { background: "#F0E7D6",     color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
      disabled: { background: "transparent", color: "#C0B09A",      border: `1.5px solid #D8C9B2` },
    },
    ghost: {
      idle:     { background: "transparent", color: C.textSecondary, border: "none" },
      hover:    { background: C.cream,       color: C.primaryDark,   border: "none" },
      pressed:  { background: C.border,      color: C.primaryDark,   border: "none" },
      disabled: { background: "transparent", color: "#C0B09A",       border: "none" },
    },
  };
  const pad = size === "sm" ? "7px 16px" : size === "lg" ? "14px 28px" : "10px 22px";
  const fs  = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  const key = disabled ? "disabled" : s;
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ fontFamily: font, fontSize: fs, fontWeight: 600, borderRadius: 10, padding: pad,
        width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", gap: 6,
        transition: "background 0.12s, color 0.12s", ...map[variant][key] }}
      onMouseEnter={() => !disabled && setS("hover")}
      onMouseLeave={() => !disabled && setS("idle")}
      onMouseDown={() => !disabled && setS("pressed")}
      onMouseUp={() => !disabled && setS("hover")}
    >{icon}{label}</button>
  );
}

function RoomCard({ room, mobile, onClick }: { room: Room; mobile?: boolean; onClick?: () => void }) {
  const [saved, setSaved] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: C.white, border: `1px solid ${hov ? C.sand : C.border}`,
        borderRadius: 14, overflow: "hidden",
        boxShadow: hov ? "0 8px 24px rgba(92,70,50,0.14)" : "0 2px 10px rgba(92,70,50,0.07)",
        transform: hov ? "translateY(-2px)" : "none",
        transition: "all 0.18s", cursor: "pointer",
        display: "flex", flexDirection: mobile ? "row" : "column",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0, width: mobile ? 140 : "100%" }}>
        <img src={room.img} alt={room.title}
          style={{ width: "100%", height: mobile ? 140 : 172, objectFit: "cover", display: "block" }} />
        <button onClick={e => { e.stopPropagation(); setSaved(v => !v); }}
          style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", border: "none", borderRadius: 999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 1px 6px rgba(0,0,0,0.12)" }}>
          <Heart size={16} color={saved ? C.repairing : C.secondary} fill={saved ? C.repairing : "none"} strokeWidth={2} />
        </button>
        <span style={{ position: "absolute", top: 10, left: 10, background: C.available, color: "#fff", fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>
          Trống
        </span>
        {room.badge && (
          <span style={{ position: "absolute", bottom: 10, left: 10, background: room.badge === "Nổi bật" ? C.primary : C.repairing, color: "#fff", fontFamily: font, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
            {room.badge === "Nổi bật" && <Star size={9} fill="#fff" strokeWidth={0} />}
            {room.badge}
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 5px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {room.title}
        </p>
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>
          {room.price} đ<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>
            {room.area} m² · {room.loc}
          </span>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
          {room.amenities.slice(0, 3).map(a => {
            const m = AMENITY_META[a];
            if (!m) return null;
            const { Icon, label } = m;
            return (
              <div key={a} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Icon size={12} color={C.secondary} strokeWidth={2} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Search size={28} color={C.sand} />
      </div>
      <p style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>
        Không tìm thấy phòng phù hợp
      </p>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 auto 24px", maxWidth: 300 }}>
        Thử mở rộng khu vực hoặc điều chỉnh khoảng giá.
      </p>
      <Btn variant="outline" label="Xóa lọc" onClick={onClear} />
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — FILTER SIDEBAR
══════════════════════════════════════════ */
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "6px 14px", borderRadius: 999, cursor: "pointer",
        border: `1.5px solid ${active ? C.primary : hov ? C.sand : C.border}`,
        background: active ? C.primary : hov ? C.caramelSoft : "transparent",
        color: active ? C.white : C.textSecondary,
        fontFamily: font, fontSize: 13, transition: "all 0.12s",
        display: "inline-flex", alignItems: "center",
      }}
    >{label}</button>
  );
}

function SidebarSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ paddingBottom: 16, marginBottom: last ? 0 : 16, borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function FilterSidebar({
  filters, onChange, onApply, onClear,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const toggleAmenity = (a: string) =>
    onChange({ ...filters, amenities: filters.amenities.includes(a) ? filters.amenities.filter(x => x !== a) : [...filters.amenities, a] });

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 2px 16px rgba(92,70,50,0.08)", padding: "20px 20px 18px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <SlidersHorizontal size={15} color={C.primary} strokeWidth={2} />
          <span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span>
        </div>
        <button onClick={onClear} style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          Xóa tất cả
        </button>
      </div>

      {/* 1. Khu vực */}
      <SidebarSection title="Khu vực">
        <div style={{ position: "relative" }}>
          <select value={filters.region}
            onChange={e => onChange({ ...filters, region: e.target.value })}
            style={{ width: "100%", padding: "9px 36px 9px 12px", border: `1.5px solid ${filters.region ? C.primary : C.border}`, borderRadius: 10, background: C.white, fontFamily: font, fontSize: 14, color: filters.region ? C.textPrimary : C.textSecondary, cursor: "pointer", appearance: "none", outline: "none" }}>
            <option value="">Tất cả khu vực</option>
            {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <ChevronDown size={14} color={C.textSecondary} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
        <p style={{ fontFamily: font, fontSize: 11, color: C.textSecondary, margin: "6px 0 0" }}>
          Gần trường học, khu làm việc...
        </p>
      </SidebarSection>

      {/* 2. Khoảng giá */}
      <SidebarSection title="Khoảng giá">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRICE_OPTIONS.map(p => (
            <FilterChip key={p} label={p} active={filters.priceLabel === p}
              onClick={() => onChange({ ...filters, priceLabel: filters.priceLabel === p ? "" : p })} />
          ))}
        </div>
      </SidebarSection>

      {/* 3. Loại hình */}
      <SidebarSection title="Loại hình">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TYPE_OPTIONS.map(t => {
            const active = filters.type === t;
            return (
              <label key={t} onClick={() => onChange({ ...filters, type: t })}
                style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${active ? C.primary : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: active ? C.primary : "transparent", transition: "all 0.12s" }}>
                  {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.white }} />}
                </div>
                <span style={{ fontFamily: font, fontSize: 14, color: C.textPrimary }}>{t}</span>
              </label>
            );
          })}
        </div>
      </SidebarSection>

      {/* 4. Diện tích */}
      <SidebarSection title="Diện tích">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AREA_OPTIONS.map(a => (
            <FilterChip key={a} label={a} active={filters.area === a}
              onClick={() => onChange({ ...filters, area: filters.area === a ? "" : a })} />
          ))}
        </div>
      </SidebarSection>

      {/* 5. Tiện ích */}
      <SidebarSection title="Tiện ích" last>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AMENITY_OPTS.map(a => (
            <FilterChip key={a} label={a} active={filters.amenities.includes(a)}
              onClick={() => toggleAmenity(a)} />
          ))}
        </div>
      </SidebarSection>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, paddingTop: 18, borderTop: `1px solid ${C.border}`, marginTop: 16 }}>
        <Btn variant="outline" label="Xóa lọc" onClick={onClear} />
        <div style={{ flex: 1 }}>
          <Btn variant="primary" label="Áp dụng" fullWidth onClick={onApply} />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — RESULTS HEADER
══════════════════════════════════════════ */
function ActiveChips({ chips, onRemove }: { chips: string[]; onRemove: (chip: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {chips.map(chip => (
        <div key={chip} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: font, fontSize: 13, color: C.textPrimary }}>
          {chip}
          <button onClick={() => onRemove(chip)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <X size={12} color={C.textSecondary} />
          </button>
        </div>
      ))}
    </div>
  );
}

function ResultsHeader({
  count, filters, onRemoveChip, sortBy, onSortChange, viewMode, onViewModeChange,
}: {
  count: number; filters: SearchFilters;
  onRemoveChip: (chip: string) => void;
  sortBy: string; onSortChange: (s: string) => void;
  viewMode: "list" | "map"; onViewModeChange: (m: "list" | "map") => void;
}) {
  const chips = getActiveChips(filters);
  return (
    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 21, fontWeight: 700, color: C.textPrimary, margin: 0 }}>
            Tìm thấy{" "}
            <span style={{ color: C.primary }}>{count} phòng</span>
            {" "}phù hợp
          </h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "4px 0 0" }}>
            Dựa trên khu vực, giá và tiện ích bạn đã chọn
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {/* Sort dropdown */}
          <div style={{ position: "relative" }}>
            <select value={sortBy} onChange={e => onSortChange(e.target.value)}
              style={{ padding: "9px 32px 9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, fontFamily: font, fontSize: 13, color: C.textPrimary, cursor: "pointer", appearance: "none", outline: "none" }}>
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="price-asc">Giá: Thấp đến cao</option>
              <option value="price-desc">Giá: Cao đến thấp</option>
              <option value="area">Diện tích</option>
            </select>
            <ChevronDown size={13} color={C.textSecondary} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          {/* View toggle */}
          <div style={{ display: "flex", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            {([["list", List, "Danh sách"], ["map", Map, "Bản đồ"]] as const).map(([mode, Icon, label]) => (
              <button key={mode} onClick={() => onViewModeChange(mode)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "none", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, transition: "all 0.12s", background: viewMode === mode ? C.primary : C.white, color: viewMode === mode ? C.white : C.textSecondary }}>
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <ActiveChips chips={chips} onRemove={onRemoveChip} />
    </div>
  );
}

/* ══════════════════════════════════════════
   MAP PLACEHOLDER
══════════════════════════════════════════ */
function MapPlaceholder() {
  return (
    <div style={{ height: "calc(100vh - 240px)", minHeight: 420, borderRadius: 14, border: `1px solid ${C.border}`, background: C.caramelSoft, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, position: "relative", overflow: "hidden" }}>
      {/* Grid lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={`${(i + 1) * 7}%`} x2="100%" y2={`${(i + 1) * 7}%`} stroke={C.sand} strokeWidth="1" />
        ))}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={`v${i}`} x1={`${(i + 1) * 6}%`} y1="0" x2={`${(i + 1) * 6}%`} y2="100%" stroke={C.sand} strokeWidth="1" />
        ))}
      </svg>
      {/* Fake road lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.18 }}>
        <line x1="0" y1="42%" x2="100%" y2="42%" stroke={C.secondary} strokeWidth="3" />
        <line x1="0" y1="67%" x2="100%" y2="67%" stroke={C.secondary} strokeWidth="2" />
        <line x1="32%" y1="0" x2="32%" y2="100%" stroke={C.secondary} strokeWidth="3" />
        <line x1="68%" y1="0" x2="68%" y2="100%" stroke={C.secondary} strokeWidth="2" />
      </svg>
      {/* Pin */}
      <div style={{ background: C.primary, borderRadius: "50% 50% 50% 0", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(138,106,69,0.4)", transform: "rotate(-45deg)", zIndex: 1 }}>
        <MapPin size={24} color={C.white} style={{ transform: "rotate(45deg)" }} />
      </div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <p style={{ fontFamily: font, fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>
          Chế độ xem bản đồ
        </p>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>
          Hiển thị các phòng trọ trên bản đồ TP. Hồ Chí Minh
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — TOP NAVBAR
══════════════════════════════════════════ */

function MobileSummaryBar({
  count, onFilter, onMap,
}: { count: number; onFilter: () => void; onMap: () => void }) {
  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 52, zIndex: 90 }}>
      <span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, flex: 1 }}>
        {count} phòng
      </span>
      <button onClick={onFilter}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: `1.5px solid ${C.primary}`, borderRadius: 10, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, minHeight: 44 }}>
        <SlidersHorizontal size={14} />
        Lọc
      </button>
      <button onClick={onMap}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.textSecondary, minHeight: 44 }}>
        <Map size={14} />
        Bản đồ
      </button>
    </div>
  );
}

function MobileActiveChips({ chips, onRemove }: { chips: string[]; onRemove: (c: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div style={{ overflowX: "auto", padding: "10px 16px 10px", display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
      {chips.map(chip => (
        <div key={chip} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: font, fontSize: 13, color: C.textPrimary, whiteSpace: "nowrap" }}>
          {chip}
          <button onClick={() => onRemove(chip)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
            <X size={12} color={C.textSecondary} />
          </button>
        </div>
      ))}
    </div>
  );
}

function BottomTabBar({ active }: { active: number }) {
  const navigate = useNavigate();
  const tabs: { icon: typeof Home; label: string; to?: string }[] = [
    { icon: Home,   label: "Trang chủ", to: "/" },
    { icon: Search, label: "Tìm phòng", to: "/search" },
    { icon: Bell,   label: "Thông báo" },
    { icon: User,   label: "Tài khoản" },
  ];
  return (
    <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", position: "sticky", bottom: 0, zIndex: 100, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)" }}>
      {tabs.map(({ icon: Icon, label, to }, i) => {
        const isActive = active === i;
        return (
          <button key={label} onClick={to ? () => navigate(to) : undefined} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
            <Icon size={22} color={isActive ? C.primary : "#9B8C78"} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? C.primary : "#9B8C78" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ══════════════════════════════════════════
   MOBILE — FILTER BOTTOM SHEET
══════════════════════════════════════════ */
function MobileFilterSheet({
  open, filters, onChange, onApply, onClose, onClear,
}: {
  open: boolean; filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onApply: () => void; onClose: () => void; onClear: () => void;
}) {
  const toggleAmenity = (a: string) =>
    onChange({ ...filters, amenities: filters.amenities.includes(a) ? filters.amenities.filter(x => x !== a) : [...filters.amenities, a] });

  if (!open) return null;

  const chipBtn = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick}
      style={{ padding: "10px 18px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : "transparent", color: active ? C.white : C.textSecondary, fontFamily: font, fontSize: 14, minHeight: 44, transition: "all 0.12s", display: "inline-flex", alignItems: "center", gap: 6 }}>
      {active && <Check size={14} />}
      {label}
    </button>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,18,10,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: C.white, borderRadius: "20px 20px 0 0", height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(30,18,10,0.2)" }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "12px auto 0", flexShrink: 0 }} />
        {/* Sheet header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center" }}>
            <X size={20} color={C.textSecondary} />
          </button>
        </div>
        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>

          {/* 1. Khu vực */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Khu vực</p>
            <div style={{ position: "relative" }}>
              <select value={filters.region} onChange={e => onChange({ ...filters, region: e.target.value })}
                style={{ width: "100%", padding: "12px 36px 12px 14px", border: `1.5px solid ${filters.region ? C.primary : C.border}`, borderRadius: 12, background: C.white, fontFamily: font, fontSize: 15, color: filters.region ? C.textPrimary : C.textSecondary, cursor: "pointer", appearance: "none", outline: "none", minHeight: 44 }}>
                <option value="">Tất cả khu vực</option>
                {REGION_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <ChevronDown size={16} color={C.textSecondary} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>

          {/* 2. Khoảng giá */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Khoảng giá</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {PRICE_OPTIONS.map(p => chipBtn(p, filters.priceLabel === p, () => onChange({ ...filters, priceLabel: filters.priceLabel === p ? "" : p })))}
            </div>
          </div>

          {/* 3. Loại hình */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Loại hình</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {TYPE_OPTIONS.map(t => chipBtn(t, filters.type === t, () => onChange({ ...filters, type: t })))}
            </div>
          </div>

          {/* 4. Diện tích */}
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Diện tích</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {AREA_OPTIONS.map(a => chipBtn(a, filters.area === a, () => onChange({ ...filters, area: filters.area === a ? "" : a })))}
            </div>
          </div>

          {/* 5. Tiện ích */}
          <div style={{ padding: "18px 0 28px" }}>
            <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Tiện ích</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {AMENITY_OPTS.map(a => chipBtn(a, filters.amenities.includes(a), () => toggleAmenity(a)))}
            </div>
          </div>
        </div>

        {/* Sticky bottom actions */}
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px 20px", display: "flex", gap: 12, flexShrink: 0, background: C.white }}>
          <div style={{ flex: 1 }}>
            <Btn variant="outline" label="Xóa lọc" fullWidth size="lg" onClick={() => { onClear(); onClose(); }} />
          </div>
          <div style={{ flex: 2 }}>
            <Btn variant="primary" label="Áp dụng" fullWidth size="lg" onClick={() => { onApply(); onClose(); }} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE EXPORT
══════════════════════════════════════════ */
export function SearchResultsPage() {
  const navigate = useNavigate();
  const onBack = () => navigate(-1);
  const onRoomClick = () => navigate("/room/1");
  const { isMobile, isTablet } = useBreakpoint();

  const [filters, setFilters]         = useState<SearchFilters>(EMPTY_FILTERS);
  const [pendingFilters, setPending]   = useState<SearchFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy]            = useState("newest");
  const [viewMode, setViewMode]        = useState<"list" | "map">("list");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const filteredRooms = applyFilters(SEARCH_ROOMS, filters);

  const removeChip = (chip: string) => {
    setFilters(f => {
      if (f.region === chip)             return { ...f, region: "" };
      if (f.priceLabel === chip)         return { ...f, priceLabel: "" };
      if (f.area === chip)               return { ...f, area: "" };
      if (f.type === chip)               return { ...f, type: "Tất cả" };
      if (f.amenities.includes(chip))    return { ...f, amenities: f.amenities.filter(a => a !== chip) };
      return f;
    });
  };

  const clearAll = () => { setFilters(EMPTY_FILTERS); setPending(EMPTY_FILTERS); };
  const applyPending = () => setFilters({ ...pendingFilters });

  const openMobileFilter = () => { setPending({ ...filters }); setMobileFilterOpen(true); };

  const chips = getActiveChips(filters);

  /* ── MOBILE ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={onBack} />
        <DemoBanner mobile />
        <MobileSummaryBar count={filteredRooms.length} onFilter={openMobileFilter} onMap={() => setViewMode(v => v === "map" ? "list" : "map")} />
        <MobileActiveChips chips={chips} onRemove={removeChip} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {viewMode === "map" ? (
            <div style={{ padding: 16 }}><MapPlaceholder /></div>
          ) : filteredRooms.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 16px 24px" }}>
              {filteredRooms.map(r => <RoomCard key={r.id} room={r} mobile onClick={onRoomClick} />)}
            </div>
          ) : (
            <div style={{ padding: 16 }}><EmptyState onClear={clearAll} /></div>
          )}
        </div>

        <BottomTabBar active={1} />
        <MobileFilterSheet
          open={mobileFilterOpen}
          filters={pendingFilters}
          onChange={setPending}
          onApply={applyPending}
          onClose={() => setMobileFilterOpen(false)}
          onClear={clearAll}
        />
      </div>
    );
  }

  /* ── DESKTOP / TABLET ────────────────────────────────── */
  const gridCols = isTablet ? 2 : 3;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <PublicNavbarDesktop onSearch={onBack} />
      <DemoBanner />

      <div style={{ flex: 1, display: "flex", maxWidth: 1280, margin: "0 auto", width: "100%", padding: "0 32px", gap: 28, alignItems: "flex-start" }}>
        {/* Sticky sidebar */}
        <aside style={{ width: 300, flexShrink: 0, paddingTop: 28 }}>
          <div style={{ position: "sticky", top: 78, maxHeight: "calc(100vh - 90px)", overflowY: "auto", paddingBottom: 24 }}>
            <FilterSidebar
              filters={pendingFilters}
              onChange={setPending}
              onApply={applyPending}
              onClear={clearAll}
            />
          </div>
        </aside>

        {/* Results area */}
        <main style={{ flex: 1, minWidth: 0, paddingTop: 28, paddingBottom: 72 }}>
          <ResultsHeader
            count={filteredRooms.length}
            filters={filters}
            onRemoveChip={removeChip}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {viewMode === "map" ? (
            <MapPlaceholder />
          ) : filteredRooms.length > 0 ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20 }}>
                {filteredRooms.map(r => <RoomCard key={r.id} room={r} onClick={onRoomClick} />)}
              </div>
              <div style={{ textAlign: "center", marginTop: 48 }}>
                <Btn variant="outline" label="Xem thêm phòng" size="lg" />
                <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "10px 0 0" }}>
                  Đang hiển thị {filteredRooms.length} phòng đại diện
                </p>
              </div>
            </>
          ) : (
            <EmptyState onClear={clearAll} />
          )}
        </main>
      </div>
      <DemoFAB />
    </div>
  );
}
