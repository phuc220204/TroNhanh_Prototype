import { C, font, radius } from "../../../../shared/theme";
import { formatDate, formatVnd } from "../../../../shared/utils/format";
import { computeRentAmount, computeRentProration, formatProration } from "../../../services/invoice-calc";
import { SectionCard } from "./SectionCard";

const dateInput: React.CSSProperties = {
  width: "100%", padding: "9px 12px", fontFamily: font, fontSize: 14, color: C.textPrimary,
  border: `1px solid ${C.border}`, borderRadius: radius.sm, outline: "none", boxSizing: "border-box", background: C.white,
};
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontFamily: font, fontSize: 12.5, fontWeight: 700, color: C.textPrimary };

/** Tiền phòng theo khoảng ngày: tháng đủ + ngày lẻ/30 (server tính lại y hệt). */
export function RentSection({ rentPrice, contractStart, billingFrom, billingTo, onChangeFrom, onChangeTo }: {
  rentPrice: number;
  contractStart: string;
  billingFrom: string;
  billingTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
}) {
  const proration = computeRentProration(billingFrom, billingTo);
  const amount = computeRentAmount(rentPrice, billingFrom, billingTo);
  const isRangeInvalid = !billingFrom || !billingTo || billingFrom > billingTo;

  return (
    <SectionCard title="Tiền phòng" subtitle={`Ngày vào ở: ${formatDate(contractStart)} · Giá theo hợp đồng: ${formatVnd(rentPrice)}/tháng. Tháng lẻ tính theo ngày (giá ÷ 30).`} testId="invoice-rent-section">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        <label style={labelStyle}>
          Từ ngày
          <input type="date" value={billingFrom} onChange={(e) => onChangeFrom(e.target.value)} style={dateInput} data-testid="invoice-billing-from" />
        </label>
        <label style={labelStyle}>
          Đến ngày
          <input type="date" value={billingTo} min={billingFrom} onChange={(e) => onChangeTo(e.target.value)} style={{ ...dateInput, borderColor: isRangeInvalid ? C.error : C.border }} data-testid="invoice-billing-to" />
        </label>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: C.bg, borderRadius: radius.sm, padding: "10px 12px", fontFamily: font }}>
        <span style={{ fontSize: 13, color: C.textSecondary }}>
          {isRangeInvalid ? "Khoảng ngày không hợp lệ" : <><strong style={{ color: C.warning }}>{formatProration(proration)}</strong> × {formatVnd(rentPrice)}</>}
        </span>
        <strong data-testid="invoice-rent-amount" style={{ fontSize: 16, color: C.textPrimary }}>{formatVnd(isRangeInvalid ? 0 : amount)}</strong>
      </div>
    </SectionCard>
  );
}
