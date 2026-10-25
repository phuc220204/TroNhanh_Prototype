import { C, font, radius } from "../../../shared/theme";
import { INVOICE_STATUS_META, normalizeInvoiceStatus } from "../../../shared/utils/statusMaps";
import { getDaysUntilDue } from "../../services/invoice-due";
import type { RoomDebt } from "../../types/room";

interface DbInvoiceSummary {
  status?: string | null;
  due_date?: string | null;
}

/**
 * Tình trạng nợ của phòng từ các hóa đơn đã embed.
 *
 * Không đọc riêng cột `status = 'Overdue'`: chưa có job chuyển Unpaid → Overdue
 * (BR-004), nên "quá hạn" tính theo `due_date` của hóa đơn chưa thu đủ.
 */
export function getRoomDebt(invoices: DbInvoiceSummary[] | null | undefined, today = new Date()): RoomDebt | null {
  const outstanding = (invoices ?? []).filter((invoice) => {
    const status = normalizeInvoiceStatus(invoice.status);
    return status !== null && status !== "paid";
  });
  if (outstanding.length === 0) return null;

  let maxOverdueDays = 0;
  for (const invoice of outstanding) {
    const days = invoice.due_date ? getDaysUntilDue(invoice.due_date, today) : null;
    if (days !== null && days < 0) maxOverdueDays = Math.max(maxOverdueDays, -days);
  }
  return {
    state: maxOverdueDays > 0 ? "overdue" : "outstanding",
    overdueDays: maxOverdueDays,
    invoiceCount: outstanding.length,
  };
}

/** "Quá hạn 67 ngày" / "Còn nợ" — màu lấy từ INVOICE_STATUS_META, không tự map. */
export function RoomDebtBadge({ debt }: { debt: RoomDebt | null }) {
  if (!debt) return null;
  const meta = debt.state === "overdue" ? INVOICE_STATUS_META.overdue : INVOICE_STATUS_META.unpaid;
  const label = debt.state === "overdue" ? `${meta.label} ${debt.overdueDays} ngày` : "Còn nợ";
  const title = `${debt.invoiceCount} hóa đơn chưa thu đủ`;
  return (
    <span
      data-testid="room-debt-badge"
      data-debt-state={debt.state}
      title={title}
      style={{ fontFamily: font, fontSize: 11, fontWeight: 700, borderRadius: radius.pill, padding: "3px 10px", background: meta.bg, color: meta.color, border: `1px solid ${debt.state === "overdue" ? meta.color : C.border}`, display: "inline-flex", alignItems: "center", lineHeight: 1.4, whiteSpace: "nowrap" }}
    >
      {label}
    </span>
  );
}
