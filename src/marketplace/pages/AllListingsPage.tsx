import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Search, Heart, MapPin, Wifi, Wind, Car, Bath, Clock, Layers,
  Home, Bell, User, X, Star, ArrowLeft, SlidersHorizontal,
  Map, LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight,
  Check, ArrowUpDown, PawPrint,
} from "lucide-react";
import { C, font } from "../../shared/theme";
import { useBreakpoint } from "../../shared/components/useBreakpoint";
import { PublicNavbarDesktop, PublicNavbarMobile, DemoFAB } from "../../shared/components/PublicNavbar";
import { DemoBanner } from "../../shared/components/common/DemoBanner";
import { logError } from "../../shared/services/supabase-error";
import { PROPERTY_TYPES, PRICE_RANGES, AMENITIES as CATALOG_AMENITIES, AREA_RANGES } from "../../shared/constants/catalog";
import { AreaSelect } from "../../shared/components/common";
import { provinceName, loadVnWards, type VnWard } from "../../shared/utils/vn-regions";
import { parsePriceRangeLabel, parseAreaRangeLabel } from "../../shared/utils/catalog-bounds";
import { searchListings } from "../services/listing-queries";
import { getListingImage, mapAmenityToKey, mapTypeToKey } from "../services/listing-mappers";
import { SaveListingButton } from "../components/SaveListingButton";

/* ══════════════════════════════════════════
   TYPES & CONSTANTS
══════════════════════════════════════════ */
interface AllFilters {
  /** Mã tỉnh/thành. `null` = tất cả. Cấp quận/huyện đã bỏ từ 01/07/2025. */
  provinceCode: number | null;
  /** Mã phường/xã. `null` = cả tỉnh. */
  wardCode: number | null;
  priceLabel: string;
  roomTypes: string[];
  area: string;
  amenities: string[];
  status: string[];
}

const EMPTY_FILTERS: AllFilters = {
  provinceCode: null, wardCode: null, priceLabel: "", roomTypes: [], area: "", amenities: [], status: [],
};

type Room = {
  id: string; title: string; price: string; priceNum: number; area: number;
  loc: string; amenities: string[]; type: string;
  badge: "Nổi bật" | "Mới đăng" | null; img: string;
  contact_phone: string; boost_expire_at: string | null;
  /** BR-024 — chỉ có khi khu bật trang công khai. */
  rating?: number | null; reviewCount?: number; propertySlug?: string | null;
};

const PRICE_OPTIONS  = [...PRICE_RANGES];
const AREA_OPTIONS   = [...AREA_RANGES];
const AMENITY_OPTS   = [...CATALOG_AMENITIES];
const STATUS_OPTS    = ["Còn trống", "Mới đăng", "Nổi bật"];

const ROOM_TYPE_OPTS = [
  { label: "Phòng trọ",        value: "room" },
  { label: "Căn hộ mini",      value: "mini" },
  { label: "Căn hộ dịch vụ",  value: "apartment" },
  { label: "Ký túc xá",        value: "ktx" },
  { label: "Nhà nguyên căn",   value: "house" },
];

const SORT_OPTIONS = [
  { value: "newest",     label: "Mới nhất" },
  { value: "price-asc",  label: "Giá thấp đến cao" },
  { value: "price-desc", label: "Giá cao đến thấp" },
  { value: "area-desc",  label: "Diện tích lớn nhất" },
];

const AMENITY_CODE: Record<string, string> = {
  "Máy lạnh": "ac", "Wifi": "wifi", "Gác lửng": "loft",
  "Chỗ để xe": "parking", "WC riêng": "bath", "Giờ giấc tự do": "clock",
};

const AMENITY_META: Record<string, { Icon: React.ElementType; label: string }> = {
  wifi:    { Icon: Wifi,   label: "Wifi" },
  ac:      { Icon: Wind,   label: "Máy lạnh" },
  parking: { Icon: Car,    label: "Để xe" },
  bath:    { Icon: Bath,   label: "WC riêng" },
  clock:   { Icon: Clock,  label: "Giờ tự do" },
  loft:    { Icon: Layers, label: "Gác lửng" },
  pets:    { Icon: PawPrint, label: "Thú cưng" },
};

export { getListingImage, mapAmenityToKey, mapTypeToKey } from "../services/listing-mappers";

