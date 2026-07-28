import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface DemandPostItem {
  id: string;
  kind: "RoomWanted" | "RoommateWanted";
  title: string;
  desired_districts?: string[];
  budget_min?: number;
  budget_max?: number;
  price_min?: number;
  price_max?: number;
  move_in_date?: string;
  note?: string;
  created_at: string;
}

/**
 * Fetch active demand posts (RoomWanted and RoommateWanted) for marketplace pages.
 */
export async function getActiveDemandPosts(): Promise<DemandPostItem[]> {
  try {
    const { data, error } = await supabase
      .from("demand_posts")
      .select("*")
      .eq("status", "Active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as DemandPostItem[];
  } catch (err) {
    logError("demand-queries.getActiveDemandPosts", err);
    return [];
  }
}
