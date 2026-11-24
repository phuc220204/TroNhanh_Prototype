/**
 * Hóa đơn v2 (T41) — hàm thuần, có unit test (tests/unit/invoice-calc.test.mjs).
 *
 * ⚠️ Đây CHỈ là bản xem trước ở client. Con số chính thức do RPC
 * `create_invoice_v2` tính lại ở server bằng ĐÚNG công thức này — sửa một bên
 * thì phải sửa bên kia (migration `20261124140000_invoice_v2.sql`).
 */

export type InvoiceFeeCategory = "Rent" | "Service" | "PassThrough" | "Adjustment";

/** Thứ tự nhóm trên hóa đơn: tiền phòng → phí dịch vụ → thu hộ → điều chỉnh. */
export const FEE_CATEGORY_ORDER: InvoiceFeeCategory[] = ["Rent", "Service", "PassThrough", "Adjustment"];

const DAY_MS = 86_400_000;

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Cộng tháng kiểu Postgres: 31/01 + 1 tháng = 28/02 (kẹp về ngày cuối tháng). */
export function addMonthsClamped(iso: string, months: number): string {
  const date = parseIsoDate(iso);
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return toIsoDate(target);
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseIsoDate(toIso).getTime() - parseIsoDate(fromIso).getTime()) / DAY_MS);
}

export interface RentProration {
  months: number;
  days: number;
  /** months + days/30, làm tròn 4 chữ số như cột `quantity`. */
  quantity: number;
}

/**
 * Số tháng đủ + số ngày lẻ trên khoảng [from, to] — TÍNH CẢ HAI ĐẦU.
 * 01/11–30/11 = 1 tháng 0 ngày · 31/12–31/01 = 1 tháng 1 ngày.
 */
export function computeRentProration(fromIso: string, toIso: string): RentProration {
  if (!fromIso || !toIso || fromIso > toIso) return { months: 0, days: 0, quantity: 0 };
  const endExclusive = toIsoDate(new Date(parseIsoDate(toIso).getTime() + DAY_MS));
  let months = 0;
  while (addMonthsClamped(fromIso, months + 1) <= endExclusive) months += 1;
  const days = daysBetween(addMonthsClamped(fromIso, months), endExclusive);
  return { months, days, quantity: Math.round((months + days / 30) * 10_000) / 10_000 };
}

/** Tiền phòng = giá × tháng đủ + giá × ngày lẻ / 30, làm tròn đồng. */
export function computeRentAmount(rentPrice: number, fromIso: string, toIso: string): number {
  const { months, days } = computeRentProration(fromIso, toIso);
  return Math.round(rentPrice * months + (rentPrice * days) / 30);
}

/** "1 tháng 3 ngày" · "1 tháng" · "12 ngày". */
export function formatProration({ months, days }: Pick<RentProration, "months" | "days">): string {
  const parts = [months > 0 ? `${months} tháng` : "", days > 0 ? `${days} ngày` : ""].filter(Boolean);
  return parts.join(" ") || "0 ngày";
}

/** Kỳ `YYYY-MM` → khoảng mặc định: ngày đầu → ngày cuối tháng. */
export function defaultBillingRange(period: string): { from: string; to: string } {
  const from = `${period}-01`;
  const to = toIsoDate(new Date(parseIsoDate(addMonthsClamped(from, 1)).getTime() - DAY_MS));
  return { from, to };
}

/** Hóa đơn cũ (trước T41) chưa có `fee_category` ⇒ suy từ `type`, cùng quy ước backfill. */
export function categoryOfItem(item: { fee_category?: string | null; type?: string | null }): InvoiceFeeCategory {
  const category = item.fee_category;
  if (category === "Rent" || category === "Service" || category === "PassThrough" || category === "Adjustment") {
    return category;
  }
  if (item.type === "Rent") return "Rent";
  if (item.type === "Other") return "Adjustment";
  return "Service";
}