/* ══════════════════════════════════════════
   FILTER HELPERS
   Lọc và sắp xếp CHẠY Ở SERVER (marketplace/services/listing-queries.ts).
   Khối runFilters / runSort / matchPrice / matchArea client-side đã bị xóa ở
   T11a — chúng đã thành dead code sau khi chuyển sang service layer, và để lại
   thì agent sau dễ tưởng còn dùng rồi lọc hai lần.
══════════════════════════════════════════ */
/**
 * Chip khu vực cần TÊN, mà bộ lọc chỉ giữ MÃ. Tên tỉnh tra được ngay (danh sách
 * 34 mục nạp sẵn); tên phường phải chờ chunk phường/xã tải xong nên truyền vào
 * từ ngoài — chưa có thì tạm hiện tên tỉnh, không hiện mã trần.
 */
function getChips(f: AllFilters, wardLabel: string | null): string[] {
  const c: string[] = [];
  if (f.wardCode != null && wardLabel) c.push(wardLabel);
  else if (f.provinceCode != null) c.push(provinceName(f.provinceCode) ?? "");
  if (f.priceLabel) c.push(f.priceLabel);
  if (f.area) c.push(f.area);
  ROOM_TYPE_OPTS.filter(o => f.roomTypes.includes(o.value)).forEach(o => c.push(o.label));
  f.amenities.forEach(a => c.push(a));
  f.status.forEach(s => c.push(s));
  return c;
}

/* ══════════════════════════════════════════
   SHARED PRIMITIVES
══════════════════════════════════════════ */
function Btn({ variant = "primary", label, icon, fullWidth, size = "md", onClick }: {
  variant?: "primary" | "outline" | "ghost"; label: string;
  icon?: React.ReactNode; fullWidth?: boolean; size?: "sm" | "md" | "lg";
  onClick?: () => void;
}) {
  const [s, setS] = useState<"idle" | "hover" | "pressed">("idle");
  const map: Record<string, Record<string, React.CSSProperties>> = {
    primary: { idle: { background: C.primary, color: C.white, border: "none" }, hover: { background: C.primaryHover, color: C.white, border: "none" }, pressed: { background: C.primaryPress, color: C.white, border: "none" } },
    outline: { idle: { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` }, hover: { background: "#F0E7D6", color: C.primary, border: `1.5px solid ${C.primary}` }, pressed: { background: "#F0E7D6", color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` } },
    ghost:   { idle: { background: "transparent", color: C.textSecondary, border: "none" }, hover: { background: C.cream, color: C.primaryDark, border: "none" }, pressed: { background: C.border, color: C.primaryDark, border: "none" } },
  };
  const pad = size === "sm" ? "7px 16px" : size === "lg" ? "13px 26px" : "10px 22px";
  const fs  = size === "sm" ? 13 : size === "lg" ? 15 : 14;
  return (
    <button onClick={onClick} style={{ fontFamily: font, fontSize: fs, fontWeight: 600, borderRadius: 10, padding: pad, width: fullWidth ? "100%" : undefined, justifyContent: fullWidth ? "center" : undefined, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, transition: "background 0.12s", ...map[variant][s] }}
      onMouseEnter={() => setS("hover")} onMouseLeave={() => setS("idle")} onMouseDown={() => setS("pressed")} onMouseUp={() => setS("hover")}>
      {icon}{label}
    </button>
  );
}

