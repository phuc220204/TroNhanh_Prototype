import { C, font, radius } from "../../../shared/theme";
import { Badge } from "../../../shared/components/common";
import { formatDate, formatPeriod, formatVnd } from "../../../shared/utils/format";
import { getLatestCollectionNote, getRemainingAmount, type InvoiceItem } from "../../services/billing-service";
import { classifyInvoiceDue, formatDueLabel, getDaysUntilDue } from "../../services/invoice-due";
import { formatShortDate, toDisplayStatusKey } from "./invoice-display";

interface InvoiceListProps {
  invoices: InvoiceItem[];
  isMobile: boolean;
  onOpen: (invoice: InvoiceItem) => void;
}

/** Ghi chú thu tiền gần nhất: ngày hẹn nếu có, không thì lý do. */
function LatestNote({ invoice, align }: { invoice: InvoiceItem; align: "left" | "center" }) {
  const latestNote = getLatestCollectionNote(invoice);
  if (!latestNote) return null;
  return (
    <div
      data-testid="invoice-latest-note"
      title={latestNote.reason}
      style={{ fontSize: 11.5, color: C.textSecondary, marginTop: 4, maxWidth: 220, marginInline: align === "center" ? "auto" : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
    >
      {latestNote.follow_up_date ? `Hẹn thu lại ${formatShortDate(latestNote.follow_up_date)}` : latestNote.reason}
    </div>
  );
}

function dueHint(invoice: InvoiceItem): string | null {
  const isDueSoon = classifyInvoiceDue(invoice.due_date, getRemainingAmount(invoice), new Date()) === "dueSoon";
  const daysUntilDue = invoice.due_date ? getDaysUntilDue(invoice.due_date, new Date()) : null;
  return isDueSoon && daysUntilDue !== null ? formatDueLabel(daysUntilDue) : null;
}

/** Enter/Space mở hóa đơn — dòng/thẻ là phần tử tương tác, phải dùng được bằng bàn phím. */
const openOnKey = (open: () => void) => (event: React.KeyboardEvent) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    open();
  }
};

/** Danh sách hóa đơn: bảng trên máy tính, thẻ trên điện thoại (thu tiền là việc làm trên điện thoại). */
export function InvoiceList({ invoices, isMobile, onOpen }: InvoiceListProps) {
  if (isMobile) {
    return (
      <div data-testid="invoice-card-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {invoices.map((inv) => {
          const remaining = getRemainingAmount(inv);
          const hint = dueHint(inv);
          return (
            <div
              key={inv.id}
              role="button"
              tabIndex={0}
              data-testid="invoice-row"
              aria-label={`Hóa đơn phòng ${inv.rooms?.room_code ?? ""} ${formatPeriod(inv.period)}`}
              onClick={() => onOpen(inv)}
              onKeyDown={openOnKey(() => onOpen(inv))}
              style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.lg, padding: "12px 14px", cursor: "pointer", fontFamily: font }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>
                    Phòng {inv.rooms?.room_code || "—"}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>
                    {inv.rooms?.properties?.name || "—"} · {formatPeriod(inv.period)}
                  </div>
                </div>
                <Badge kind="invoice" status={toDisplayStatusKey(inv)} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
                <div style={{ fontSize: 12.5, color: C.textSecondary }}>
                  Hạn {inv.due_date ? formatDate(inv.due_date) : "—"}
                  {hint && <span style={{ color: C.warning, fontWeight: 700 }}> · {hint}</span>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11.5, color: C.textSecondary }}>{remaining > 0 ? "Còn thiếu" : "Tổng tiền"}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: remaining > 0 ? C.primary : C.success }}>
                    {formatVnd(remaining > 0 ? remaining : inv.total_amount)}
                  </div>
                </div>
              </div>
              <LatestNote invoice={inv} align="left" />
            </div>
          );
        })}
      </div>
    );
  }

  const thStyle = (align: "left" | "right" | "center"): React.CSSProperties => ({
    padding: "12px 16px", textAlign: align, fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase",
  });

  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: font, fontSize: 14 }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              <th style={thStyle("left")}>Kỳ</th>
              <th style={thStyle("left")}>Mã phòng</th>
              <th style={thStyle("left")}>Tên khu</th>
              <th style={thStyle("right")}>Tổng tiền</th>
              <th style={thStyle("right")}>Còn thiếu</th>
              <th style={thStyle("center")}>Hạn thanh toán</th>
              <th style={thStyle("center")}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const remaining = getRemainingAmount(inv);
              const hint = dueHint(inv);
              return (
                <tr
                  key={inv.id}
                  data-testid="invoice-row"
                  tabIndex={0}
                  aria-label={`Mở hóa đơn phòng ${inv.rooms?.room_code ?? ""} ${formatPeriod(inv.period)}`}
                  onClick={() => onOpen(inv)}
                  onKeyDown={openOnKey(() => onOpen(inv))}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.cream)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: C.textPrimary }}>{formatPeriod(inv.period)}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: C.primary }}>{inv.rooms?.room_code || "—"}</td>
                  <td style={{ padding: "14px 16px", color: C.textPrimary }}>{inv.rooms?.properties?.name || "—"}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, color: C.textPrimary }}>{formatVnd(inv.total_amount)}</td>
                  <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: remaining > 0 ? C.primary : C.success }}>
                    {remaining > 0 ? formatVnd(remaining) : "—"}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center", color: C.textSecondary, fontSize: 13 }}>
                    {inv.due_date ? formatDate(inv.due_date) : "—"}
                    {hint && <div style={{ fontSize: 11.5, fontWeight: 700, color: C.warning, marginTop: 2 }}>{hint}</div>}
                  </td>
                  <td style={{ padding: "14px 16px", textAlign: "center" }}>
                    <Badge kind="invoice" status={toDisplayStatusKey(inv)} />
                    <LatestNote invoice={inv} align="center" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
