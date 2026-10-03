import { cleanVND, parseMetadataFromDescription } from "./listingMetadata";

const COST_NOT_SET = "Chưa cập nhật";

function formatMoneyValue(value: unknown): string | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value.toLocaleString("vi-VN") : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  // Không rút chữ số khỏi câu điều kiện như "1 tháng tiền phòng".
  if (!/^\s*[\d.,\s]+(?:đ|vnd)?\s*$/i.test(value)) return null;
  const cleaned = cleanVND(value);
  if (!cleaned || /[-+]/.test(value)) return null;
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount >= 0 ? amount.toLocaleString("vi-VN") : null;
}

/** Dùng chung cho sidebar, bảng chi phí và dữ liệu tin cũ. */
export function getListingCosts(listing: any) {
  const { metadata } = parseMetadataFromDescription(listing.description || "");
  const savedCosts = listing.metadata && typeof listing.metadata === "object"
    && !Array.isArray(listing.metadata) && listing.metadata.costs
    && typeof listing.metadata.costs === "object"
    ? listing.metadata.costs
    : {};
  const legacy = { ...(metadata.costs || {}), ...savedCosts };
  const electric = formatMoneyValue(listing.electricity_price) ?? formatMoneyValue(legacy.electric);
  const water = formatMoneyValue(listing.water_price) ?? formatMoneyValue(legacy.water);
  const service = formatMoneyValue(listing.service_price) ?? formatMoneyValue(legacy.service);
  const canonicalDeposit = formatMoneyValue(listing.deposit);
  const legacyDeposit = typeof legacy.deposit === "string" ? legacy.deposit.trim() : "";
  const numericLegacyDeposit = formatMoneyValue(legacy.deposit);
  const waterUnit = listing.water_price != null
    ? listing.water_unit
    : legacy.waterUnit || listing.water_unit;

  return {
    electric: electric ? `${electric} đ/kWh` : COST_NOT_SET,
    water: water ? `${water} ${waterUnit === "cubic" ? "đ/m³" : "đ/người"}` : COST_NOT_SET,
    service: service ? `${service} đ/tháng` : COST_NOT_SET,
    deposit: canonicalDeposit
      ? `${canonicalDeposit} đ`
      : numericLegacyDeposit
        ? `${numericLegacyDeposit} đ`
        : legacyDeposit || COST_NOT_SET,
    other: legacy.other || "",
  };
}