function RoomCard({ room, onClick, listView }: { room: Room; onClick?: () => void; listView?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick} data-testid="listing-card" data-listing-id={room.id}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: C.white, border: `1px solid ${hov ? C.sand : C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: hov ? "0 8px 24px rgba(92,70,50,0.14)" : "0 2px 10px rgba(92,70,50,0.07)", transform: hov ? "translateY(-2px)" : "none", transition: "all 0.18s", cursor: "pointer", display: "flex", flexDirection: listView ? "row" : "column" }}>
      <div style={{ position: "relative", flexShrink: 0, width: listView ? 220 : "100%" }}>
        <img src={room.img} alt={room.title} style={{ width: "100%", height: listView ? "100%" : 172, objectFit: "cover", display: "block", minHeight: listView ? 140 : 0 }} />
        <SaveListingButton listingId={room.id} overlay size={16} />
        <span style={{ position: "absolute", top: 10, left: 10, background: C.available, color: "#fff", fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>Còn trống</span>
        {room.badge && (
          <span style={{ position: "absolute", bottom: 10, left: 10, background: room.badge === "Nổi bật" ? C.primary : C.repairing, color: "#fff", fontFamily: font, fontSize: 10, fontWeight: 700, borderRadius: 6, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 3 }}>
            {room.badge === "Nổi bật" && <Star size={9} fill="#fff" strokeWidth={0} />}
            {room.badge}
          </span>
        )}
      </div>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 5px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{room.title}</p>
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>{room.price}<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span></p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.area} m² · {room.loc}</span>
          {room.rating != null && (
            <span data-testid="rating-badge" style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4, background: C.cream, borderRadius: 999, padding: "1px 7px" }}>
              <Star size={10} color={C.warning} fill={C.warning} strokeWidth={0} />
              <span style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textPrimary }}>{room.rating.toFixed(1)}</span>
              <span style={{ fontFamily: font, fontSize: 10.5, color: C.textSecondary }}>({room.reviewCount ?? 0})</span>
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
          {room.amenities.slice(0, 3).map(a => {
            const m = AMENITY_META[a]; if (!m) return null;
            const { Icon, label } = m;
            return <div key={a} style={{ display: "flex", alignItems: "center", gap: 3 }}><Icon size={12} color={C.secondary} strokeWidth={2} /><span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{label}</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SKELETON / LOADING STATE
══════════════════════════════════════════ */
function SkeletonCard({ listView }: { listView?: boolean }) {
  const shimmer: React.CSSProperties = { background: C.cream, borderRadius: 6 };
  if (listView) {
    return (
      <div style={{ display: "flex", background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ width: 220, height: 140, background: C.cream, flexShrink: 0 }} />
        <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ height: 14, width: "72%", ...shimmer }} />
          <div style={{ height: 11, width: "55%", ...shimmer }} />
          <div style={{ height: 20, width: "40%", ...shimmer }} />
          <div style={{ height: 11, width: "62%", ...shimmer }} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ height: 172, background: C.cream }} />
      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ height: 14, width: "80%", ...shimmer }} />
        <div style={{ height: 11, width: "60%", ...shimmer }} />
        <div style={{ height: 20, width: "48%", ...shimmer }} />
        <div style={{ height: 11, width: "66%", ...shimmer }} />
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════
   DESKTOP — PAGE HEADER
══════════════════════════════════════════ */
function PageHeader({ count, onHome }: { count: number; onHome?: () => void }) {
  return (
    <div style={{ background: C.caramelSoft, borderBottom: `1px solid ${C.border}`, padding: "24px 32px 22px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span onClick={onHome} style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, cursor: "pointer" }}>Trang chủ</span>
          <ChevronRight size={13} color={C.border} />
          <span style={{ fontFamily: font, fontSize: 13, color: C.textPrimary, fontWeight: 600 }}>Tất cả phòng</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: font, fontSize: 28, fontWeight: 900, color: C.textPrimary, margin: "0 0 5px", letterSpacing: "-0.02em" }}>Tất cả phòng đang đăng</h1>
            <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>Khám phá các phòng trọ, căn hộ dịch vụ và chỗ ở phù hợp với nhu cầu của bạn.</p>
          </div>
          {/* Số THẬT từ `searchListings().totalCount`. Trước đây là "1.200+"
              hardcode — trên hệ thống mới triển khai thì đó là con số bịa, và
              ngay dưới nó là dòng "Hiển thị 0 trong 1.200+ phòng", tự mâu thuẫn
              trong cùng một khung nhìn. */}
          {count > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontFamily: font, fontSize: 28, fontWeight: 900, color: C.primary, letterSpacing: "-0.02em" }}>{count.toLocaleString("vi-VN")}</span>
              <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>phòng đang đăng</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DESKTOP — FILTER SIDEBAR
══════════════════════════════════════════ */
function CheckboxItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label onClick={onChange} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "3px 0" }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? C.primary : C.border}`, background: checked ? C.primary : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.12s" }}>
        {checked && <Check size={11} color="white" strokeWidth={3} />}
      </div>
      <span style={{ fontFamily: font, fontSize: 14, color: C.textPrimary }}>{label}</span>
    </label>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "6px 13px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? C.primary : hov ? C.sand : C.border}`, background: active ? C.primary : hov ? C.caramelSoft : "transparent", color: active ? C.white : C.textSecondary, fontFamily: font, fontSize: 13, transition: "all 0.12s", display: "inline-flex", alignItems: "center" }}>
      {label}
    </button>
  );
}

