import React, { useEffect, useState } from "react";
import {
  Bath,
  Car,
  Check,
  ChevronDown,
  Clock,
  Layers,
  MapPin,
  PawPrint,
  Search,
  SlidersHorizontal,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { C, font } from "../../../shared/theme";
import { AreaSelect } from "../../../shared/components/common";
import {
  AMENITIES as CATALOG_AMENITIES,
  AREA_RANGES,
  PRICE_RANGES,
  PROPERTY_TYPES,
} from "../../../shared/constants/catalog";
import { SaveListingButton } from "../../components/SaveListingButton";
import { FEATURED_CARD_BORDER, ListingPostedTime, ListingTag } from "../../components/ListingCardMeta";
import {
  getActiveSearchChips,
  type SearchFilters,
  type SearchRoom,
  type SearchSort,
} from "./search-results-model";

const AMENITY_META: Record<string, { Icon: React.ElementType; label: string }> = {
  wifi: { Icon: Wifi, label: "Wifi" },
  ac: { Icon: Wind, label: "Máy lạnh" },
  parking: { Icon: Car, label: "Để xe" },
  bath: { Icon: Bath, label: "WC riêng" },
  clock: { Icon: Clock, label: "Giờ tự do" },
  loft: { Icon: Layers, label: "Gác lửng" },
  pets: { Icon: PawPrint, label: "Thú cưng" },
};

const PRICE_OPTIONS = [...PRICE_RANGES];
const TYPE_OPTIONS = ["Tất cả", ...PROPERTY_TYPES];
const AREA_OPTIONS = [...AREA_RANGES];
const AMENITY_OPTIONS = [...CATALOG_AMENITIES];

function SearchButton({
  variant = "primary",
  label,
  fullWidth,
  size = "md",
  onClick,
}: {
  variant?: "primary" | "outline";
  label: string;
  fullWidth?: boolean;
  size?: "md" | "lg";
  onClick?: () => void;
}) {
  const [state, setState] = useState<"idle" | "hover" | "pressed">("idle");
  const styles: Record<string, Record<string, React.CSSProperties>> = {
    primary: {
      idle: { background: C.primary, color: C.white, border: "none" },
      hover: { background: C.primaryHover, color: C.white, border: "none" },
      pressed: { background: C.primaryPress, color: C.white, border: "none" },
    },
    outline: {
      idle: { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` },
      hover: { background: C.cream, color: C.primary, border: `1.5px solid ${C.primary}` },
      pressed: { background: C.cream, color: C.primaryPress, border: `1.5px solid ${C.primaryPress}` },
    },
  };
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setState("hover")}
      onMouseLeave={() => setState("idle")}
      onMouseDown={() => setState("pressed")}
      onMouseUp={() => setState("hover")}
      style={{
        fontFamily: font,
        fontSize: size === "lg" ? 15 : 14,
        fontWeight: 600,
        borderRadius: 10,
        padding: size === "lg" ? "14px 28px" : "10px 22px",
        width: fullWidth ? "100%" : undefined,
        justifyContent: fullWidth ? "center" : undefined,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        transition: "background 0.12s, color 0.12s",
        ...styles[variant][state],
      }}
    >
      {label}
    </button>
  );
}

export function SearchRoomCard({ room, mobile, onClick }: { room: SearchRoom; mobile?: boolean; onClick?: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const isFeatured = room.badge === "featured";
  return (
    <div
      onClick={onClick}
      role="link"
      tabIndex={0}
      aria-label={`Xem tin ${room.title}`}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick?.(); } }}
      data-testid="listing-card"
      data-listing-id={room.id}
      data-price={room.priceNum}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: C.white,
        border: `${isFeatured ? 1.5 : 1}px solid ${isFeatured ? FEATURED_CARD_BORDER : isHovered ? C.sand : C.border}`,
        borderRadius: 14,
        overflow: "hidden",
        boxShadow: isHovered ? "0 8px 24px rgba(92,70,50,0.14)" : "0 2px 10px rgba(92,70,50,0.07)",
        transform: isHovered ? "translateY(-2px)" : "none",
        transition: "all 0.18s",
        cursor: "pointer",
        display: "flex",
        flexDirection: mobile ? "row" : "column",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0, width: mobile ? 140 : "100%" }}>
        <img src={room.img} alt={room.title} style={{ width: "100%", height: mobile ? 140 : 172, objectFit: "cover", display: "block" }} />
        <SaveListingButton listingId={room.id} overlay size={16} />
        <span style={{ position: "absolute", top: 10, left: 10, background: C.available, color: C.white, fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 10px" }}>Trống</span>
        <ListingTag badge={room.badge} style={{ position: "absolute", bottom: 10, left: 10 }} />
      </div>
      <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: font, fontSize: 14, fontWeight: 600, color: C.textPrimary, margin: "0 0 5px", lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{room.title}</p>
        <p style={{ fontFamily: font, fontSize: 18, fontWeight: 700, color: C.primary, margin: "0 0 4px" }}>
          {room.price}<span style={{ fontSize: 12, fontWeight: 400, color: C.textSecondary }}>/tháng</span>
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          <MapPin size={12} color={C.textSecondary} />
          <span style={{ fontFamily: font, fontSize: 12, color: C.textSecondary }}>{room.area} m² · {room.loc}</span>
        </div>
        <ListingPostedTime postedAt={room.postedAt} style={{ marginTop: -6, marginBottom: 10 }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: "auto" }}>
          {room.amenities.slice(0, 3).map((amenity) => {
            const meta = AMENITY_META[amenity];
            if (!meta) return null;
            return (
              <div key={amenity} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <meta.Icon size={12} color={C.secondary} strokeWidth={2} />
                <span style={{ fontFamily: font, fontSize: 11, color: C.textSecondary }}>{meta.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px", background: C.white, border: `1px solid ${C.border}`, borderRadius: 16 }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Search size={28} color={C.sand} />
      </div>
      <p style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: "0 0 8px" }}>Không tìm thấy phòng phù hợp</p>
      <p style={{ fontFamily: font, fontSize: 14, color: C.textSecondary, margin: "0 auto 24px", maxWidth: 300 }}>Thử mở rộng khu vực hoặc điều chỉnh khoảng giá.</p>
      <SearchButton variant="outline" label="Xóa lọc" onClick={onClear} />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ padding: "6px 14px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? C.primary : isHovered ? C.sand : C.border}`, background: active ? C.primary : isHovered ? C.caramelSoft : "transparent", color: active ? C.white : C.textSecondary, fontFamily: font, fontSize: 13, transition: "all 0.12s", display: "inline-flex", alignItems: "center" }}
    >
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

export function FilterSidebar({ filters, onChange, onApply, onClear }: { filters: SearchFilters; onChange: (filters: SearchFilters) => void; onApply: () => void; onClear: () => void }) {
  const toggleAmenity = (amenity: string) => onChange({ ...filters, amenities: filters.amenities.includes(amenity) ? filters.amenities.filter((item) => item !== amenity) : [...filters.amenities, amenity] });
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 2px 16px rgba(92,70,50,0.08)", padding: "20px 20px 18px", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}><SlidersHorizontal size={15} color={C.primary} /><span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span></div>
        <button type="button" onClick={onClear} style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Xóa tất cả</button>
      </div>
      <SidebarSection title="Khu vực">
        <AreaSelect value={{ provinceCode: filters.provinceCode, wardCode: filters.wardCode }} onChange={(area) => onChange({ ...filters, provinceCode: area.provinceCode, wardCode: area.wardCode })} allowAllProvinces allowAllWards labels={false} testIdPrefix="search-area" />
      </SidebarSection>
      <SidebarSection title="Khoảng giá">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{PRICE_OPTIONS.map((price) => <FilterChip key={price} label={price} active={filters.priceLabel === price} onClick={() => onChange({ ...filters, priceLabel: filters.priceLabel === price ? "" : price })} />)}</div>
      </SidebarSection>
      <SidebarSection title="Loại hình">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TYPE_OPTIONS.map((type) => {
            const active = filters.type === type;
            return (
              <label key={type} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="radio" name="property-type" checked={active} onChange={() => onChange({ ...filters, type })} style={{ accentColor: C.primary }} />
                <span style={{ fontFamily: font, fontSize: 14, color: C.textPrimary }}>{type}</span>
              </label>
            );
          })}
        </div>
      </SidebarSection>
      <SidebarSection title="Diện tích">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{AREA_OPTIONS.map((area) => <FilterChip key={area} label={area} active={filters.area === area} onClick={() => onChange({ ...filters, area: filters.area === area ? "" : area })} />)}</div>
      </SidebarSection>
      <SidebarSection title="Tiện ích" last>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{AMENITY_OPTIONS.map((amenity) => <FilterChip key={amenity} label={amenity} active={filters.amenities.includes(amenity)} onClick={() => toggleAmenity(amenity)} />)}</div>
      </SidebarSection>
      <div style={{ display: "flex", gap: 10, paddingTop: 18, borderTop: `1px solid ${C.border}`, marginTop: 16 }}>
        <SearchButton variant="outline" label="Xóa lọc" onClick={onClear} />
        <div style={{ flex: 1 }}><SearchButton label="Áp dụng" fullWidth onClick={onApply} /></div>
      </div>
    </div>
  );
}

function ActiveChips({ chips, onRemove }: { chips: string[]; onRemove: (chip: string) => void }) {
  if (chips.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {chips.map((chip) => (
        <div key={chip} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: font, fontSize: 13, color: C.textPrimary }}>
          {chip}<button type="button" aria-label={`Bỏ bộ lọc ${chip}`} onClick={() => onRemove(chip)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, margin: "-10px -10px -10px 0" }}><X size={12} color={C.textSecondary} /></button>
        </div>
      ))}
    </div>
  );
}