export type CategoryTotals = Record<InvoiceFeeCategory, number> & {
  total: number;
  /** Doanh thu của chủ trọ = tiền phòng + phí dịch vụ + điều chỉnh (không gồm thu hộ). */
  revenue: number;
};

export function summarizeByCategory(
  items: { fee_category?: string | null; type?: string | null; amount: number | string }[],
): CategoryTotals {
  const totals: CategoryTotals = { Rent: 0, Service: 0, PassThrough: 0, Adjustment: 0, total: 0, revenue: 0 };
  for (const item of items) {
    const amount = Number(item.amount) || 0;
    totals[categoryOfItem(item)] += amount;
    totals.total += amount;
  }
  totals.revenue = totals.total - totals.PassThrough;
  return totals;
}

/** Gom dòng theo nhóm, giữ thứ tự FEE_CATEGORY_ORDER; nhóm rỗng bị bỏ. */
export function groupItemsByCategory<T extends { fee_category?: string | null; type?: string | null }>(
  items: T[],
): { category: InvoiceFeeCategory; items: T[] }[] {
  return FEE_CATEGORY_ORDER
    .map((category) => ({ category, items: items.filter((item) => categoryOfItem(item) === category) }))
    .filter((group) => group.items.length > 0);
}

// ── Mô tả dòng hóa đơn (dùng chung: form, chi tiết, ảnh) ─────────────────────

export interface DescribableInvoiceItem {
  type?: string | null;
  fee_category?: string | null;
  description?: string | null;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  unit?: string | null;
  meta?: unknown;
}

const LEGACY_TYPE_LABELS: Record<string, string> = {
  Rent: "Tiền phòng",
  Electricity: "Tiền điện",
  Water: "Tiền nước",
  Service: "Phí dịch vụ",
  Other: "Khác",
};

const vnd = (value: number) => `${Math.round(value).toLocaleString("vi-VN")}đ`;
const num = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const dmy = (iso: unknown) => (typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split("-").reverse().join("/") : "");

function readMeta(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : {};
}

/** Tên dòng: tên dịch vụ / lý do điều chỉnh; hóa đơn cũ dùng nhãn theo `type`. */
export function invoiceItemLabel(item: DescribableInvoiceItem): string {
  if (categoryOfItem(item) === "Adjustment") return item.description?.trim() || "Điều chỉnh";
  if (item.type === "Rent") return "Tiền phòng";
  // Hóa đơn v2 lưu tên dịch vụ ở `description`; hóa đơn cũ ghi "Tiền điện tháng 10/2026".
  return item.description?.trim() || LEGACY_TYPE_LABELS[item.type ?? ""] || "Khoản thu";
}

/**
 * Dòng phụ giải thích số tiền:
 *  - tiền phòng: "1 tháng 1 ngày × 3.800.000đ (31/10/2026 – 01/12/2026)"
 *  - đồng hồ:    "Chỉ số 120 → 155 = 35 kWh × 3.500đ"
 *  - còn lại:    "2 Tháng × 120.000đ"
 */
export function invoiceItemDetail(item: DescribableInvoiceItem): string | null {
  const meta = readMeta(item.meta);
  const quantity = Number(item.quantity ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);
  const category = categoryOfItem(item);
  if (category === "Adjustment") return null;

  if (item.type === "Rent" && typeof meta.months === "number" && typeof meta.days === "number") {
    const range = meta.from && meta.to ? ` (${dmy(meta.from)} – ${dmy(meta.to)})` : "";
    return `${formatProration({ months: meta.months, days: meta.days })} × ${vnd(unitPrice)}${range}`;
  }
  if (typeof meta.previous === "number" && typeof meta.current === "number") {
    return `Chỉ số ${num(meta.previous)} → ${num(meta.current)} = ${num(quantity)} ${item.unit ?? ""} × ${vnd(unitPrice)}`.replace(/\s+×/, " ×");
  }
  if (quantity > 0 && unitPrice !== 0 && (quantity !== 1 || item.unit)) {
    return `${num(quantity)} ${item.unit ?? ""} × ${vnd(unitPrice)}`.replace(/\s+×/, " ×");
  }
  return null;
}

