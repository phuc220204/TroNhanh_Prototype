import { Badge, Card, Table, type Column } from "../../../shared/components/common";
import { C, font, radius, space } from "../../../shared/theme";
import { formatVnd } from "../../../shared/utils/format";
import { REVENUE_KIND_META } from "../../../shared/utils/statusMaps";
import type { RevenueTransaction } from "../../services/admin-revenue-service";

interface RevenueTransactionsTableProps {
  rows: RevenueTransaction[];
  isMobile: boolean;
}

const COLUMNS: Column<RevenueTransaction>[] = [
  { key: "time", label: "Thời gian", width: 130 },
  { key: "orderCode", label: "Mã đơn", width: 130 },
  { key: "kind", label: "Loại", width: 140 },
  { key: "buyer", label: "Người mua" },
  { key: "item", label: "Sản phẩm" },
  { key: "amount", label: "Số tiền", align: "right", width: 120 },
  { key: "status", label: "Trạng thái", width: 170 },
];

const pad2 = (value: number) => String(value).padStart(2, "0");

/** "dd/mm/yyyy hh:mm" — giờ máy. */
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function TimeCell({ row }: { row: RevenueTransaction }) {
  return (
    <div style={{ fontVariantNumeric: "tabular-nums" }}>
      <div style={{ color: C.textPrimary }}>{formatDateTime(row.paidAt ?? row.createdAt)}</div>
      <div style={{ fontSize: 11.5, color: C.textSecondary }}>{row.paidAt ? "Thanh toán" : "Tạo đơn"}</div>
    </div>
  );
}

function KindLabel({ row }: { row: RevenueTransaction }) {
  const meta = REVENUE_KIND_META[row.kind];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: space[2], fontSize: 13, color: C.textPrimary }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: radius.pill, background: meta.color, flexShrink: 0 }} />
      {meta.label}
    </span>
  );
}

function StatusBadge({ row }: { row: RevenueTransaction }) {
  return <Badge kind="order" status={row.status ?? row.rawStatus} />;
}

export function RevenueTransactionsTable({ rows, isMobile }: RevenueTransactionsTableProps) {
  if (isMobile) {
    return (
      <div data-testid="revenue-table" style={{ display: "flex", flexDirection: "column", gap: space[2] }}>
        {rows.map((row) => (
          <Card key={`${row.kind}-${row.orderCode}`} padding={space[4]} data-testid="revenue-row">
            <div style={{ display: "flex", justifyContent: "space-between", gap: space[3], alignItems: "flex-start", fontFamily: font }}>
              <KindLabel row={row} />
              <strong style={{ fontSize: 15, color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatVnd(row.amount)}</strong>
            </div>
            <p style={{ margin: `${space[2]}px 0 0`, fontFamily: font, fontSize: 13, color: C.textPrimary }}>{row.itemLabel}</p>
            <p style={{ margin: `${space[1]}px 0 0`, fontFamily: font, fontSize: 12, color: C.textSecondary, overflowWrap: "anywhere" }}>
              {row.buyerName || "(chưa đặt tên)"} · {row.buyerEmail || "—"}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: space[2], marginTop: space[3], flexWrap: "wrap", fontFamily: font, fontSize: 12, color: C.textSecondary }}>
              <span>#{row.orderCode} · {formatDateTime(row.paidAt ?? row.createdAt)}</span>
              <StatusBadge row={row} />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Table
      data-testid="revenue-table"
      columns={COLUMNS}
      rows={rows}
      getRowAttributes={(row) => ({ "data-testid": "revenue-row", "data-order-code": String(row.orderCode) })}
      renderCell={(row, key) => {
        switch (key) {
          case "time":
            return <TimeCell row={row} />;
          case "orderCode":
            return <span style={{ fontVariantNumeric: "tabular-nums", color: C.textSecondary }}>{row.orderCode}</span>;
          case "kind":
            return <KindLabel row={row} />;
          case "buyer":
            return (
              <div style={{ minWidth: 0 }}>
                <div style={{ color: C.textPrimary, fontWeight: 600 }}>{row.buyerName || "(chưa đặt tên)"}</div>
                <div style={{ fontSize: 12, color: C.textSecondary, overflowWrap: "anywhere" }}>{row.buyerEmail || "—"}</div>
              </div>
            );
          case "item":
            return <span style={{ color: C.textPrimary }}>{row.itemLabel}</span>;
          case "amount":
            return <strong style={{ color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatVnd(row.amount)}</strong>;
          case "status":
            return <StatusBadge row={row} />;
          default:
            return null;
        }
      }}
    />
  );
}
