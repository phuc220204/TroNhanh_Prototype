import { C, font, radius } from "../../../../shared/theme";
import { formatDate, formatPeriod, formatVnd } from "../../../../shared/utils/format";
import { FEE_CATEGORY_META } from "../../../../shared/utils/statusMaps";
import { FEE_CATEGORY_ORDER, type CategoryTotals } from "../../../services/invoice-calc";

/** Khung "Tạm tính" — tổng theo từng nhóm khoản thu + thông tin phát hành. */
export function SummaryPanel({ totals, period, billingFrom, billingTo, dueDate }: {
  totals: CategoryTotals;
  period: string;
  billingFrom: string;
  billingTo: string;
  dueDate: string;
}) {
  const row = (label: string, value: string, opts: { strong?: boolean; color?: string; hint?: string; testId?: string } = {}) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "7px 0", borderBottom: `1px dashed ${C.border}` }}>
      <span style={{ fontSize: 13, color: C.textSecondary }}>
        {label}
        {opts.hint && <span style={{ display: "block", fontSize: 11, color: C.textSecondary }}>{opts.hint}</span>}
      </span>
      <span data-testid={opts.testId} style={{ fontSize: opts.strong ? 14 : 13.5, fontWeight: 700, color: opts.color ?? C.textPrimary, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );

  return (
    <aside data-testid="invoice-summary" style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: font }}>
      <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, background: C.white }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: C.textSecondary, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cập nhật theo dữ liệu nhập</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary, margin: "2px 0 6px" }}>Tạm tính hóa đơn</div>
        {FEE_CATEGORY_ORDER.map((category) => (
          <div key={category}>
            {row(FEE_CATEGORY_META[category].label, formatVnd(totals[category]), {
              hint: category === "PassThrough" ? "Không tính vào doanh thu" : undefined,
              color: category === "Adjustment" && totals.Adjustment < 0 ? C.success : undefined,
              testId: `invoice-summary-${category}`,
            })}
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.textPrimary }}>TỔNG CẦN THU</span>
          <span data-testid="invoice-total" style={{ fontSize: 22, fontWeight: 800, color: totals.total < 0 ? C.error : C.primary }}>{formatVnd(totals.total)}</span>
        </div>
        <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 4 }}>
          Doanh thu của bạn: <strong style={{ color: C.textPrimary }}>{formatVnd(totals.revenue)}</strong>
          {totals.PassThrough > 0 && <> · Thu hộ: <strong style={{ color: C.textPrimary }}>{formatVnd(totals.PassThrough)}</strong></>}
        </div>
      </div>

      <div style={{ border: `1px solid ${C.border}`, borderRadius: radius.md, padding: 14, background: C.white }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary, marginBottom: 4 }}>Thông tin phát hành</div>
        {row("Kỳ hóa đơn", formatPeriod(period))}
        {row("Tính tiền", billingFrom && billingTo ? `${formatDate(billingFrom)} – ${formatDate(billingTo)}` : "—")}
        {row("Hạn thanh toán", dueDate ? formatDate(dueDate) : "—")}
      </div>
    </aside>
  );
}
