/**
 * Dựng bản nháp hóa đơn từ dữ liệu THẬT — hàm thuần, có unit test
 * (tests/unit/invoice-draft.test.mjs).
 *
 * Nguồn:
 *  - Tiền nhà + contract_id: hợp đồng `Active` của phòng.
 *  - Điện / nước: `utility_readings` của đúng kỳ, amount = (mới − cũ) × đơn giá snapshot.
 *  - Phí dịch vụ: giá đang áp của phòng (riêng phòng, fallback giá khu).
 *
 * ⚠️ KHÔNG bịa số khi thiếu dữ liệu (trước đây prefill cứng 150.000/100.000).
 * Thiếu thì trả `null` / `hasReading: false` để UI nói rõ "Chưa ghi chỉ số kỳ này"
 * hoặc "Chưa cấu hình".
 */
import { formatPeriod, formatVnd } from "../../shared/utils/format.ts";

export type UtilityType = "Electricity" | "Water";

export interface DraftReading {
  type: string;
  period: string;
  previous_reading: number | string;
  current_reading: number | string;
  unit_price: number | string;
  deleted_at?: string | null;
}

export interface DraftContract {
  id: string;
  rent_price: number | string;
}

export interface InvoiceDraftSources {
  /** Hợp đồng Active của phòng; `null` = phòng chưa có hợp đồng đang hiệu lực. */
  contract: DraftContract | null;
  /** Chỉ số của phòng (đã lọc theo kỳ hoặc chưa — hàm tự lọc theo `period`). */
  readings: DraftReading[];
  /** Phí dịch vụ đang áp (phòng → khu); `null` = chưa cấu hình. */
  serviceFee: number | null;
}

export interface UtilityLine {
  type: UtilityType;
  /** false = kỳ này chưa ghi chỉ số. */
  hasReading: boolean;
  previousReading: number;
  currentReading: number;
  consumption: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceDraft {
  period: string;
  contractId: string | null;
  /** Tiền nhà theo hợp đồng; `null` khi chưa có hợp đồng Active. */
  rent: number | null;
  electricity: UtilityLine;
  water: UtilityLine;
  serviceFee: number | null;
}

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** Dòng điện/nước của một kỳ. Không có chỉ số → amount 0, `hasReading: false`. */
export function computeUtilityLine(readings: DraftReading[], type: UtilityType, period: string): UtilityLine {
  const reading = readings.find((r) => r.type === type && r.period === period && !r.deleted_at);
  if (!reading) {
    return { type, hasReading: false, previousReading: 0, currentReading: 0, consumption: 0, unitPrice: 0, amount: 0 };
  }
  const previousReading = toNumber(reading.previous_reading);
  const currentReading = toNumber(reading.current_reading);
  // Server đã chặn current < previous; vẫn kẹp ≥ 0 để không bao giờ ra tiền âm.
  const consumption = Math.max(0, currentReading - previousReading);
  const unitPrice = toNumber(reading.unit_price);
  return {
    type,
    hasReading: true,
    previousReading,
    currentReading,
    consumption,
    unitPrice,
    amount: Math.round(consumption * unitPrice),
  };
}

export function computeUtilityAmount(readings: DraftReading[], type: UtilityType, period: string): number {
  return computeUtilityLine(readings, type, period).amount;
}

export function buildInvoiceDraft(sources: InvoiceDraftSources, period: string): InvoiceDraft {
  const serviceFee = sources.serviceFee === null || sources.serviceFee === undefined ? null : toNumber(sources.serviceFee);
  return {
    period,
    contractId: sources.contract?.id ?? null,
    rent: sources.contract ? toNumber(sources.contract.rent_price) : null,
    electricity: computeUtilityLine(sources.readings, "Electricity", period),
    water: computeUtilityLine(sources.readings, "Water", period),
    serviceFee,
  };
}

const UNIT_LABEL: Record<UtilityType, string> = { Electricity: "kWh", Water: "m³" };

/** "35 kWh × 3.500đ (chỉ số 120 → 155)". Chưa có chỉ số → "". */
export function formatUtilityBreakdown(line: UtilityLine): string {
  if (!line.hasReading) return "";
  return `${line.consumption.toLocaleString("vi-VN")} ${UNIT_LABEL[line.type]} × ${formatVnd(line.unitPrice)} (chỉ số ${line.previousReading.toLocaleString("vi-VN")} → ${line.currentReading.toLocaleString("vi-VN")})`;
}

export interface DraftInvoiceItem {
  type: "Rent" | "Electricity" | "Water" | "Service";
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface FinalAmounts {
  rent: number;
  electricity: number;
  water: number;
  service: number;
}

/** "tháng 10/2026" — dùng trong mô tả dòng hóa đơn. */
function periodLabel(period: string): string {
  const label = formatPeriod(period);
  return label.startsWith("Tháng ") ? `tháng ${label.slice("Tháng ".length)}` : label;
}

/**
 * Dòng hóa đơn gửi lên RPC. Số tiền là số chủ trọ đã xác nhận (có thể đã sửa tay).
 * Điện/nước giữ quantity × đơn giá khi số tiền còn khớp với chỉ số; sửa tay thì
 * ghi 1 × số tiền để `quantity × unit_price = amount` luôn đúng. Dòng 0đ bị bỏ.
 */
export function buildInvoiceItems(draft: InvoiceDraft, amounts: FinalAmounts): DraftInvoiceItem[] {
  const label = periodLabel(draft.period);
  const utilityItem = (line: UtilityLine, amount: number, name: string): DraftInvoiceItem => {
    const matchesReading = line.hasReading && line.amount === amount && line.consumption > 0;
    return {
      type: line.type,
      description: `${name} ${label}`,
      quantity: matchesReading ? line.consumption : 1,
      unit_price: matchesReading ? line.unitPrice : amount,
      amount,
    };
  };
  const items: DraftInvoiceItem[] = [
    { type: "Rent", description: `Tiền nhà ${label}`, quantity: 1, unit_price: amounts.rent, amount: amounts.rent },
    utilityItem(draft.electricity, amounts.electricity, "Tiền điện"),
    utilityItem(draft.water, amounts.water, "Tiền nước"),
    { type: "Service", description: `Phí dịch vụ ${label}`, quantity: 1, unit_price: amounts.service, amount: amounts.service },
  ];
  return items.filter((item) => item.amount > 0);
}
