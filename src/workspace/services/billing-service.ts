import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface UtilityReadingItem {
  id: string;
  room_id: string;
  type: string;
  reading_date?: string;
  created_at: string;
  current_reading: number;
  previous_reading?: number;
  value: number;
}

export interface InvoiceItem {
  id: string;
  room_id: string;
  owner_id: string;
  contract_id?: string | null;
  period: string;
  due_date?: string;
  total_amount: number;
  status: string;
  created_at: string;
  invoice_items?: any[];
  /** Có khi query dùng `getInvoices` (embed `rooms!inner`). */
  rooms?: {
    room_code: string;
    property_id: string;
    properties?: { name: string } | null;
  } | null;
  /** Các khoản đã thu của hóa đơn này (embed từ `getInvoices`). */
  payments?: { amount: number }[] | null;
}

/** Tổng đã thu của một hóa đơn, từ phần `payments` đã embed. */
export function getPaidAmount(invoice: InvoiceItem): number {
  return (invoice.payments ?? []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
}

/**
 * Số tiền còn thiếu của một hóa đơn — luôn ≥ 0.
 *
 * ⚠️ Nút "Đã thu" PHẢI gửi số này, KHÔNG gửi `total_amount`. RPC `record_payment`
 * chỉ cộng dồn `payments` rồi tính lại status; nó KHÔNG chặn thu vượt. Với hóa
 * đơn `PartiallyPaid` (3tr, đã thu 1tr) mà gửi nguyên `total_amount` thì sổ ghi
 * nhận 4tr cho một hóa đơn 3tr — status vẫn hiện "Paid" nên không ai nhận ra.
 */
export function getRemainingAmount(invoice: InvoiceItem): number {
  return Math.max(0, Number(invoice.total_amount || 0) - getPaidAmount(invoice));
}

/** BR-004 — đúng 4 trạng thái hóa đơn. Không có giá trị nào khác. */
export type InvoiceStatusFilter = "Unpaid" | "PartiallyPaid" | "Paid" | "Overdue";

export interface GetInvoicesParams {
  /** Bắt buộc — chủ sở hữu hóa đơn. */
  ownerId: string | undefined;
  /** Lọc theo khu trọ (qua `rooms.property_id`). Bỏ trống = mọi khu. */
  propertyId?: string;
  /** Định dạng `YYYY-MM`. Bỏ trống hoặc "all" = mọi kỳ. */
  period?: string;
  status?: InvoiceStatusFilter;
}

/** Đúng 5 giá trị RPC `create_invoice_with_items` chấp nhận (INVALID_INVOICE_ITEM_TYPE). */
export type InvoiceItemType = "Rent" | "Electricity" | "Water" | "Service" | "Other";

export interface CreateInvoiceItemPayload {
  type: InvoiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/**
 * Fetch latest utility reading (Electricity or Water) for a room.
 */
export async function getLatestReading(
  roomId: string,
  type: "Electricity" | "Water"
): Promise<UtilityReadingItem | null> {
  if (!roomId) return null;
  try {
    const { data, error } = await supabase
      .from("utility_readings")
      .select("*")
      .eq("room_id", roomId)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      ...(data as any),
      value: data.current_reading,
    } as UtilityReadingItem;
  } catch (err) {
    logError("billing-service.getLatestReading", err);
    return null;
  }
}

/**
 * Danh sách hóa đơn của chủ trọ, kèm mã phòng + tên khu.
 *
 * ⚠️ Nhận MỘT object thay vì các tham số vị trí. Chữ ký cũ là
 * `getInvoices(ownerId, period)` và `PaymentsView` gọi `getInvoices(property.id)`
 * — truyền id KHU vào chỗ id CHỦ. Kết quả: `.eq("owner_id", <uuid khu>)` không
 * bao giờ khớp, tab Thanh toán luôn rỗng, và không có lỗi nào để lần ra.
 * Hai uuid thì TypeScript không phân biệt được; đặt tên tham số thì có.
 *
 * ⚠️ `rooms!inner` là bắt buộc khi lọc theo `propertyId`: với embed thường,
 * PostgREST chỉ null hóa phần embed chứ KHÔNG loại row cha ⇒ sẽ trả hóa đơn
 * của tất cả các khu. Bỏ `!inner` là lỗi im lặng theo chiều nguy hiểm nhất.
 */
export async function getInvoices(params: GetInvoicesParams): Promise<InvoiceItem[]> {
  const { ownerId, propertyId, period, status } = params;
  if (!ownerId) return [];
  try {
    let q = supabase
      .from("invoices")
      .select("*, rooms!inner(room_code, property_id, properties(name)), invoice_items(*), payments(amount)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (propertyId) {
      q = q.eq("rooms.property_id", propertyId);
    }
    if (period && period !== "all") {
      q = q.eq("period", period);
    }
    if (status) {
      q = q.eq("status", status);
    }

    const { data, error } = await q;

    if (error) throw error;
    return (data || []) as unknown as InvoiceItem[];
  } catch (err) {
    logError("billing-service.getInvoices", err);
    return [];
  }
}

/**
 * Các kỳ (`YYYY-MM`) mà chủ trọ thực sự có hóa đơn — để dựng dropdown lọc kỳ
 * thay vì bịa ra 12 tháng cứng.
 */
export async function getInvoicePeriods(ownerId: string | undefined): Promise<string[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("period")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("period", { ascending: false });

    if (error) throw error;
    return Array.from(new Set((data || []).map((row) => row.period)));
  } catch (err) {
    logError("billing-service.getInvoicePeriods", err);
    return [];
  }
}

