import { INVOICE_STATUS_META } from "../../../shared/utils/statusMaps";
import { getRemainingAmount, type InvoiceItem } from "../../services/billing-service";
import { classifyInvoiceDue } from "../../services/invoice-due";

export type InvoiceStatusKey = keyof typeof INVOICE_STATUS_META;

export function toInvoiceStatusKey(status: string): InvoiceStatusKey {
  const map: Record<string, InvoiceStatusKey> = {
    Unpaid: "unpaid",
    PartiallyPaid: "partiallyPaid",
    Paid: "paid",
    Overdue: "overdue",
  };
  return map[status] || "unpaid";
}

/**
 * Trạng thái để HIỂN THỊ: hóa đơn đã quá `due_date` mà còn thiếu tiền thì hiện
 * "Quá hạn" dù DB vẫn ghi `Unpaid` (chưa có job chuyển Overdue — BR-004).
 */
export function toDisplayStatusKey(invoice: InvoiceItem): InvoiceStatusKey {
  const dueState = classifyInvoiceDue(invoice.due_date, getRemainingAmount(invoice), new Date());
  return dueState === "overdue" ? "overdue" : toInvoiceStatusKey(invoice.status);
}

/**
 * Thứ tự danh sách hóa đơn: quá hạn lên đầu (trễ lâu nhất trước), sau đó kỳ mới
 * nhất trước; cùng kỳ thì theo mã phòng. Kỳ "YYYY-MM" ⇒ so chuỗi là so thời gian.
 */
export function sortInvoicesForDisplay(invoices: InvoiceItem[]): InvoiceItem[] {
  const isOverdue = (invoice: InvoiceItem) => toDisplayStatusKey(invoice) === "overdue";
  return [...invoices].sort((a, b) => {
    const overdueA = isOverdue(a);
    const overdueB = isOverdue(b);
    if (overdueA !== overdueB) return overdueA ? -1 : 1;
    if (overdueA && overdueB) {
      const dueOrder = String(a.due_date ?? "").localeCompare(String(b.due_date ?? ""));
      if (dueOrder !== 0) return dueOrder;
    }
    const periodOrder = String(b.period).localeCompare(String(a.period));
    if (periodOrder !== 0) return periodOrder;
    return (a.rooms?.room_code ?? "").localeCompare(b.rooms?.room_code ?? "", "vi", { numeric: true });
  });
}

/** "dd/mm" — ngày hẹn thu lại hiện gọn dưới trạng thái. */
export const formatShortDate = (value: string) => {
  const [, month, day] = value.slice(0, 10).split("-");
  return day && month ? `${day}/${month}` : value;
};

export const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Chưa thu đủ", value: "Outstanding" },
  { label: "Chưa thanh toán", value: "Unpaid" },
  { label: "Thu một phần", value: "PartiallyPaid" },
  { label: "Đã thanh toán", value: "Paid" },
  { label: "Quá hạn", value: "Overdue" },
];

// Một nguồn nhãn cho cả màn hóa đơn lẫn ảnh hóa đơn xuất ra.
export { ITEM_TYPE_LABELS } from "../../services/invoice-image";
