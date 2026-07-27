/**
 * Lịch sử vận hành của một phòng — nguồn dữ liệu cho drawer "Chi tiết phòng".
 *
 * Vì sao cần: UI cũ chỉ hiển thị `room.bill` (đúng MỘT tháng) và một hợp đồng,
 * trong khi DB đã lưu đầy đủ nhiều kỳ ở `utility_readings`, `invoices`,
 * `payments`, `contracts`, `occupancies`. Chủ trọ cần nhìn được bức tranh nhiều
 * tháng để đối chiếu và đòi nợ.
 *
 * Ranh giới shell: đây là bảng của workspace ⇒ file phải nằm trong
 * src/workspace/services/ (CLAUDE.md §2.1). RLS (`owner_id = auth.uid()`) lo
 * phần cô lập dữ liệu — không lọc ở client.
 */
import { supabase } from "../../shared/supabaseClient";
import { withErrorHandling } from "../../shared/services/supabase-error";

export type UtilityType = "Electricity" | "Water";

export interface UtilityReadingRow {
  id: string;
  period: string;                 // YYYY-MM
  type: UtilityType;
  previousReading: number;
  currentReading: number;
  consumption: number;            // current − previous
  unitPrice: number;
  amount: number;                 // consumption × unitPrice
  /** Chênh lệch tiêu thụ so với kỳ liền trước, theo %. null nếu không có kỳ trước. */
  deltaPercent: number | null;
}

export interface InvoiceHistoryRow {
  id: string;
  period: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: string;
  isOverdue: boolean;
  items: { type: string; description: string | null; amount: number }[];
}

export interface OccupancyHistoryRow {
  id: string;
  fullName: string;
  phoneNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  occupantCount: number;
  isActive: boolean;
  /** BR-029: null khi người ở không gắn tài khoản Renter. */
  linkStatus: string | null;
}

export interface ContractHistoryRow {
  id: string;
  startDate: string;
  endDate: string;
  rentPrice: number;
  deposit: number;
  status: string;
  /** Số ngày còn lại tới ngày kết thúc. Âm nghĩa là đã quá hạn. */
  daysRemaining: number;
}

export interface RoomHistory {
  readings: UtilityReadingRow[];
  invoices: InvoiceHistoryRow[];
  occupancies: OccupancyHistoryRow[];
  contracts: ContractHistoryRow[];
  /** Tổng còn nợ cộng dồn qua mọi kỳ chưa thu đủ. */
  totalOutstanding: number;
  /** Kỳ gần nhất đã chốt chỉ số, theo từng loại. */
  lastReadingPeriod: Record<UtilityType, string | null>;
}

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / 86_400_000);

/** Số ngày đã ở tính tới hôm nay. Trả 0 nếu không có ngày bắt đầu hợp lệ. */
export function daysSince(startDate: string | null | undefined): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, daysBetween(start, new Date()));
}

/**
 * Nạp toàn bộ lịch sử vận hành của một phòng trong một lượt.
 * 4 truy vấn song song — không phụ thuộc nhau nên không cần tuần tự.
 */
export async function getRoomHistory(roomId: string): Promise<RoomHistory> {
  return withErrorHandling("room-history-service.getRoomHistory", async () => {
    const [readingsRes, invoicesRes, occupanciesRes, contractsRes] = await Promise.all([
      supabase
        .from("utility_readings")
        .select("id, period, type, previous_reading, current_reading, unit_price")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("period", { ascending: false }),

      supabase
        .from("invoices")
        .select("id, period, due_date, total_amount, status, invoice_items(type, description, amount), payments(amount)")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("period", { ascending: false }),

      supabase
        .from("occupancies")
        .select("id, full_name, phone_number, start_date, end_date, occupant_count, is_active, link_status")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false }),

      supabase
        .from("contracts")
        .select("id, start_date, end_date, rent_price, deposit, status")
        .eq("room_id", roomId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false }),
    ]);

    if (readingsRes.error) throw readingsRes.error;
    if (invoicesRes.error) throw invoicesRes.error;
    if (occupanciesRes.error) throw occupanciesRes.error;
    if (contractsRes.error) throw contractsRes.error;

    // ── Điện nước: tính tiêu thụ + so sánh kỳ liền trước cùng loại ─────────
    const rawReadings = readingsRes.data ?? [];
    const readings: UtilityReadingRow[] = rawReadings.map((r, index) => {
      const previous = Number(r.previous_reading ?? 0);
      const current = Number(r.current_reading ?? 0);
      const consumption = Math.max(0, current - previous);
      const unitPrice = Number(r.unit_price ?? 0);

      // Mảng đang giảm dần theo kỳ ⇒ kỳ liền trước nằm SAU trong mảng.
      const older = rawReadings
        .slice(index + 1)
        .find((o) => o.type === r.type);
      const olderConsumption = older
        ? Math.max(0, Number(older.current_reading ?? 0) - Number(older.previous_reading ?? 0))
        : null;

      return {
        id: r.id,
        period: r.period,
        type: r.type as UtilityType,
        previousReading: previous,
        currentReading: current,
        consumption,
        unitPrice,
        amount: consumption * unitPrice,
        deltaPercent:
          olderConsumption && olderConsumption > 0
            ? Math.round(((consumption - olderConsumption) / olderConsumption) * 100)
            : null,
      };
    });

    // ── Hóa đơn: cộng payments để ra số còn nợ thật ────────────────────────
    const today = new Date();
    const invoices: InvoiceHistoryRow[] = (invoicesRes.data ?? []).map((inv: any) => {
      const total = Number(inv.total_amount ?? 0);
      const paid = (inv.payments ?? []).reduce(
        (sum: number, p: { amount: number | null }) => sum + Number(p.amount ?? 0),
        0,
      );
      const remaining = Math.max(0, total - paid);
      const due = new Date(inv.due_date);
      return {
        id: inv.id,
        period: inv.period,
        dueDate: inv.due_date,
        totalAmount: total,
        paidAmount: paid,
        remaining,
        status: inv.status,
        isOverdue: remaining > 0 && !Number.isNaN(due.getTime()) && due < today,
        items: (inv.invoice_items ?? []).map((it: any) => ({
          type: it.type,
          description: it.description,
          amount: Number(it.amount ?? 0),
        })),
      };
    });

    const occupancies: OccupancyHistoryRow[] = (occupanciesRes.data ?? []).map((o) => ({
      id: o.id,
      fullName: o.full_name,
      phoneNumber: o.phone_number,
      startDate: o.start_date,
      endDate: o.end_date,
      occupantCount: Number(o.occupant_count ?? 1),
      isActive: Boolean(o.is_active),
      linkStatus: o.link_status,
    }));

    const contracts: ContractHistoryRow[] = (contractsRes.data ?? []).map((c) => ({
      id: c.id,
      startDate: c.start_date,
      endDate: c.end_date,
      rentPrice: Number(c.rent_price ?? 0),
      deposit: Number(c.deposit ?? 0),
      status: c.status,
      daysRemaining: daysBetween(new Date(), new Date(c.end_date)),
    }));

    const lastReadingPeriod: Record<UtilityType, string | null> = {
      Electricity: readings.find((r) => r.type === "Electricity")?.period ?? null,
      Water: readings.find((r) => r.type === "Water")?.period ?? null,
    };

    return {
      readings,
      invoices,
      occupancies,
      contracts,
      totalOutstanding: invoices.reduce((sum, i) => sum + i.remaining, 0),
      lastReadingPeriod,
    };
  });
}