function SidebarSection({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ paddingBottom: 16, marginBottom: last ? 0 : 16, borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <p style={{ fontFamily: font, fontSize: 11, fontWeight: 700, color: C.textSecondary, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{title}</p>
      {children}
    </div>
  );
}

function FilterSidebar({ filters, onChange, onApply, onClear }: {
  filters: AllFilters; onChange: (f: AllFilters) => void; onApply: () => void; onClear: () => void;
}) {
  const toggle = (field: "roomTypes" | "amenities" | "status", val: string) =>
    onChange({ ...filters, [field]: filters[field].includes(val) ? filters[field].filter((x: string) => x !== val) : [...filters[field], val] });

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 2px 16px rgba(92,70,50,0.07)", padding: "20px 20px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <SlidersHorizontal size={15} color={C.primary} strokeWidth={2} />
          <span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span>
        </div>
        <button onClick={onClear} style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Xóa tất cả</button>
      </div>

      {/* 1. Khu vực */}
      <SidebarSection title="Khu vực">
        <AreaSelect
          value={{ provinceCode: filters.provinceCode, wardCode: filters.wardCode }}
          onChange={(a) => onChange({ ...filters, provinceCode: a.provinceCode, wardCode: a.wardCode })}
          allowAllProvinces
          allowAllWards
          labels={false}
          testIdPrefix="all-listings-area"
        />
      </SidebarSection>

      {/* 2. Khoảng giá */}
      <SidebarSection title="Khoảng giá">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PRICE_OPTIONS.map(p => <FilterChip key={p} label={p} active={filters.priceLabel === p} onClick={() => onChange({ ...filters, priceLabel: filters.priceLabel === p ? "" : p })} />)}
        </div>
      </SidebarSection>

      {/* 3. Loại phòng */}
      <SidebarSection title="Loại phòng">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ROOM_TYPE_OPTS.map(({ label, value }) => (
            <CheckboxItem key={value} label={label} checked={filters.roomTypes.includes(value)} onChange={() => toggle("roomTypes", value)} />
          ))}
        </div>
      </SidebarSection>

      {/* 4. Diện tích */}
      <SidebarSection title="Diện tích">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AREA_OPTIONS.map(a => <FilterChip key={a} label={a} active={filters.area === a} onClick={() => onChange({ ...filters, area: filters.area === a ? "" : a })} />)}
        </div>
      </SidebarSection>

      {/* 5. Tiện ích */}
      <SidebarSection title="Tiện ích">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AMENITY_OPTS.map(a => <FilterChip key={a} label={a} active={filters.amenities.includes(a)} onClick={() => toggle("amenities", a)} />)}
        </div>
      </SidebarSection>

      {/* 6. Trạng thái */}
      <SidebarSection title="Trạng thái" last>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STATUS_OPTS.map(s => <CheckboxItem key={s} label={s} checked={filters.status.includes(s)} onChange={() => toggle("status", s)} />)}
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
   ACTIVE FILTER CHIPS (desktop)
