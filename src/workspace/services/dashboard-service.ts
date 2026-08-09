import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface DashboardKPIs {
  totalRoomsCount: number;
  rentedRoomsCount: number;
  emptyRoomsCount: number;
  unpaidRoomsCount: number;
}

/**
 * Fetch dashboard KPI metrics for a landlord.
 * ⚠️ Uses select("*", { count: "exact", head: true }) to fetch exact counts directly from DB server-side,
 * without loading row data arrays into memory.
 */
export async function getDashboardMetrics(ownerId: string | undefined): Promise<DashboardKPIs> {
  if (!ownerId) {
    return {
      totalRoomsCount: 0,
      rentedRoomsCount: 0,
      emptyRoomsCount: 0,
      unpaidRoomsCount: 0,
    };
  }

  try {
    const [totalRes, rentedRes, emptyRes, unpaidRes] = await Promise.all([
      supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .is("deleted_at", null),
      supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "Rented")
        .is("deleted_at", null),
      supabase
        .from("rooms")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "Available")
        .is("deleted_at", null),
      supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("status", "Unpaid")
        .is("deleted_at", null),
    ]);

    return {
      totalRoomsCount: totalRes.count || 0,
      rentedRoomsCount: rentedRes.count || 0,
      emptyRoomsCount: emptyRes.count || 0,
      unpaidRoomsCount: unpaidRes.count || 0,
    };
  } catch (err) {
    logError("dashboard-service.getDashboardMetrics", err);
    return {
      totalRoomsCount: 0,
      rentedRoomsCount: 0,
      emptyRoomsCount: 0,
      unpaidRoomsCount: 0,
    };
  }
}
