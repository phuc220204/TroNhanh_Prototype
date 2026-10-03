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
  payments?: Array<{ amount: number; paid_at: string; purpose: string }>;
}

const currentPeriod = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Pure aggregation kept separate so dashboard business rules can be tested without touching Supabase. */
export function aggregateDashboardMetrics(
  rooms: DashboardRoomMetric[],
  invoices: DashboardInvoiceMetric[],
  now = new Date(),
): DashboardKPIs {
  const period = currentPeriod(now);
  const unpaidInvoices = invoices.filter(invoice => invoice.status !== "Paid");
  const unpaidInvoiceAmount = unpaidInvoices.reduce((total, invoice) => {
    const paid = (invoice.payments ?? [])
      .filter(payment => payment.purpose === "RentInvoice")
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return total + Math.max(0, Number(invoice.total_amount || 0) - paid);
  }, 0);

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
    period,
    periodLabel: now.toLocaleDateString("vi-VN", { month: "long", year: "numeric" }),
  };
}
