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

/** "dd/mm" — ngày hẹn thu lại hiện gọn dưới trạng thái. */
export const formatShortDate = (value: string) => {
  const [, month, day] = value.slice(0, 10).split("-");
  return day && month ? `${day}/${month}` : value;
};

export const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "" },
  { label: "Chưa thanh toán", value: "Unpaid" },
  { label: "Thu một phần", value: "PartiallyPaid" },
  { label: "Đã thanh toán", value: "Paid" },
  { label: "Quá hạn", value: "Overdue" },
];

export const ITEM_TYPE_LABELS: Record<string, string> = {
  Rent: "Tiền phòng",
  Electricity: "Tiền điện",
  Water: "Tiền nước",
  Service: "Phí dịch vụ",
  Other: "Khác",
};