══════════════════════════════════════════ */
function ActiveChips({ chips, onRemove }: { chips: string[]; onRemove: (c: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
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

/* ══════════════════════════════════════════
   DESKTOP — LISTING TOOLBAR
══════════════════════════════════════════ */
function ListingToolbar({ count, sortBy, onSort, viewMode, onView, onMap }: {
  count: number; sortBy: string; onSort: (s: string) => void;
  viewMode: "grid" | "list"; onView: (m: "grid" | "list") => void; onMap: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: 0 }}>
        {count > 0
          ? <>Tìm thấy <strong style={{ color: C.textPrimary }}>{count.toLocaleString("vi-VN")}</strong> phòng</>
          : <>Chưa có phòng nào phù hợp</>}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Sort */}
        <div style={{ position: "relative" }}>
          <select value={sortBy} onChange={e => onSort(e.target.value)}
            style={{ padding: "8px 32px 8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, fontFamily: font, fontSize: 13, color: C.textPrimary, cursor: "pointer", appearance: "none", outline: "none" }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <ChevronDown size={13} color={C.textSecondary} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
        {/* View toggle */}
        <div style={{ display: "flex", border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          {([["grid", LayoutGrid, "Lưới"], ["list", List, "Danh sách"]] as const).map(([mode, Icon, label]) => (
            <button key={mode} onClick={() => onView(mode)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 13px", border: "none", cursor: "pointer", fontFamily: font, fontSize: 13, transition: "all 0.12s", background: viewMode === mode ? C.primary : C.white, color: viewMode === mode ? C.white : C.textSecondary }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </div>
        {/* Map */}
        <button onClick={onMap}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, color: C.textSecondary }}>
          <Map size={14} />Bản đồ
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAP PLACEHOLDER
══════════════════════════════════════════ */
function MapPlaceholder() {
  return (
    <div style={{ height: "calc(100vh - 280px)", minHeight: 400, borderRadius: 14, border: `1px solid ${C.border}`, background: C.caramelSoft, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, position: "relative", overflow: "hidden" }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.25 }}>
        {Array.from({ length: 14 }).map((_, i) => <line key={`h${i}`} x1="0" y1={`${(i+1)*7}%`} x2="100%" y2={`${(i+1)*7}%`} stroke={C.sand} strokeWidth="1" />)}
        {Array.from({ length: 18 }).map((_, i) => <line key={`v${i}`} x1={`${(i+1)*6}%`} y1="0" x2={`${(i+1)*6}%`} y2="100%" stroke={C.sand} strokeWidth="1" />)}
      </svg>
      <div style={{ background: C.primary, borderRadius: "50% 50% 50% 0", width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 20px rgba(138,106,69,0.4)", transform: "rotate(-45deg)", zIndex: 1 }}>
        <MapPin size={24} color={C.white} style={{ transform: "rotate(45deg)" }} />
      </div>
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <p style={{ fontFamily: font, fontSize: 16, fontWeight: 600, color: C.textPrimary, margin: "0 0 4px" }}>Chế độ xem bản đồ</p>
        <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: 0 }}>Xem vị trí các phòng đang đăng trên bản đồ</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   EMPTY STATE
══════════════════════════════════════════ */
/**
 * Hai trạng thái rỗng khác nhau, và trước đây bị gộp thành một:
 *   • ĐANG LỌC mà không ra kết quả → khuyên nới bộ lọc, cho nút "Xóa lọc"
 *   • CHƯA LỌC gì mà vẫn rỗng      → hệ thống chưa có tin nào
 *
 * Bản cũ luôn hiện "Thử mở rộng khu vực… hoặc xóa bớt tiện ích" kèm nút "Xóa lọc"
 * — trên hệ thống mới triển khai, người dùng chưa chạm bộ lọc nào mà bị bảo đi
 * xóa lọc, và tưởng mình đang lọc sai chứ không biết là chưa có tin nào cả.
 */
function EmptyState({ onClear, isFiltered }: { onClear: () => void; isFiltered: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "72px 24px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 16 }} data-testid="all-listings-empty">
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Search size={28} color={C.sand} />
      </div>
      <p style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>
        {isFiltered ? "Không tìm thấy phòng phù hợp" : "Chưa có tin đăng nào"}
      </p>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 auto 24px", maxWidth: 340 }}>
        {isFiltered
          ? "Thử mở rộng khu vực, thay đổi khoảng giá hoặc xóa bớt tiện ích."
          : "Hiện chưa có phòng nào được đăng công khai. Bạn có phòng cho thuê? Đăng tin để tiếp cận người đang tìm trọ."}
      </p>
      {isFiltered && <Btn variant="outline" label="Xóa lọc" onClick={onClear} />}
    </div>
  );
}

/* ══════════════════════════════════════════
   PAGINATION
══════════════════════════════════════════ */
function Pagination({ current, total, onChange }: { current: number; total: number; onChange: (p: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 44, paddingTop: 32, borderTop: `1px solid ${C.border}` }}>
      <button onClick={() => onChange(Math.max(1, current - 1))} disabled={current === 1}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 16px", border: `1.5px solid ${current === 1 ? C.border : C.primary}`, borderRadius: 9, background: "transparent", cursor: current === 1 ? "not-allowed" : "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: current === 1 ? C.border : C.primary, opacity: current === 1 ? 0.5 : 1 }}>
        <ChevronLeft size={15} />Trước
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <button key={p} onClick={() => onChange(p)}
          style={{ width: 38, height: 38, border: `1.5px solid ${current === p ? C.primary : C.border}`, borderRadius: 9, cursor: "pointer", fontFamily: font, fontSize: 14, fontWeight: current === p ? 700 : 400, background: current === p ? C.primary : "transparent", color: current === p ? C.white : C.textSecondary }}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(Math.min(total, current + 1))} disabled={current === total}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "9px 16px", border: `1.5px solid ${current === total ? C.border : C.primary}`, borderRadius: 9, background: "transparent", cursor: current === total ? "not-allowed" : "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: current === total ? C.border : C.primary, opacity: current === total ? 0.5 : 1 }}>
        Sau<ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════
   MOBILE COMPONENTS
══════════════════════════════════════════ */
function MobileSearchBar() {
  return (
    <div style={{ padding: "10px 16px 6px", background: C.bg }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.white, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "10px 14px" }}>
        <Search size={16} color={C.sand} />
        <span style={{ fontFamily: font, fontSize: 14, color: C.textSecondary }}>Tìm khu vực, trường học...</span>
      </div>
    </div>
  );
}

function MobileToolbar({ count, onFilter, onSort, onMap }: { count: number; onFilter: () => void; onSort: () => void; onMap: () => void }) {
  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, position: "sticky", top: 52, zIndex: 90 }}>
      <span style={{ fontFamily: font, fontSize: 14, fontWeight: 700, color: C.textPrimary, flex: 1 }}>{count} phòng</span>
      <button onClick={onFilter} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: `1.5px solid ${C.primary}`, borderRadius: 9, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, minHeight: 44 }}>
        <SlidersHorizontal size={13} />Lọc
      </button>
      <button onClick={onSort} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 14px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 500, color: C.textSecondary, minHeight: 44 }}>
        <ArrowUpDown size={13} />Sắp xếp
      </button>
      <button onClick={onMap} style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, color: C.textSecondary, minHeight: 44 }}>
        <Map size={13} />
      </button>
    </div>
  );
}

