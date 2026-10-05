import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";
import { aggregateDashboardMetrics, type DashboardInvoiceMetric, type DashboardRoomMetric } from "./dashboard-metrics";
export type { DashboardKPIs } from "./dashboard-metrics";

/**
 * Load real room, invoice and payment metrics. Any database error is propagated
 * so the dashboard can show an error/retry state instead of fabricated zeros.
 */
export async function getDashboardMetrics(ownerId: string, propertyId?: string) {
  if (!ownerId) throw new Error("AUTH_REQUIRED");

  try {
    let roomsQuery = supabase
      .from("rooms")
      .select("id,status,contracts(status,occupancies!occupancies_contract_id_fkey(occupant_count))")
      .eq("owner_id", ownerId)
      .is("deleted_at", null);
    if (propertyId) roomsQuery = roomsQuery.eq("property_id", propertyId);

    let invoicesQuery = supabase
      .from("invoices")
      .select("id,room_id,total_amount,status,period,due_date,payments(amount,paid_at,purpose),rooms!inner(property_id,room_code)")
      .eq("owner_id", ownerId)
      .is("deleted_at", null);
    if (propertyId) invoicesQuery = invoicesQuery.eq("rooms.property_id", propertyId);

    const [roomsResult, invoicesResult] = await Promise.all([roomsQuery, invoicesQuery]);
    if (roomsResult.error) throw roomsResult.error;
    if (invoicesResult.error) throw invoicesResult.error;

    return aggregateDashboardMetrics(
      (roomsResult.data ?? []) as unknown as DashboardRoomMetric[],
      (invoicesResult.data ?? []) as unknown as DashboardInvoiceMetric[],
    );
  } catch (error) {
    logError("dashboard-service.getDashboardMetrics", error);
    throw error;
  }
}
