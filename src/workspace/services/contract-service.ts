import { supabase } from "../../shared/supabaseClient";
import { logError } from "../../shared/services/supabase-error";

export interface ContractItem {
  id: string;
  room_id: string;
  occupancy_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  rent_price: number;
  deposit: number;
  status: string;
  created_at: string;
}

/**
 * Fetch all contracts owned by a landlord.
 */
export async function getContractsByOwner(ownerId: string | undefined): Promise<ContractItem[]> {
  if (!ownerId) return [];
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("owner_id", ownerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ContractItem[];
  } catch (err) {
    logError("contract-service.getContractsByOwner", err);
    return [];
  }
}

/**
 * Fetch active contract for a given room.
 */
export async function getActiveContractByRoom(roomId: string): Promise<ContractItem | null> {
  if (!roomId) return null;
  try {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("room_id", roomId)
      .eq("status", "Active")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (error) throw error;
    return data as ContractItem | null;
  } catch (err) {
    logError("contract-service.getActiveContractByRoom", err);
    return null;
  }
}
