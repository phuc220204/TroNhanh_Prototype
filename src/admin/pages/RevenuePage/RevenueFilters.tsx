import type { CSSProperties } from "react";
import { AppSelect, Card, type SelectOption } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import {
  ORDER_STATUS_META,
  REVENUE_KIND_META,
  REVENUE_KINDS,
  type OrderStatus,
  type RevenueKind,
} from "../../../shared/utils/statusMaps";
import type { RevenueGranularity } from "../../services/admin-revenue-service";
import { getRevenuePresets, type RevenuePreset } from "./revenue-dates";

export interface RevenueFilterState {
  from: string;
  to: string;
  granularity: RevenueGranularity;
  kind: RevenueKind | null;
  status: OrderStatus | null;
  isPaidOnly: boolean;
}

interface RevenueFiltersProps {
  value: RevenueFilterState;
  onChange: (next: RevenueFilterState) => void;
  /** Khoảng quá dài cho "theo ngày" ⇒ khóa nút, biểu đồ tự chuyển theo tháng. */
  isDayDisabled: boolean;
  isMobile: boolean;
}

const ALL = "all";

const KIND_OPTIONS: SelectOption[] = [
  { label: "Tất cả loại", value: ALL },
  ...REVENUE_KINDS.map((kind) => ({ label: REVENUE_KIND_META[kind].label, value: kind })),
];

const STATUS_OPTIONS: SelectOption[] = [
  { label: "Tất cả trạng thái", value: ALL },
  ...(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((status) => ({
    label: ORDER_STATUS_META[status].label,
    value: status,
  })),
];

const labelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: space[1],
  fontFamily: font,
  fontSize: 12,
  fontWeight: 700,
  color: C.textSecondary,
};

const dateInputStyle: CSSProperties = {
  fontFamily: font,
  fontSize: 14,
  color: C.textPrimary,
  padding: `${space[2]}px ${space[3]}px`,
  minHeight: 42,
  background: C.white,
  border: `1.5px solid ${C.border}`,
  borderRadius: radius.md,
  boxSizing: "border-box",
  width: "100%",
};

function pillStyle(isActive: boolean, isDisabled = false): CSSProperties {
  return {
    fontFamily: font,
    fontSize: 13,
    fontWeight: 700,
    color: isActive ? C.white : C.textSecondary,
    background: isActive ? C.primary : C.white,
    border: `1px solid ${isActive ? C.primary : C.border}`,
    borderRadius: radius.pill,
    padding: `${space[2]}px ${space[4]}px`,
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.5 : 1,
  };
}

export function RevenueFilters({ value, onChange, isDayDisabled, isMobile }: RevenueFiltersProps) {
  const presets = getRevenuePresets();
  const isPresetActive = (preset: RevenuePreset) => preset.from === value.from && preset.to === value.to;

  return (
    <Card padding={space[5]} data-testid="revenue-filters">
      <div style={{ display: "flex", flexDirection: "column", gap: space[4] }}>
        <div role="group" aria-label="Khoảng thời gian nhanh" style={{ display: "flex", gap: space[2], flexWrap: "wrap" }}>
          {presets.map((preset) => {
            const isActive = isPresetActive(preset);
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={isActive}
                data-testid={`revenue-filter-preset-${preset.id}`}
                onClick={() => onChange({ ...value, from: preset.from, to: preset.to, granularity: preset.granularity })}
                style={pillStyle(isActive)}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: space[3] }}>
          <label style={labelStyle}>
            Từ ngày
            <input
              type="date"
              value={value.from}
              max={value.to || undefined}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
              data-testid="revenue-filter-from"
              style={dateInputStyle}
            />
          </label>
          <label style={labelStyle}>
            Đến ngày
            <input
              type="date"
              value={value.to}
              min={value.from || undefined}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
              data-testid="revenue-filter-to"
              style={dateInputStyle}
            />
          </label>
          <div style={labelStyle}>
            Loại giao dịch
            <AppSelect
              value={value.kind ?? ALL}
              options={KIND_OPTIONS}
              fontSize={14}
              ariaLabel="Lọc theo loại giao dịch"
              data-testid="revenue-filter-kind"
              onChange={(next) => onChange({ ...value, kind: next === ALL ? null : (next as RevenueKind) })}
            />
          </div>
          <div style={labelStyle}>
            Trạng thái đơn
            <AppSelect
              value={value.status ?? ALL}
              options={STATUS_OPTIONS}
              fontSize={14}
              ariaLabel="Lọc theo trạng thái đơn"
              data-testid="revenue-filter-status"
              onChange={(next) => onChange({ ...value, status: next === ALL ? null : (next as OrderStatus) })}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: space[3], flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: space[2], fontFamily: font, fontSize: 13, color: C.textPrimary, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={value.isPaidOnly}
              onChange={(e) => onChange({ ...value, isPaidOnly: e.target.checked })}
              data-testid="revenue-filter-paid-only"
              style={{ width: 16, height: 16, accentColor: C.primary }}
            />
            Chỉ hiện đơn đã nhận tiền
          </label>

          <div role="group" aria-label="Gom biểu đồ theo" style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <span style={{ fontFamily: font, fontSize: 12, fontWeight: 700, color: C.textSecondary }}>Biểu đồ theo</span>
            <button
              type="button"
              aria-pressed={value.granularity === "day" && !isDayDisabled}
              disabled={isDayDisabled}
              title={isDayDisabled ? "Khoảng thời gian quá 1 năm — chỉ xem được theo tháng" : undefined}
              data-testid="revenue-filter-granularity-day"
              onClick={() => onChange({ ...value, granularity: "day" })}
              style={pillStyle(value.granularity === "day" && !isDayDisabled, isDayDisabled)}
            >
              Ngày
            </button>
            <button
              type="button"
              aria-pressed={value.granularity === "month" || isDayDisabled}
              data-testid="revenue-filter-granularity-month"
              onClick={() => onChange({ ...value, granularity: "month" })}
              style={pillStyle(value.granularity === "month" || isDayDisabled)}
            >
              Tháng
            </button>
          </div>
        </div>
        <p style={{ margin: 0, fontFamily: font, fontSize: 11.5, color: C.textSecondary }}>
          Loại và trạng thái chỉ lọc danh sách giao dịch. Thẻ tổng hợp và biểu đồ luôn tính mọi đơn đã nhận tiền trong khoảng thời gian.
        </p>
      </div>
    </Card>
  );
}