function MobileActiveChips({ chips, onRemove }: { chips: string[]; onRemove: (c: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div style={{ overflowX: "auto", padding: "8px 16px", display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
      {chips.map(chip => (
        <div key={chip} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: font, fontSize: 13, color: C.textPrimary, whiteSpace: "nowrap" }}>
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
  const tabs = [{ icon: Home, label: "Trang chủ" }, { icon: Search, label: "Tìm phòng" }, { icon: Bell, label: "Thông báo" }, { icon: User, label: "Tài khoản" }];
  return (
    <nav style={{ background: C.white, borderTop: `1px solid ${C.border}`, height: 60, display: "flex", position: "sticky", bottom: 0, zIndex: 100, boxShadow: "0 -2px 12px rgba(92,70,50,0.08)", flexShrink: 0 }}>
      {tabs.map(({ icon: Icon, label }, i) => {
        const on = active === i;
        return (
          <button key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer" }}>
            <Icon size={22} color={on ? C.primary : "#9B8C78"} strokeWidth={on ? 2.5 : 1.8} />
            <span style={{ fontFamily: font, fontSize: 10, fontWeight: on ? 700 : 400, color: on ? C.primary : "#9B8C78" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ══════════════════════════════════════════
   MOBILE — FILTER BOTTOM SHEET
══════════════════════════════════════════ */
function MobileFilterSheet({ open, filters, onChange, onApply, onClose, onClear }: {
  open: boolean; filters: AllFilters; onChange: (f: AllFilters) => void;
  onApply: () => void; onClose: () => void; onClear: () => void;
}) {
  const toggle = (field: "roomTypes" | "amenities" | "status", val: string) =>
    onChange({ ...filters, [field]: filters[field].includes(val) ? filters[field].filter((x: string) => x !== val) : [...filters[field], val] });

  const chipBtn = (label: string, active: boolean, cb: () => void) => (
    <button key={label} onClick={cb}
      style={{ padding: "10px 16px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : "transparent", color: active ? C.white : C.textSecondary, fontFamily: font, fontSize: 14, minHeight: 44, transition: "all 0.12s", display: "inline-flex", alignItems: "center", gap: 5 }}>
      {active && <Check size={13} />}{label}
    </button>
  );

  const grpTitle = (t: string) => (
    <p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{t}</p>
  );

  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,18,10,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: C.white, borderRadius: "20px 20px 0 0", height: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(30,18,10,0.2)" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "12px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}><X size={20} color={C.textSecondary} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>

          <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {grpTitle("Khu vực")}
            <AreaSelect
              value={{ provinceCode: filters.provinceCode, wardCode: filters.wardCode }}
              onChange={(a) => onChange({ ...filters, provinceCode: a.provinceCode, wardCode: a.wardCode })}
              allowAllProvinces
              allowAllWards
              labels={false}
              testIdPrefix="all-listings-area-mobile"
            />
          </div>

          <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {grpTitle("Khoảng giá")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PRICE_OPTIONS.map(p => chipBtn(p, filters.priceLabel === p, () => onChange({ ...filters, priceLabel: filters.priceLabel === p ? "" : p })))}
            </div>
          </div>

          <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {grpTitle("Loại phòng")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ROOM_TYPE_OPTS.map(({ label, value }) => chipBtn(label, filters.roomTypes.includes(value), () => toggle("roomTypes", value)))}
            </div>
          </div>

          <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {grpTitle("Diện tích")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AREA_OPTIONS.map(a => chipBtn(a, filters.area === a, () => onChange({ ...filters, area: filters.area === a ? "" : a })))}
            </div>
          </div>

          <div style={{ padding: "16px 0", borderBottom: `1px solid ${C.border}` }}>
            {grpTitle("Tiện ích")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {AMENITY_OPTS.map(a => chipBtn(a, filters.amenities.includes(a), () => toggle("amenities", a)))}
            </div>
          </div>

          <div style={{ padding: "16px 0 28px" }}>
            {grpTitle("Trạng thái")}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {STATUS_OPTS.map(s => chipBtn(s, filters.status.includes(s), () => toggle("status", s)))}
            </div>
          </div>
        </div>
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
   MOBILE — SORT BOTTOM SHEET
══════════════════════════════════════════ */
function MobileSortSheet({ open, sortBy, onChange, onClose }: { open: boolean; sortBy: string; onChange: (s: string) => void; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,18,10,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: C.white, borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 40px rgba(30,18,10,0.2)" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "12px auto 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Sắp xếp theo</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8 }}><X size={20} color={C.textSecondary} /></button>
        </div>
        <div style={{ padding: "8px 0 24px" }}>
          {SORT_OPTIONS.map(({ value, label }) => (
            <button key={value} onClick={() => { onChange(value); onClose(); }}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: font, fontSize: 15, color: sortBy === value ? C.primary : C.textPrimary, fontWeight: sortBy === value ? 700 : 400, minHeight: 52, textAlign: "left" }}>
              {label}
              {sortBy === value && <div style={{ width: 20, height: 20, borderRadius: "50%", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={12} color="white" strokeWidth={3} /></div>}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
const ROOMS_PER_PAGE = 6;
const TOTAL_PAGES = 3;

export function AllListingsPage() {
  const navigate = useNavigate();
  const onBack = () => navigate(-1);
  const { isMobile, isTablet } = useBreakpoint();

  const [dbRooms, setDbRooms]        = useState<Room[]>([]);
  const [totalCount, setTotalCount]  = useState(0);
  const [totalPages, setTotalPages]  = useState(1);
  const [filters, setFilters]        = useState<AllFilters>(EMPTY_FILTERS);
  const [pending, setPending]        = useState<AllFilters>(EMPTY_FILTERS);
  const [sortBy, setSortBy]          = useState("newest");
  const [viewMode, setViewMode]      = useState<"grid" | "list" | "map">("grid");
  const [page, setPage]              = useState(1);
  const [isLoading, setIsLoading]    = useState(true);
  const [mobileFilter, setMobileFilter] = useState(false);
  const [mobileSort, setMobileSort]    = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const { priceMin, priceMax } = parsePriceRangeLabel(filters.priceLabel);
        const { areaMin, areaMax } = parseAreaRangeLabel(filters.area);

        const result = await searchListings({
          provinceCode: filters.provinceCode,
          wardCodes: filters.wardCode != null ? [filters.wardCode] : undefined,
          priceMin,
          priceMax,
          areaMin,
          areaMax,
          propertyTypes: filters.roomTypes.length > 0 ? filters.roomTypes : undefined,
          amenities: filters.amenities.length > 0 ? filters.amenities : undefined,
          sort: sortBy as any,
          page,
          pageSize: ROOMS_PER_PAGE,
        });

        const mapped: Room[] = result.data.map((item) => ({
          id: item.id,
          title: item.title,
          price: item.price,
          priceNum: item.priceNum,
          area: item.area,
          loc: item.loc,
          amenities: item.amenities.map(mapAmenityToKey),
          type: mapTypeToKey(item.type),
          badge: item.badge,
          img: item.img,
          contact_phone: item.contact_phone,
          boost_expire_at: item.boost_expire_at,
          rating: item.rating ?? null,
          reviewCount: item.reviewCount ?? 0,
          propertySlug: item.propertySlug ?? null,
        }));

        setDbRooms(mapped);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
      } catch (err) {
        logError("AllListingsPage.fetchRooms", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, [filters, sortBy, page]);

  const applyFilters = () => {
    setFilters({ ...pending });
    setPage(1);
  };

  // Có bộ lọc nào đang bật? Quyết định EmptyState nói gì.
  const isFiltered =
    filters.provinceCode !== null ||
    filters.wardCode !== null ||
    filters.priceLabel !== "" ||
    filters.area !== "" ||
    filters.roomTypes.length > 0 ||
    filters.amenities.length > 0 ||
    filters.status.length > 0;

  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setPending(EMPTY_FILTERS);
    setPage(1);
  };

  const removeChip = (chip: string) => {
    setFilters(f => {
      if (chip === areaChipLabel)                     return { ...f, provinceCode: null, wardCode: null };
      if (f.priceLabel === chip)                      return { ...f, priceLabel: "" };
      if (f.area === chip)                            return { ...f, area: "" };
      const typeVal = ROOM_TYPE_OPTS.find(o => o.label === chip)?.value;
      if (typeVal && f.roomTypes.includes(typeVal))   return { ...f, roomTypes: f.roomTypes.filter(t => t !== typeVal) };
      if (f.amenities.includes(chip))                 return { ...f, amenities: f.amenities.filter(a => a !== chip) };
      if (f.status.includes(chip))                    return { ...f, status: f.status.filter(s => s !== chip) };
      return f;
    });
    setPage(1);
  };

  // Tên phường cho chip: chỉ tra khi người dùng thực sự lọc tới phường, nên
  // chunk 3.321 mục vẫn không bị tải ở lần vào trang đầu tiên.
  const [wardLabel, setWardLabel] = useState<string | null>(null);
  useEffect(() => {
    if (filters.wardCode == null) { setWardLabel(null); return; }
    let cancelled = false;
    loadVnWards()
      .then((ws: readonly VnWard[]) => {
        if (cancelled) return;
        setWardLabel(ws.find((w) => w.code === filters.wardCode)?.name ?? null);
      })
      .catch(() => { if (!cancelled) setWardLabel(null); });
    return () => { cancelled = true; };
  }, [filters.wardCode]);

  const chips = getChips(filters, wardLabel);
  // Chip khu vực chỉ có tối đa một cái, và `removeChip` cần biết nhãn của nó để
  // xóa đúng cặp tỉnh+phường thay vì dò theo chuỗi.
  const areaChipLabel =
    filters.wardCode != null && wardLabel
      ? wardLabel
      : filters.provinceCode != null
        ? provinceName(filters.provinceCode)
        : null;

  /* ── MOBILE ──────────────────────────────────── */
  if (isMobile) {
    return (
      <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <PublicNavbarMobile onSearch={onBack} />
        <DemoBanner mobile />
        <MobileSearchBar />
        <MobileToolbar count={totalCount} onFilter={() => { setPending({ ...filters }); setMobileFilter(true); }} onSort={() => setMobileSort(true)} onMap={() => setViewMode(v => v === "map" ? "grid" : "map")} />
        <MobileActiveChips chips={chips} onRemove={removeChip} />

        <div style={{ flex: 1, overflowY: "auto" }}>
          {viewMode === "map" ? (
            <div style={{ padding: 16 }}><MapPlaceholder /></div>
          ) : isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 16px 24px" }}>
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : dbRooms.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 16px 32px" }}>
              {dbRooms.map(r => <RoomCard key={r.id} room={r} onClick={() => navigate(`/phong/${r.id}`)} />)}
            </div>
          ) : (
            <div style={{ padding: 16 }}><EmptyState onClear={clearAll} isFiltered={isFiltered} /></div>
          )}
        </div>

        <BottomTabBar active={1} />
        <MobileFilterSheet open={mobileFilter} filters={pending} onChange={setPending} onApply={applyFilters} onClose={() => setMobileFilter(false)} onClear={clearAll} />
        <MobileSortSheet open={mobileSort} sortBy={sortBy} onChange={setSortBy} onClose={() => setMobileSort(false)} />
      </div>
    );
  }

  /* ── DESKTOP / TABLET ────────────────────────── */
  const gridCols = isTablet ? 2 : 3;

  return (
    <div style={{ background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* MARKER-MAKE-KIT-INVOKED */}
      <PublicNavbarDesktop onSearch={onBack} />
      <DemoBanner />
      <PageHeader count={totalCount} onHome={() => navigate("/")} />

      <div style={{ flex: 1, maxWidth: 1280, margin: "0 auto", width: "100%", padding: "28px 32px 80px", display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* Sticky sidebar */}
        <aside style={{ width: 300, flexShrink: 0 }}>
          <div style={{ position: "sticky", top: 78, maxHeight: "calc(100vh - 90px)", overflowY: "auto", paddingBottom: 24 }}>
            <FilterSidebar filters={pending} onChange={setPending} onApply={applyFilters} onClear={clearAll} />
          </div>
        </aside>

        {/* Results */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <ListingToolbar
             count={totalCount}
             sortBy={sortBy}
             onSort={setSortBy}
             viewMode={viewMode === "map" ? "grid" : viewMode}
             onView={setViewMode}
             onMap={() => setViewMode(v => v === "map" ? "grid" : "map")}
          />

          <ActiveChips chips={chips} onRemove={removeChip} />

          {viewMode === "map" ? (
            <MapPlaceholder />
          ) : isLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20 }}>
              {Array.from({ length: ROOMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} listView={viewMode === "list"} />)}
            </div>
          ) : dbRooms.length > 0 ? (
            <>
              <div style={viewMode === "list"
                ? { display: "flex", flexDirection: "column", gap: 14 }
                : { display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 20 }}>
                {dbRooms.map(r => <RoomCard key={r.id} room={r} onClick={() => navigate(`/phong/${r.id}`)} listView={viewMode === "list"} />)}
              </div>
              {totalPages > 1 && (
                <Pagination current={page} total={totalPages} onChange={p => setPage(p)} />
              )}
            </>
          ) : (
            <EmptyState onClear={clearAll} isFiltered={isFiltered} />
          )}
        </main>
      </div>
      <DemoFAB />
    </div>
  );
}
