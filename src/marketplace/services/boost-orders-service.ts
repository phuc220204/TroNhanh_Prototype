import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

/** Summary deliberately excludes payment references and checkout URLs. */
export interface BoostOrderSummary {
  order_code: number;
  listing_id: string;
  days: number;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export async function listMyBoostOrders(): Promise<BoostOrderSummary[]> {
  try {
    const { data, error } = await supabase
      .from("boost_orders")
      .select("order_code, listing_id, days, amount, status, paid_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    logError("boost-orders-service.listMyBoostOrders", error);
    throw error;
  }
}
