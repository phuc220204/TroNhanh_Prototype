import { classifyInvoiceDue, getDaysUntilDue } from "./invoice-due.ts";

/** Hóa đơn cần nhắc: quá hạn hoặc sắp đến hạn và vẫn còn thiếu tiền. */
export interface ReminderInvoice {
  id: string;
  roomCode: string;
  /** Tên khu — nhiều khu cùng có "P101" thì mã phòng thôi không đủ để biết phòng nào. */
  propertyName: string;
  dueDate: string;
  remaining: number;
  daysUntilDue: number;
}

export interface DashboardKPIs {
  totalRoomsCount: number;
  rentedRoomsCount: number;
  occupantCount: number;
  emptyRoomsCount: number;
  unpaidInvoiceCount: number;
  unpaidInvoiceAmount: number;
  collectedThisMonth: number;
  invoiceCountThisPeriod: number;
  invoiceAmountThisPeriod: number;
  dueSoonInvoiceCount: number;
  dueSoonInvoiceAmount: number;
  overdueInvoiceCount: number;
  overdueInvoiceAmount: number;
  /** Quá hạn lâu nhất trước, rồi tới hạn gần nhất. */
  reminderInvoices: ReminderInvoice[];
  period: string;
  periodLabel: string;
}

export interface DashboardRoomMetric {
  status: string;
  contracts?: Array<{ status: string; occupancies?: Array<{ occupant_count: number | null }> }>;
}

export interface DashboardInvoiceMetric {
  id: string;
  room_id: string;
  total_amount: number;
  status: string;
  period: string;
  due_date?: string | null;
  payments?: Array<{ amount: number; paid_at: string; purpose: string }>;
  rooms?: { room_code?: string | null; properties?: { name?: string | null } | null } | null;
}

const currentPeriod = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Pure aggregation kept separate so dashboard business rules can be tested without touching Supabase. */
export function aggregateDashboardMetrics(
  rooms: DashboardRoomMetric[],
  invoices: DashboardInvoiceMetric[],
  now = new Date(),
): DashboardKPIs {
  const period = currentPeriod(now);
  const remainingOf = (invoice: DashboardInvoiceMetric) => {
    const paid = (invoice.payments ?? [])
      .filter(payment => payment.purpose === "RentInvoice")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return Math.max(0, Number(invoice.total_amount || 0) - paid);
  };
  const unpaidInvoices = invoices.filter(invoice => invoice.status !== "Paid");
  const unpaidInvoiceAmount = unpaidInvoices.reduce((total, invoice) => total + remainingOf(invoice), 0);

  const reminderInvoices: ReminderInvoice[] = [];
  let dueSoonInvoiceCount = 0;
  let dueSoonInvoiceAmount = 0;
  let overdueInvoiceCount = 0;
  let overdueInvoiceAmount = 0;
  for (const invoice of unpaidInvoices) {
    const remaining = remainingOf(invoice);
    const dueState = classifyInvoiceDue(invoice.due_date, remaining, now);
    const daysUntilDue = invoice.due_date ? getDaysUntilDue(invoice.due_date, now) : null;
    if (!dueState || daysUntilDue === null || !invoice.due_date) continue;
    if (dueState === "overdue") {
      overdueInvoiceCount += 1;
      overdueInvoiceAmount += remaining;
    } else {
      dueSoonInvoiceCount += 1;
      dueSoonInvoiceAmount += remaining;
    }
    reminderInvoices.push({
      id: invoice.id,
      roomCode: invoice.rooms?.room_code ?? "",
      propertyName: invoice.rooms?.properties?.name ?? "",
      dueDate: invoice.due_date,
      remaining,
      daysUntilDue,
    });
  }
  reminderInvoices.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

  const paymentMonth = (timestamp: string) => {
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "" : currentPeriod(date);
  };
  const collectedThisMonth = invoices.reduce((sum, invoice) => sum + (invoice.payments ?? [])
    .filter(payment => payment.purpose === "RentInvoice" && paymentMonth(payment.paid_at) === period)
    .reduce((paid, payment) => paid + Number(payment.amount || 0), 0), 0);
  const periodInvoices = invoices.filter(invoice => invoice.period === period);

  return {
    totalRoomsCount: rooms.length,
    rentedRoomsCount: rooms.filter(room => room.status === "Rented").length,
    occupantCount: rooms.reduce((total, room) => total + (room.contracts ?? [])
      .filter(contract => contract.status === "Active")
      .reduce((contractTotal, contract) => contractTotal + (contract.occupancies ?? [])
        .reduce((occupants, occupancy) => occupants + Number(occupancy.occupant_count ?? 1), 0), 0), 0),
    emptyRoomsCount: rooms.filter(room => room.status === "Available").length,
    unpaidInvoiceCount: unpaidInvoices.length,
    unpaidInvoiceAmount,
    collectedThisMonth,
    invoiceCountThisPeriod: periodInvoices.length,
    invoiceAmountThisPeriod: periodInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    dueSoonInvoiceCount,
    dueSoonInvoiceAmount,
    overdueInvoiceCount,
    overdueInvoiceAmount,
    reminderInvoices,
    period,
    periodLabel: now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }),
  };
}
