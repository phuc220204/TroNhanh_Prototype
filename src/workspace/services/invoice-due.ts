/**
 * Phân loại hạn thanh toán hóa đơn — hàm thuần, không chạm Supabase.
 *
 * Vì sao không đọc `invoices.status`: chưa có job định kỳ chuyển `Unpaid` →
 * `Overdue` (BR-004), DB chỉ đổi status lúc tạo hóa đơn hoặc ghi payment. Một hóa
 * đơn quá hạn mà chưa thu đồng nào vẫn nằm ở `Unpaid`. Nên "sắp đến hạn" và
 * "quá hạn" được tính từ `due_date` + số tiền còn thiếu.
 */

/** Nhắc hóa đơn sắp đến hạn trong vòng N ngày (tính cả hôm nay). */
export const DUE_SOON_DAYS = 3;

export type InvoiceDueState = "overdue" | "dueSoon";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `due_date` là kiểu `date` ("YYYY-MM-DD"); parse theo giờ địa phương để không lệch ngày do UTC. */
function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** Số ngày từ hôm nay đến hạn: 0 = hạn hôm nay, âm = đã quá hạn. `null` nếu ngày không hợp lệ. */
export function getDaysUntilDue(dueDate: string, today: Date): number | null {
  const due = parseDateOnly(dueDate);
  if (!due) return null;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

/** Hóa đơn đã thu đủ (`remaining <= 0`) không cần nhắc, dù hạn là ngày nào. */
export function classifyInvoiceDue(
  dueDate: string | null | undefined,
  remaining: number,
  today: Date,
  windowDays: number = DUE_SOON_DAYS,
): InvoiceDueState | null {
  if (!dueDate || remaining <= 0) return null;
  const days = getDaysUntilDue(dueDate, today);
  if (days === null) return null;
  if (days < 0) return "overdue";
  if (days <= windowDays) return "dueSoon";
  return null;
}

/** Nhãn ngắn cho UI: "Hạn hôm nay" · "Còn 2 ngày" · "Quá hạn 5 ngày". */
export function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue === 0) return "Hạn hôm nay";
  if (daysUntilDue > 0) return `Còn ${daysUntilDue} ngày`;
  return `Quá hạn ${Math.abs(daysUntilDue)} ngày`;
}