/**
 * Record a utility reading (Electricity or Water) for a room via RPC record_utility_reading.
 * ⚠️ Security constraint: DOES NOT pass owner_id, previous_reading, or unit_price.
 * Supabase derives owner_id = auth.uid(), previous_reading from the last reading, and unit_price from properties table.
 */
export async function recordUtilityReading(
  roomId: string,
  type: "Electricity" | "Water",
  period: string,
  currentReading: number
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("record_utility_reading", {
      p_room_id: roomId,
      p_type: type,
      p_period: period,
      p_current: currentReading,
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("billing-service.recordUtilityReading", err);
    throw err;
  }
}

/**
 * Create an invoice with items via RPC create_invoice_with_items.
 * ⚠️ Security constraint: DOES NOT pass owner_id, status, or total_amount.
 * Supabase derives owner_id = auth.uid(), status = 'Unpaid', and total_amount = sum(item.amount).
 */
export async function createInvoiceWithItems(input: {
  roomId: string;
  contractId?: string | null;
  period: string;
  dueDate: string;
  items: CreateInvoiceItemPayload[];
}): Promise<string> {
  try {
    // `p_contract_id` phải là null khi phòng chưa có hợp đồng Active — RPC có nhánh
    // `if p_contract_id is not null`. Truyền "" thì Postgres cast sang uuid và ném 22P02.
    // Generated types khai báo param là `string` (SQL không có DEFAULT) nên phải cast ở đây.
    const args = {
      p_room_id: input.roomId,
      p_contract_id: input.contractId ?? null,
      p_period: input.period,
      p_due_date: input.dueDate,
      p_items: input.items,
    } as unknown as Parameters<typeof supabase.rpc<"create_invoice_with_items">>[1];

    const { data, error } = await supabase.rpc("create_invoice_with_items", args);
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("billing-service.createInvoiceWithItems", err);
    throw err;
  }
}

/**
 * Ghi nhận một khoản thu cho hóa đơn qua RPC record_payment (AS-002 — chủ trọ tự bấm "Đã thu").
 * ⚠️ KHÔNG truyền owner_id, purpose, hay status hóa đơn.
 * RPC derive owner_id = auth.uid(), purpose = 'RentInvoice', và tự tính lại status theo BR-004
 * (Paid / PartiallyPaid / Unpaid / Overdue) từ tổng payments — thay vì ép "Paid" ở client.
 * @returns status mới của hóa đơn.
 */
export async function recordPayment(
  invoiceId: string,
  amount: number,
  method: "Cash" | "BankTransfer" = "BankTransfer",
  paidAt?: string
): Promise<string> {
  try {
    const { data, error } = await supabase.rpc("record_payment", {
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_method: method,
      ...(paidAt ? { p_paid_at: paidAt } : {}),
    });
    if (error) throw error;
    return data as string;
  } catch (err) {
    logError("billing-service.recordPayment", err);
    throw err;
  }
}
