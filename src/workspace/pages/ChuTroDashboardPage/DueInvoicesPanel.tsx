import { BellRing, CheckCircle2, ChevronRight } from "lucide-react";
import { C, font, radius } from "../../../shared/theme";
import { EmptyState } from "../../../shared/components/common";
import { INVOICE_STATUS_META } from "../../../shared/utils/statusMaps";
import { DUE_SOON_DAYS, formatDueLabel } from "../../services/invoice-due";
import type { ReminderInvoice } from "../../services/dashboard-metrics";

const MAX_VISIBLE_REMINDERS = 5;

interface DueInvoicesPanelProps {
  invoices: ReminderInvoice[];
  onOpenInvoice: (invoiceId: string) => void;
  onViewAll: () => void;
}

const formatDueDate = (dueDate: string) => {
  const [year, month, day] = dueDate.split("-");
  return year && month && day ? `${day}/${month}` : dueDate;
};

/** "Hóa đơn cần nhắc": hóa đơn quá hạn + sắp đến hạn trong DUE_SOON_DAYS ngày, còn thiếu tiền. */
export function DueInvoicesPanel({ invoices, onOpenInvoice, onViewAll }: DueInvoicesPanelProps) {
  const visibleInvoices = invoices.slice(0, MAX_VISIBLE_REMINDERS);

  return (
    <section
      data-testid="dashboard-due-reminders"
      style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: radius.xl, padding: "18px 20px", marginBottom: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BellRing size={18} color={C.warning} />
          <div>
            <h2 style={{ fontFamily: font, fontSize: 15.5, fontWeight: 800, color: C.textPrimary, margin: 0 }}>Hóa đơn cần nhắc</h2>
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "2px 0 0" }}>
              Quá hạn hoặc đến hạn trong {DUE_SOON_DAYS} ngày tới, còn chưa thu đủ.
            </p>
          </div>
        </div>
        {invoices.length > 0 && (
          <button onClick={onViewAll} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, background: "none", border: "none", color: C.primary, fontFamily: font, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: 0 }}>
            Xem tất cả <ChevronRight size={15} />
          </button>
        )}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} color={C.success} />}
          title="Không có hóa đơn nào sắp đến hạn"
          description={`Hóa đơn đến hạn trong ${DUE_SOON_DAYS} ngày tới hoặc đã quá hạn sẽ hiện ở đây.`}
          style={{ padding: "12px 0" }}
          data-testid="dashboard-due-reminders-empty"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visibleInvoices.map(invoice => {
            const isOverdue = invoice.daysUntilDue < 0;
            const tone = isOverdue ? INVOICE_STATUS_META.overdue : INVOICE_STATUS_META.partiallyPaid;
            return (
              <button
                key={invoice.id}
                onClick={() => onOpenInvoice(invoice.id)}
                data-testid="dashboard-due-reminder-item"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", background: C.bg, border: `1px solid ${C.border}`, borderRadius: radius.md, padding: "10px 14px", cursor: "pointer", fontFamily: font }}
              >
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.textPrimary }}>{invoice.roomCode || "Phòng"}</span>
                  {invoice.propertyName && <span style={{ fontSize: 12.5, color: C.textSecondary, marginLeft: 6 }}>· {invoice.propertyName}</span>}
                  <span style={{ fontSize: 12.5, color: C.textSecondary, marginLeft: 8 }}>Hạn {formatDueDate(invoice.dueDate)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{Math.round(invoice.remaining).toLocaleString("vi-VN")}đ</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: tone.color, background: tone.bg, borderRadius: radius.pill, padding: "3px 9px", whiteSpace: "nowrap" }}>
                    {formatDueLabel(invoice.daysUntilDue)}
                  </span>
                </div>
              </button>
            );
          })}
          {invoices.length > MAX_VISIBLE_REMINDERS && (
            <p style={{ fontFamily: font, fontSize: 12, color: C.textSecondary, margin: "2px 0 0" }}>
              và {invoices.length - MAX_VISIBLE_REMINDERS} hóa đơn khác.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
