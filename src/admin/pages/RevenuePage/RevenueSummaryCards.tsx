import { Card } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { formatVnd } from "../../../shared/utils/format";
import { REVENUE_KIND_META, REVENUE_KINDS, type RevenueKind } from "../../../shared/utils/statusMaps";
import type { RevenueSummaryRow } from "../../services/admin-revenue-service";

interface RevenueSummaryCardsProps {
  rows: RevenueSummaryRow[];
  columns: string;
}

interface Totals {
  amount: number;
  orderCount: number;
}

const numberFormat = new Intl.NumberFormat("vi-VN");

export function RevenueSummaryCards({ rows, columns }: RevenueSummaryCardsProps) {
  const byKind = new Map<RevenueKind, Totals>(REVENUE_KINDS.map((kind) => [kind, { amount: 0, orderCount: 0 }]));
  for (const row of rows) {
    const totals = byKind.get(row.kind)!;
    totals.amount += row.amount;
    totals.orderCount += row.orderCount;
  }
  const grand = [...byKind.values()].reduce(
    (sum, totals) => ({ amount: sum.amount + totals.amount, orderCount: sum.orderCount + totals.orderCount }),
    { amount: 0, orderCount: 0 },
  );

  const cards = [
    { key: "total", label: "Tổng doanh thu", color: C.textPrimary, totals: grand },
    ...REVENUE_KINDS.map((kind) => ({
      key: kind,
      label: REVENUE_KIND_META[kind].label,
      color: REVENUE_KIND_META[kind].color,
      totals: byKind.get(kind)!,
    })),
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: columns, gap: space[4] }}>
      {cards.map(({ key, label, color, totals }) => (
        <Card key={key} padding={space[5]} data-testid={`revenue-card-${key}`} style={{ height: "100%", boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", gap: space[2] }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: radius.pill, background: color, flexShrink: 0 }} />
            <span style={{ fontFamily: font, fontSize: 12.5, fontWeight: 600, color: C.textSecondary }}>{label}</span>
          </div>
          <div style={{ marginTop: space[3], fontFamily: font, fontSize: 24, lineHeight: 1.15, fontWeight: 800, color: C.textPrimary, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
            {formatVnd(totals.amount)}
          </div>
          <div style={{ marginTop: space[2], fontFamily: font, fontSize: 12, color: C.textSecondary }}>
            {numberFormat.format(totals.orderCount)} đơn đã nhận tiền
          </div>
        </Card>
      ))}
    </div>
  );
}
