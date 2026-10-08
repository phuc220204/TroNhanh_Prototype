import { Search, SlidersHorizontal, X } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { AppSelect } from "../../../shared/components/common";
import { LISTING_META } from "../../../shared/utils/statusMaps";

export const SORT_OPTIONS = [
  { label: "Mới nhất", value: "newest" },
  { label: "Cũ nhất", value: "oldest" },
  { label: "Giá thấp đến cao", value: "price-asc" },
  { label: "Giá cao đến thấp", value: "price-desc" },
];

/** Đủ 7 trạng thái BR-001 — nhãn lấy từ LISTING_META, không tự đặt. */
const STATUS_TABS = [
  { value: "Active", label: LISTING_META.active.label },
  { value: "PendingApproval", label: LISTING_META.pendingApproval.label },
  { value: "Rejected", label: LISTING_META.rejected.label },
  { value: "Hidden", label: LISTING_META.hidden.label },
  { value: "Expired", label: LISTING_META.expired.label },
  { value: "Rented", label: LISTING_META.rented.label },
  { value: "Draft", label: LISTING_META.draft.label },
];

export interface AdvancedFilters {
  district: string;
  priceMin: string;
  priceMax: string;
  areaMin: string;
  areaMax: string;
}

export const EMPTY_ADVANCED_FILTERS: AdvancedFilters = { district: "", priceMin: "", priceMax: "", areaMin: "", areaMax: "" };

export function countActiveFilters(filters: AdvancedFilters): number {
  return Object.values(filters).filter(Boolean).length;
}

const inputStyle: React.CSSProperties = {
  fontFamily: font, fontSize: 13.5, color: C.textPrimary, background: C.white,
  border: `1.5px solid ${C.border}`, borderRadius: radius.md, outline: "none",
  padding: "9px 12px", minWidth: 0, width: "100%", boxSizing: "border-box",
};

const fieldLabel: React.CSSProperties = { fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary };

function RangeInputs({ label, min, max, onMin, onMax }: { label: string; min: string; max: string; onMin: (v: string) => void; onMax: (v: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={fieldLabel}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="number" inputMode="numeric" value={min} onChange={(e) => onMin(e.target.value)} placeholder="Từ" aria-label={`${label} tối thiểu`} style={inputStyle} />
        <span style={{ color: C.textSecondary }}>–</span>
        <input type="number" inputMode="numeric" value={max} onChange={(e) => onMax(e.target.value)} placeholder="Đến" aria-label={`${label} tối đa`} style={inputStyle} />
      </div>
    </div>
  );
}

interface ListingsToolbarProps {
  isMobile: boolean;
  search: string;
  onSearch: (value: string) => void;
  sort: string;
  onSort: (value: string) => void;
  status: string;
  onStatus: (value: string) => void;
  statusCounts: Record<string, number>;
  totalCount: number;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  advanced: AdvancedFilters;
  onAdvanced: (next: AdvancedFilters) => void;
  /** Khu vực có thật trong tin của người bán — không dùng danh sách quận cứng. */
  districtOptions: string[];
  onReset: () => void;
}

export function ListingsToolbar(props: ListingsToolbarProps) {
  const { isMobile, search, onSearch, sort, onSort, status, onStatus, statusCounts, totalCount, showAdvanced, onToggleAdvanced, advanced, onAdvanced, districtOptions, onReset } = props;
  const activeFilters = countActiveFilters(advanced);
  const set = (patch: Partial<AdvancedFilters>) => onAdvanced({ ...advanced, ...patch });
  // Tab rỗng không giúp gì — chỉ hiện trạng thái đang có tin (và tab đang chọn).
  const tabs = [
    { value: "all", label: "Tất cả", count: totalCount },
    ...STATUS_TABS
      .map((tab) => ({ ...tab, count: statusCounts[tab.value] ?? 0 }))
      .filter((tab) => tab.count > 0 || tab.value === status),
  ];

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: isMobile ? 14 : 16, display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <Search size={16} color={C.textSecondary} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, khu vực, mã tin…"
            aria-label="Tìm tin đăng"
            data-testid="my-listings-search"
            style={{ ...inputStyle, padding: "10px 36px 10px 38px" }}
          />
          {search && (
            <button type="button" aria-label="Xóa từ khóa" onClick={() => onSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}>
              <X size={15} color={C.textSecondary} />
            </button>
          )}
        </div>

        <div style={{ ...inputStyle, width: isMobile ? "auto" : 190, flex: isMobile ? "1 1 0" : "0 0 190px", padding: "9px 12px" }}>
          <AppSelect value={sort} options={SORT_OPTIONS} onChange={onSort} ariaLabel="Sắp xếp tin đăng" fontSize={13.5} data-testid="my-listings-sort" />
        </div>

        <button
          type="button"
          onClick={onToggleAdvanced}
          aria-expanded={showAdvanced}
          data-testid="my-listings-filter-toggle"
          style={{
            display: "inline-flex", alignItems: "center", gap: 7, flexShrink: 0, padding: "10px 14px",
            background: showAdvanced ? C.cream : C.white, color: showAdvanced || activeFilters ? C.primary : C.textSecondary,
            border: `1.5px solid ${showAdvanced || activeFilters ? C.primary : C.border}`, borderRadius: radius.md,
            fontFamily: font, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
          }}
        >
          <SlidersHorizontal size={14} />
          Bộ lọc{activeFilters > 0 ? ` (${activeFilters})` : ""}
        </button>
      </div>

      {showAdvanced && (
        <div data-testid="my-listings-advanced" style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={fieldLabel}>Khu vực</span>
              <div style={{ ...inputStyle, padding: "9px 12px" }}>
                <AppSelect
                  value={advanced.district}
                  options={[{ label: "Tất cả khu vực", value: "" }, ...districtOptions.map((d) => ({ label: d, value: d }))]}
                  onChange={(district) => set({ district })}
                  ariaLabel="Lọc theo khu vực"
                  fontSize={13.5}
                />
              </div>
            </div>
            <RangeInputs label="Giá thuê (đ)" min={advanced.priceMin} max={advanced.priceMax} onMin={(priceMin) => set({ priceMin })} onMax={(priceMax) => set({ priceMax })} />
            <RangeInputs label="Diện tích (m²)" min={advanced.areaMin} max={advanced.areaMax} onMin={(areaMin) => set({ areaMin })} onMax={(areaMax) => set({ areaMax })} />
          </div>
          {activeFilters > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={onReset} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: font, fontSize: 13, fontWeight: 700, color: C.primary }}>
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>
      )}

      <div role="tablist" aria-label="Lọc theo trạng thái" style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        {tabs.map((tab) => {
          const isActive = status === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onStatus(tab.value)}
              data-testid={`my-listings-tab-${tab.value}`}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, whiteSpace: "nowrap",
                fontFamily: font, fontSize: 13, fontWeight: isActive ? 700 : 600,
                color: isActive ? C.white : C.textSecondary, background: isActive ? C.primary : C.white,
                border: `1.5px solid ${isActive ? C.primary : C.border}`, borderRadius: radius.pill,
                padding: "6px 12px", cursor: "pointer",
              }}
            >
              {tab.label}
              <span style={{ fontSize: 11.5, fontWeight: 700, minWidth: 18, padding: "1px 6px", borderRadius: radius.pill, background: isActive ? C.primaryHover : C.cream, color: isActive ? C.white : C.textSecondary }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