export function ResultsHeader({ count, filters, onRemoveChip, sortBy, onSortChange }: { count: number; filters: SearchFilters; onRemoveChip: (chip: string) => void; sortBy: SearchSort; onSortChange: (sort: SearchSort) => void }) {
  return (
    <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: font, fontSize: 21, fontWeight: 700, color: C.textPrimary, margin: 0 }}>Tìm thấy <span style={{ color: C.primary }}>{count} phòng</span> phù hợp</h2>
          <p style={{ fontFamily: font, fontSize: 13, color: C.textSecondary, margin: "4px 0 0" }}>Dựa trên khu vực, giá và tiện ích bạn đã chọn</p>
        </div>
        <div style={{ position: "relative" }}>
          <select aria-label="Sắp xếp kết quả" data-testid="search-sort" value={sortBy} onChange={(event) => onSortChange(event.target.value as SearchSort)} style={{ padding: "9px 32px 9px 12px", minHeight: 44, border: `1.5px solid ${C.border}`, borderRadius: 10, background: C.white, fontFamily: font, fontSize: 13, color: C.textPrimary, cursor: "pointer", appearance: "none", outline: "none" }}>
            <option value="newest">Sắp xếp: Mới nhất</option>
            <option value="price-asc">Giá: Thấp đến cao</option>
            <option value="price-desc">Giá: Cao đến thấp</option>
            <option value="area-desc">Diện tích: Lớn đến nhỏ</option>
          </select>
          <ChevronDown size={13} color={C.textSecondary} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
      </div>
      <ActiveChips chips={getActiveSearchChips(filters)} onRemove={onRemoveChip} />
    </div>
  );
}

