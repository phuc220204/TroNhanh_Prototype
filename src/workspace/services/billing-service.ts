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