/**
 * Hai cột giữa của bản in: "Đơn giá" và "Mức sử dụng".
 *  - tiền phòng: "3.800.000đ/tháng" · "1 tháng 1 ngày (31/10/2026 – 30/11/2026)"
 *  - đồng hồ:    "3.500đ/kWh"       · "35 kWh (242 → 277)"
 *  - còn lại:    "120.000đ/Tháng"   · "2 Tháng"
 *  - điều chỉnh: ""                 · ""
 */
export function invoiceItemColumns(item: DescribableInvoiceItem): { unitPriceText: string; usageText: string } {
  if (categoryOfItem(item) === "Adjustment") return { unitPriceText: "", usageText: "" };
  const meta = readMeta(item.meta);
  const quantity = Number(item.quantity ?? 0);
  const unitPrice = Number(item.unit_price ?? 0);
  const unit = item.unit?.trim() ?? "";

  if (item.type === "Rent") {
    const usage = typeof meta.months === "number" && typeof meta.days === "number"
      ? `${formatProration({ months: meta.months, days: meta.days })}${meta.from && meta.to ? ` (${dmy(meta.from)} – ${dmy(meta.to)})` : ""}`
      : `${num(quantity)} tháng`;
    return { unitPriceText: `${vnd(unitPrice)}/tháng`, usageText: usage };
  }
  const priceText = unit ? `${vnd(unitPrice)}/${unit}` : vnd(unitPrice);
  if (typeof meta.previous === "number" && typeof meta.current === "number") {
    return { unitPriceText: priceText, usageText: `${num(quantity)} ${unit} (${num(meta.previous)} → ${num(meta.current)})`.replace(/\s+\(/, " (") };
  }
  return { unitPriceText: priceText, usageText: `${num(quantity)}${unit ? ` ${unit}` : ""}` };
}

export interface DraftServiceLine {
  serviceId: string;
  name: string;
  unit: string;
  feeCategory: "Service" | "PassThrough";
  meterType: "Electricity" | "Water" | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  reading?: { previousReading: number; currentReading: number } | null;
}

/**
 * Dòng hóa đơn NHÁP (cùng shape `invoice_items`) để "Xem trước" bản in.
 * Chỉ để hiển thị — RPC `create_invoice_v2` tự tính lại bằng cùng công thức.
 */
export function buildDraftInvoiceItems(input: {
  rentPrice: number;
  billingFrom: string;
  billingTo: string;
  services: DraftServiceLine[];
  adjustments: { reason: string; amount: number }[];
}) {
  const proration = computeRentProration(input.billingFrom, input.billingTo);
  const rentAmount = computeRentAmount(input.rentPrice, input.billingFrom, input.billingTo);
  const items: (DescribableInvoiceItem & { amount: number; service_id?: string | null })[] = [];
  if (rentAmount > 0) {
    items.push({
      type: "Rent", fee_category: "Rent", description: "Tiền phòng", unit: "Tháng",
      quantity: proration.quantity, unit_price: input.rentPrice, amount: rentAmount,
      meta: { months: proration.months, days: proration.days, from: input.billingFrom, to: input.billingTo },
    });
  }
  for (const line of input.services) {
    items.push({
      type: line.meterType ?? "Service",
      fee_category: line.feeCategory,
      service_id: line.serviceId,
      description: line.name,
      unit: line.unit,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      amount: line.amount,
      meta: line.reading ? { previous: line.reading.previousReading, current: line.reading.currentReading } : null,
    });
  }
  for (const adjustment of input.adjustments) {
    if (!adjustment.amount) continue;
    items.push({
      type: "Other", fee_category: "Adjustment", description: adjustment.reason.trim() || "Điều chỉnh",
      quantity: 1, unit_price: adjustment.amount, amount: adjustment.amount,
    });
  }
  return items;
}