export function MobileSummaryBar({ count, isLoading, hasError, onFilter }: { count: number; isLoading: boolean; hasError: boolean; onFilter: () => void }) {
  return (
    <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 52, zIndex: 90 }}>
      <span style={{ fontFamily: font, fontSize: 15, fontWeight: 700, color: C.textPrimary, flex: 1 }}>{isLoading ? "Đang tìm…" : hasError ? "Không tải được" : `${count} phòng`}</span>
      <button type="button" onClick={onFilter} data-testid="search-mobile-filter-trigger" style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", border: `1.5px solid ${C.primary}`, borderRadius: 10, background: "transparent", cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 600, color: C.primary, minHeight: 44 }}><SlidersHorizontal size={14} />Lọc</button>
    </div>
  );
}

export function MobileActiveChips({ filters, onRemove }: { filters: SearchFilters; onRemove: (chip: string) => void }) {
  const chips = getActiveSearchChips(filters);
  if (chips.length === 0) return null;
  return (
    <div style={{ overflowX: "auto", padding: "10px 16px", display: "flex", gap: 8, borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
      {chips.map((chip) => <div key={chip} style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 8px 0 12px", minHeight: 44, background: C.caramelSoft, border: `1px solid ${C.border}`, borderRadius: 999, fontFamily: font, fontSize: 13, color: C.textPrimary, whiteSpace: "nowrap" }}>{chip}<button type="button" aria-label={`Bỏ bộ lọc ${chip}`} onClick={() => onRemove(chip)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}><X size={12} color={C.textSecondary} /></button></div>)}
    </div>
  );
}

export function MobileFilterSheet({ open, filters, onChange, onApply, onClose, onClear }: { open: boolean; filters: SearchFilters; onChange: (filters: SearchFilters) => void; onApply: () => void; onClose: () => void; onClear: () => void }) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);
  if (!open) return null;
  const toggleAmenity = (amenity: string) => onChange({ ...filters, amenities: filters.amenities.includes(amenity) ? filters.amenities.filter((item) => item !== amenity) : [...filters.amenities, amenity] });
  const chipButton = (label: string, active: boolean, onClick: () => void) => <button type="button" key={label} onClick={onClick} style={{ padding: "10px 18px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? C.primary : C.border}`, background: active ? C.primary : "transparent", color: active ? C.white : C.textSecondary, fontFamily: font, fontSize: 14, minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6 }}>{active && <Check size={14} />}{label}</button>;
  const sections = [
    { title: "Khoảng giá", content: PRICE_OPTIONS.map((price) => chipButton(price, filters.priceLabel === price, () => onChange({ ...filters, priceLabel: filters.priceLabel === price ? "" : price }))) },
    { title: "Loại hình", content: TYPE_OPTIONS.map((type) => chipButton(type, filters.type === type, () => onChange({ ...filters, type }))) },
    { title: "Diện tích", content: AREA_OPTIONS.map((area) => chipButton(area, filters.area === area, () => onChange({ ...filters, area: filters.area === area ? "" : area }))) },
    { title: "Tiện ích", content: AMENITY_OPTIONS.map((amenity) => chipButton(amenity, filters.amenities.includes(amenity), () => toggleAmenity(amenity))) },
  ];
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(30,18,10,0.45)", zIndex: 200, backdropFilter: "blur(2px)" }} />
      <div role="dialog" aria-modal="true" aria-label="Bộ lọc tìm phòng" data-testid="search-mobile-filter-sheet" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 201, background: C.white, borderRadius: "20px 20px 0 0", height: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(30,18,10,0.2)" }}>
        <div style={{ width: 40, height: 4, background: C.border, borderRadius: 999, margin: "12px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 12px", borderBottom: `1px solid ${C.border}` }}><span style={{ fontFamily: font, fontSize: 17, fontWeight: 700, color: C.textPrimary }}>Bộ lọc</span><button type="button" aria-label="Đóng bộ lọc" data-testid="search-mobile-filter-close" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, display: "flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44 }}><X size={20} color={C.textSecondary} /></button></div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          <div style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}><p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase" }}>Khu vực</p><AreaSelect value={{ provinceCode: filters.provinceCode, wardCode: filters.wardCode }} onChange={(area) => onChange({ ...filters, provinceCode: area.provinceCode, wardCode: area.wardCode })} allowAllProvinces allowAllWards labels={false} testIdPrefix="search-area-mobile" /></div>
          {sections.map((section) => <div key={section.title} style={{ padding: "18px 0", borderBottom: `1px solid ${C.border}` }}><p style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary, margin: "0 0 12px", textTransform: "uppercase" }}>{section.title}</p><div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>{section.content}</div></div>)}
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px 20px", display: "flex", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1 }}><SearchButton variant="outline" label="Xóa lọc" fullWidth size="lg" onClick={() => { onClear(); onClose(); }} /></div>
          <div style={{ flex: 2 }}><SearchButton label="Áp dụng" fullWidth size="lg" onClick={() => { onApply(); onClose(); }} /></div>
        </div>
      </div>
    </>
  );
}
