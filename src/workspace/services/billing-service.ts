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
  period: string;
  total_amount: number;
  status: string;
  created_at: string;
  invoice_items?: any[];
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
 * Fetch all invoices for a landlord.
 */
export async function getInvoices(ownerId: string | undefined, period?: string): Promise<InvoiceItem[]> {
  if (!ownerId) return [];
  try {
    let q = supabase
      .from("invoices")
      .select("*, invoice_items(*)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (period && period !== "all") {
      q = q.eq("period", period);
    }

    const { data, error } = await q;

    if (error) throw error;
    return (data || []) as InvoiceItem[];
  } catch (err) {
    logError("billing-service.getInvoices", err);
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
